import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { CurrencyCode } from '@doviz/shared';

export function RateRawFreePage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [error, setError] = useState<string | null>(null);

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => api.get('/currencies').then((r) => r.data),
  });

  const { register, handleSubmit, watch, reset } = useForm<{ currencyCode: string; rawBuyRate: number; rawSellRate: number; note?: string }>({
    defaultValues: { currencyCode: CurrencyCode.USD, rawBuyRate: 0, rawSellRate: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/exchange-rates/raw-free', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      reset({ currencyCode: watch('currencyCode'), rawBuyRate: 0, rawSellRate: 0 });
      setError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message ?? t('common.error')),
  });

  return (
    <div>
      <PageHeader title={t('rate.rawFree')} description="Ham serbest kur girildiginde otomatik serbest kur da hesaplanir" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit((data) => mutation.mutate({ branchId, ...data }))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Doviz</Label>
                <select {...register('currencyCode')} className="h-10 w-full rounded-md border bg-background px-3">
                  {currencies.map((c: { code: string; buySpread: number; sellSpread: number }) => (
                    <option key={c.code} value={c.code}>
                      {c.code} (spread: -{c.buySpread}/+{c.sellSpread})
                    </option>
                  ))}
                </select>
              </div>
              <div />
              <div className="space-y-2">
                <Label>Ham Alis Kur</Label>
                <Input type="number" step="any" {...register('rawBuyRate', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Ham Satis Kur</Label>
                <Input type="number" step="any" {...register('rawSellRate', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Not</Label>
                <Input {...register('note')} />
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={mutation.isPending}>{t('common.save')}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}