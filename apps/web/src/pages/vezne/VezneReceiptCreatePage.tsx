import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { ReceiptType, CurrencyCode } from '@doviz/shared';

const schema = z.object({
  cashDrawerId: z.string().uuid(),
  currencyCode: z.string(),
  receiptType: z.enum(['BUY', 'SELL']),
  foreignAmount: z.coerce.number().positive(),
  rate: z.coerce.number().positive(),
  tryAmount: z.coerce.number().positive(),
  customerName: z.string().optional(),
  description: z.string().optional(),
}) as any;

export function VezneReceiptCreatePage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: drawers = [] } = useQuery({
    queryKey: ['cash-drawers', branchId],
    queryFn: () => api.get(`/vezne/cash-drawers`, { params: { branchId } }).then((r) => r.data).catch(() => []),
    enabled: !!branchId,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => api.get('/currencies').then((r) => r.data),
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: { receiptType: 'BUY', currencyCode: CurrencyCode.USD },
  });

  const createMutation = useMutation({
    mutationFn: (input: unknown) => api.post('/vezne/receipts', input).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['vezne-receipts'] });
      setServerError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setServerError(err.response?.data?.message ?? t('common.error'));
    },
  });

  const foreignAmount = watch('foreignAmount');
  const rate = watch('rate');

  return (
    <div>
      <PageHeader title={t('vezne.receiptCreate')} />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Alis / Satis Fisi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => createMutation.mutate({ ...data, branchId }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vezne</Label>
                <select {...register('cashDrawerId')} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">Seciniz</option>
                  {drawers.map((d: { id: string; name: string }) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.cashDrawerId && <p className="text-destructive text-xs">{String(errors.cashDrawerId.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label>Doviz</Label>
                <select {...register('currencyCode')} className="h-10 w-full rounded-md border bg-background px-3">
                  {currencies.map((c: { code: string }) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Islem Turu</Label>
                <select {...register('receiptType')} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value={ReceiptType.BUY}>Alis</option>
                  <option value={ReceiptType.SELL}>Satis</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Doviz Tutari</Label>
                <Input type="number" step="any" {...register('foreignAmount', { valueAsNumber: true })} />
                {errors.foreignAmount && <p className="text-destructive text-xs">{String(errors.foreignAmount.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label>Kur</Label>
                <Input
                  type="number"
                  step="any"
                  {...register('rate', { valueAsNumber: true })}
                  onBlur={() => {
                    const f = Number(foreignAmount);
                    const r = Number(rate);
                    if (f > 0 && r > 0) setValue('tryAmount', Math.round(f * r * 100) / 100);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>TL Tutari</Label>
                <Input type="number" step="any" {...register('tryAmount', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Musteri Adi (opsiyonel)</Label>
                <Input {...register('customerName')} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Aciklama</Label>
                <Input {...register('description')} />
              </div>
            </div>
            {serverError && <p className="text-destructive text-sm">{serverError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {t('common.save')}
              </Button>
              <Button type="reset" variant="outline">
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}