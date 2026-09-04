import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Movement {
  id: string;
  cashAccount: { code: string; name: string };
  currencyCode: string;
  direction: 'IN' | 'OUT';
  amount: string;
  description: string | null;
  movementDate: string;
}

export function CashMovementsPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ cashAccountId: string; currencyCode: string; direction: 'IN' | 'OUT'; amount: number; description?: string }>({
    defaultValues: { currencyCode: 'TRY', direction: 'IN', amount: 0 },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-accounts', branchId],
    queryFn: () => api.get('/cash/accounts', { params: { branchId } }).then((r) => r.data),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['cash-movements', branchId],
    queryFn: () => api.get('/cash/movements', { params: { branchId } }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) => api.post('/cash/movements', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['cash-movements', branchId] });
      setShowForm(false);
      reset({ currencyCode: 'TRY', direction: 'IN', amount: 0 });
    },
  });

  const columns: Column<Movement>[] = [
    { key: 'date', header: 'Tarih', render: (m) => new Date(m.movementDate).toLocaleString() },
    { key: 'acc', header: 'Hesap', render: (m) => `${m.cashAccount.code} - ${m.cashAccount.name}` },
    { key: 'cur', header: 'Doviz', render: (m) => m.currencyCode },
    { key: 'dir', header: 'Yon', render: (m) => <Badge variant={m.direction === 'IN' ? 'success' : 'danger'}>{m.direction}</Badge> },
    { key: 'amount', header: 'Tutar', render: (m) => Number(m.amount).toFixed(2) },
    { key: 'desc', header: 'Aciklama', render: (m) => m.description ?? '-' },
  ];

  return (
    <div>
      <PageHeader
        title={t('kasa.movementCreate')}
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? t('common.cancel') : t('common.save')}</Button>}
      />
      {showForm && (
        <Card className="mb-4 max-w-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((data) => create.mutate({ ...data, branchId }))} className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Hesap</Label>
                <select {...register('cashAccountId', { required: true })} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">Seciniz</option>
                  {accounts.map((a: { id: string; code: string; name: string }) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1"><Label>Doviz</Label><Input {...register('currencyCode')} /></div>
              <div className="space-y-1">
                <Label>Yon</Label>
                <select {...register('direction')} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="IN">Giris</option>
                  <option value="OUT">Cikis</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Tutar</Label><Input type="number" step="any" {...register('amount', { valueAsNumber: true })} /></div>
              <div className="space-y-1 col-span-2"><Label>Aciklama</Label><Input {...register('description')} /></div>
              <div className="col-span-2"><Button type="submit">{t('common.save')}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      <DataTable columns={columns} data={items as Movement[]} rowKey={(m) => m.id} />
    </div>
  );
}