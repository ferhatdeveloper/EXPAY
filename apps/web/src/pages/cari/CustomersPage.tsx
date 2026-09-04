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

interface Customer {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  active: boolean;
}

export function CustomersPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ code: string; fullName: string; phone: string }>({});

  const { data: items = [] } = useQuery({
    queryKey: ['customers', branchId],
    queryFn: () => api.get('/customers', { params: { branchId } }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) => api.post('/customers', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['customers', branchId] });
      setShowForm(false);
      reset({});
    },
  });

  const columns: Column<Customer>[] = [
    { key: 'code', header: 'Kod', render: (c) => c.code },
    { key: 'name', header: 'Ad', render: (c) => c.fullName },
    { key: 'phone', header: 'Telefon', render: (c) => c.phone },
    { key: 'active', header: 'Durum', render: (c) => <Badge variant={c.active ? 'success' : 'outline'}>{c.active ? 'Aktif' : 'Pasif'}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title={t('cari.cardCreate')}
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? t('common.cancel') : t('common.save')}</Button>}
      />
      {showForm && (
        <Card className="mb-4 max-w-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((data) => create.mutate({ ...data, branchId }))} className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Kod</Label><Input {...register('code')} /></div>
              <div className="space-y-1"><Label>Ad</Label><Input {...register('fullName', { required: true })} /></div>
              <div className="space-y-1"><Label>Telefon</Label><Input {...register('phone')} /></div>
              <div className="col-span-3"><Button type="submit">{t('common.save')}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      <DataTable columns={columns} data={items as Customer[]} rowKey={(c) => c.id} />
    </div>
  );
}