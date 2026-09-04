import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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

interface Line { accountCode: string; currencyCode: string; debit: number; credit: number; description?: string }
interface FormVals { description: string; date: string; voucherType: 'NORMAL' | 'OPENING' | 'CLOSING'; lines: Line[] }

interface Voucher {
  id: string;
  voucherNo: string;
  voucherType: string;
  voucherDate: string;
  description: string;
  totalDebit: string;
  totalCredit: string;
  postedAt: string | null;
  lines: Array<{ id: string; account: { code: string; name: string }; currencyCode: string; debit: string; credit: string }>;
}

export function VouchersPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, control, reset } = useForm<FormVals>({
    defaultValues: {
      description: '',
      date: new Date().toISOString().slice(0, 10),
      voucherType: 'NORMAL',
      lines: [
        { accountCode: '', currencyCode: 'TRY', debit: 0, credit: 0 },
        { accountCode: '', currencyCode: 'TRY', debit: 0, credit: 0 },
      ],
    },
  });
  const { fields, remove: removeLine } = useFieldArray({ control, name: 'lines' });

  const { data: items = [] } = useQuery({
    queryKey: ['vouchers', branchId],
    queryFn: () => api.get('/accounting/vouchers', { params: { branchId } }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) => api.post('/accounting/vouchers', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['vouchers', branchId] });
      setShowForm(false);
      reset();
    },
  });

  const columns: Column<Voucher>[] = [
    { key: 'no', header: 'Fis No', render: (v) => v.voucherNo },
    { key: 'type', header: 'Tur', render: (v) => <Badge variant="outline">{v.voucherType}</Badge> },
    { key: 'date', header: 'Tarih', render: (v) => new Date(v.voucherDate).toLocaleDateString() },
    { key: 'desc', header: 'Aciklama', render: (v) => v.description },
    { key: 'debit', header: 'Borc', render: (v) => Number(v.totalDebit).toFixed(2) },
    { key: 'credit', header: 'Alacak', render: (v) => Number(v.totalCredit).toFixed(2) },
    { key: 'posted', header: 'Posta', render: (v) => v.postedAt ? <Badge variant="success">Postali</Badge> : <Badge variant="outline">Bekliyor</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title={t('muhasebe.voucherCreate')}
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? t('common.cancel') : t('common.save')}</Button>}
      />
      {showForm && (
        <Card className="mb-4">
          <CardContent className="pt-6 space-y-4">
            <form
              onSubmit={handleSubmit((data) => create.mutate({ ...data, branchId, date: new Date(data.date) }))}
              className="space-y-4"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Tarih</Label><Input type="date" {...register('date', { required: true })} /></div>
                <div className="space-y-1">
                  <Label>Tur</Label>
                  <select {...register('voucherType')} className="h-10 w-full rounded-md border bg-background px-3">
                    <option value="NORMAL">Normal</option>
                    <option value="OPENING">Acilis</option>
                    <option value="CLOSING">Kapanis</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-1"><Label>Aciklama</Label><Input {...register('description', { required: true })} /></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Fis Satirlari</Label>
                </div>
                {fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                    <Input className="col-span-3" placeholder="Hesap Kodu" {...register(`lines.${i}.accountCode`, { required: true })} />
                    <Input className="col-span-2" placeholder="Doviz" {...register(`lines.${i}.currencyCode`)} />
                    <Input className="col-span-2" type="number" step="any" placeholder="Borc" {...register(`lines.${i}.debit`, { valueAsNumber: true })} />
                    <Input className="col-span-2" type="number" step="any" placeholder="Alacak" {...register(`lines.${i}.credit`, { valueAsNumber: true })} />
                    <Input className="col-span-2" placeholder="Aciklama" {...register(`lines.${i}.description`)} />
                    <Button type="button" variant="outline" className="col-span-1" onClick={() => removeLine(i)}>Sil</Button>
                  </div>
                ))}
              </div>
              <Button type="submit">{t('common.save')}</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <DataTable columns={columns} data={items as Voucher[]} rowKey={(v) => v.id} />
    </div>
  );
}