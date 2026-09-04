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

export function VezneTransferPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const { register, handleSubmit, reset } = useForm<{ fromDrawerId: string; toDrawerId: string; currencyCode: string; amount: number; description?: string }>({
    defaultValues: { currencyCode: 'USD', amount: 0 },
  });
  const [error, setError] = useState<string | null>(null);

  const { data: drawers = [] } = useQuery({
    queryKey: ['cash-drawers', branchId],
    queryFn: () => api.get(`/vezne/cash-drawers`, { params: { branchId } }).then((r) => r.data).catch(() => []),
  });

  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/vezne/transfers', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      reset({ currencyCode: 'USD', amount: 0 });
      setError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message ?? t('common.error')),
  });

  return (
    <div>
      <PageHeader title={t('vezne.transferCreate')} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit((data) =>
              mutation.mutate({
                branchId,
                fromCashDrawerId: data.fromDrawerId,
                toCashDrawerId: data.toDrawerId || undefined,
                currencyCode: data.currencyCode,
                amount: data.amount,
                description: data.description,
              }),
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kaynak Vezne</Label>
                <select {...register('fromDrawerId', { required: true })} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">Seciniz</option>
                  {drawers.map((d: { id: string; name: string }) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Hedef Vezne</Label>
                <select {...register('toDrawerId')} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">Seciniz (opsiyonel)</option>
                  {drawers.map((d: { id: string; name: string }) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Doviz</Label>
                <Input {...register('currencyCode')} />
              </div>
              <div className="space-y-2">
                <Label>Tutar</Label>
                <Input type="number" step="any" {...register('amount', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Aciklama</Label>
                <Input {...register('description')} />
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