import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { formatDateForBranch } from '@/lib/format';

interface DayEnd {
  id: string;
  businessDate: string;
  status: string;
  closedAt: string | null;
  notes: string | null;
}

export function DayEndPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const { data: items = [] } = useQuery({
    queryKey: ['day-end', branchId],
    queryFn: () => api.get('/accounting/day-end', { params: { branchId } }).then((r) => r.data),
  });

  const close = useMutation({
    mutationFn: () => api.post('/accounting/day-end', { branchId }).then((r) => r.data),
    onSuccess: () => toast.success(t('common.success')),
  });

  const columns: Column<DayEnd>[] = [
    { key: 'date', header: 'Tarih', render: (d) => formatDateForBranch(d.businessDate, (useAuthStore.getState().user as any)?.branch?.country === 'IQ' ? 'IQ' : 'TR') },
    { key: 'status', header: 'Durum', render: (d) => <Badge variant={d.status === 'CLOSED' ? 'success' : 'warning'}>{d.status}</Badge> },
    { key: 'closed', header: 'Kapanis', render: (d) => d.closedAt ? formatDateForBranch(d.closedAt, (useAuthStore.getState().user as any)?.branch?.country === 'IQ' ? 'IQ' : 'TR') : '-' },
    { key: 'notes', header: 'Notlar', render: (d) => d.notes ?? '-' },
  ];

  return (
    <div>
      <PageHeader
        title={t('muhasebe.dayEnd')}
        actions={<Button onClick={() => close.mutate()} disabled={close.isPending}>Gun Sonu</Button>}
      />
      <DataTable columns={columns} data={items as DayEnd[]} rowKey={(d) => d.id} />
    </div>
  );
}