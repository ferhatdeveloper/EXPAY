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

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

export function AccountingAccountsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ code: string; name: string; type: string }>({
    defaultValues: { type: 'ASSET' },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => api.get('/accounting/accounts').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) => api.post('/accounting/accounts', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] });
      setShowForm(false);
      reset({ type: 'ASSET' });
    },
  });

  const columns: Column<Account>[] = [
    { key: 'code', header: 'Kod', render: (a) => a.code },
    { key: 'name', header: 'Ad', render: (a) => a.name },
    { key: 'type', header: 'Tip', render: (a) => <Badge variant="outline">{a.type}</Badge> },
    { key: 'active', header: 'Durum', render: (a) => <Badge variant={a.active ? 'success' : 'outline'}>{a.active ? 'Aktif' : 'Pasif'}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title={t('muhasebe.accountCreate')}
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? t('common.cancel') : t('common.save')}</Button>}
      />
      {showForm && (
        <Card className="mb-4 max-w-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((data) => create.mutate({ ...data, currencyCode: 'TRY' }))} className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Kod</Label><Input {...register('code', { required: true })} /></div>
              <div className="space-y-1"><Label>Ad</Label><Input {...register('name', { required: true })} /></div>
              <div className="space-y-1">
                <Label>Tip</Label>
                <select {...register('type')} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="ASSET">Varlik</option>
                  <option value="LIABILITY">Borc</option>
                  <option value="EQUITY">Sermaye</option>
                  <option value="INCOME">Gelir</option>
                  <option value="EXPENSE">Gider</option>
                </select>
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