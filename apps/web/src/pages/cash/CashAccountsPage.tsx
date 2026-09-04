import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Account {
  id: string;
  code: string;
  name: string;
  currencyCode: string;
  active: boolean;
}

export function CashAccountsPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ code: string; name: string; currencyCode: string }>({
    defaultValues: { currencyCode: 'TRY' },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['cash-accounts', branchId],
    queryFn: () => api.get('/cash/accounts', { params: { branchId } }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) => api.post('/cash/accounts', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['cash-accounts', branchId] });
      setShowForm(false);
      reset({ currencyCode: 'TRY', code: '', name: '' });
    },
  });

  const columns: Column<Account>[] = [
    { key: 'code', header: 'Kod', render: (a) => a.code },
    { key: 'name', header: 'Ad', render: (a) => a.name },
    { key: 'cur', header: 'Doviz', render: (a) => a.currencyCode },
    { key: 'active', header: 'Durum', render: (a) => <Badge variant={a.active ? 'success' : 'outline'}>{a.active ? 'Aktif' : 'Pasif'}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title={t('kasa.accountCreate')}
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? t('common.cancel') : t('common.save')}</Button>}
      />
      {showForm && (
        <Card className="mb-4 max-w-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((data) => create.mutate({ ...data, branchId }))} className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Kod</Label><Input {...register('code', { required: true })} /></div>
              <div className="space-y-1"><Label>Ad</Label><Input {...register('name', { required: true })} /></div>
              <div className="space-y-1">
                <Label>Doviz</Label>
                <Input {...register('currencyCode')} />
              </div>
              <div className="col-span-3"><Button type="submit">{t('common.save')}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      <DataTable columns={columns} data={items as Account[]} rowKey={(a) => a.id} />
    </div>
  );
}