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

export function VezneBanknoteCountPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [denoms, setDenoms] = useState<Array<{ denom: number; count: number }>>([
    { denom: 200, count: 0 },
    { denom: 100, count: 0 },
    { denom: 50, count: 0 },
    { denom: 20, count: 0 },
    { denom: 10, count: 0 },
    { denom: 5, count: 0 },
    { denom: 1, count: 0 },
  ]);

  const { data: drawers = [] } = useQuery({
    queryKey: ['cash-drawers', branchId],
    queryFn: () => api.get(`/vezne/cash-drawers`, { params: { branchId } }).then((r) => r.data).catch(() => []),
  });

  const { register, handleSubmit, watch } = useForm<{ cashDrawerId: string; currencyCode: string; note?: string }>({
    defaultValues: { currencyCode: CurrencyCode.USD },
  });

  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/vezne/banknote-count', data).then((r) => r.data),
    onSuccess: () => toast.success(t('common.success')),
    onError: () => toast.error(t('common.error')),
  });

  const total = denoms.reduce((s, d) => s + d.denom * d.count, 0);

  return (
    <div>
      <PageHeader title={t('vezne.banknoteCount')} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6 space-y-4">
          <form
            onSubmit={handleSubmit((data) =>
              mutation.mutate({
                cashDrawerId: data.cashDrawerId,
                currencyCode: data.currencyCode,
                denominations: denoms.filter((d) => d.count > 0).map((d) => ({ denomValue: d.denom, count: d.count })),
                note: data.note,
              }),
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vezne</Label>
                <select {...register('cashDrawerId')} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">Seciniz</option>
                  {drawers.map((d: { id: string; name: string }) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Doviz</Label>
                <select {...register('currencyCode')} className="h-10 w-full rounded-md border bg-background px-3">
                  {[CurrencyCode.USD, CurrencyCode.EUR, CurrencyCode.TRY].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Banknot Dagilimi</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {denoms.map((d, idx) => (
                  <div key={d.denom} className="flex items-center gap-2">
                    <span className="text-sm w-16">{d.denom}</span>
                    <Input
                      type="number"
                      min={0}
                      value={d.count}
                      onChange={(e) => {
                        const c = parseInt(e.target.value || '0', 10);
                        setDenoms((prev) => prev.map((x, i) => (i === idx ? { ...x, count: c } : x)));
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 text-lg font-semibold">Toplam: {total.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Input {...register('note')} />
            </div>
            <Button type="submit" disabled={mutation.isPending || !watch('cashDrawerId')}>
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}