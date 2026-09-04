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
  customer: { fullName: string };
  currencyCode: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  description: string | null;
  movementDate: string;
}

export function CustomerMovementsPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ customerId: string; currencyCode: string; direction: 'DEBIT' | 'CREDIT'; amount: number; description?: string }>({
    defaultValues: { currencyCode: 'TRY', direction: 'DEBIT', amount: 0 },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', branchId],
    queryFn: () => api.get('/customers', { params: { branchId } }).then((r) => r.data),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['customer-movements', branchId],
    queryFn: () => api.get('/customers/movements/list', { params: { branchId } }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) => api.post('/customers/movements', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['customer-movements', branchId] });
      setShowForm(false);
      reset({ currencyCode: 'TRY', direction: 'DEBIT', amount: 0 });
    },
  });

  const columns: Column<Movement>[] = [
    { key: 'date', header: 'Tarih', render: (m) => new Date(m.movementDate).toLocaleString() },
    { key: 'cust', header: 'Musteri', render: (m) => m.customer?.fullName },
    { key: 'cur', header: 'Doviz', render: (m) => m.currencyCode },
    { key: 'dir', header: 'Yon', render: (m) => <Badge variant={m.direction === 'DEBIT' ? 'danger' : 'success'}>{m.direction}</Badge> },
    { key: 'amount', header: 'Tutar', render: (m) => Number(m.amount).toFixed(2) },
    { key: 'desc', header: 'Aciklama', render: (m) => m.description ?? '-' },
  ];

  return (
    <div>
      <PageHeader
        title={t('cari.movementCreate')}
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? t('common.cancel') : t('common.save')}</Button>}
      />
      {showForm && (
        <Card className="mb-4 max-w-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((data) => create.mutate({ ...data, branchId }))} className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Musteri</Label>
                <select {...register('customerId', { required: true })} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">Seciniz</option>
                  {customers.map((c: { id: string; fullName: string }) => (
                    <option key={c.id} value={c.id}>{c.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1"><Label>Doviz</Label><Input {...register('currencyCode')} /></div>
              <div className="space-y-1">
                <Label>Yon</Label>
                <select {...register('direction')} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="DEBIT">Borc</option>
                  <option value="CREDIT">Alacak</option>
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