import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface BalanceRow {
  currencyCode: string;
  totalForeign: number;
  totalTry: number;
}

export function VezneBalancePage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId);
  const { data: items = [] } = useQuery({
    queryKey: ['vezne-balances', branchId],
    queryFn: () => api.get('/vezne/balances', { params: { branchId } }).then((r) => r.data),
    enabled: !!branchId,
  });

  const columns: Column<BalanceRow>[] = [
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'foreign', header: 'Toplam Yabanci', render: (r) => r.totalForeign.toFixed(2) },
    { key: 'try', header: 'Toplam TL', render: (r) => r.totalTry.toFixed(2) },
  ];

  return (
    <div>
      <PageHeader title={t('vezne.balanceReport')} />
      <DataTable columns={columns} data={items as BalanceRow[]} rowKey={(r) => r.currencyCode} />
    </div>
  );
}