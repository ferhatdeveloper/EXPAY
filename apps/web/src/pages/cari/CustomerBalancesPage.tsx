import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';

interface BalRow {
  customerId: string;
  fullName: string;
  balances: Array<{ currencyCode: string; balance: number }>;
}

export function CustomerBalancesPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId);
  const { data: items = [] } = useQuery({
    queryKey: ['customer-balances', branchId],
    queryFn: () => api.get('/customers/balances/all', { params: { branchId } }).then((r) => r.data),
  });

  const rows = (items as BalRow[]).flatMap((c) => c.balances.map((b) => ({
    id: `${c.customerId}-${b.currencyCode}`,
    name: c.fullName,
    currencyCode: b.currencyCode,
    balance: b.balance,
  })));

  const columns: Column<{ id: string; name: string; currencyCode: string; balance: number }>[] = [
    { key: 'name', header: 'Musteri', render: (r) => r.name },
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'bal', header: 'Bakiye', render: (r) => formatCurrency(r.balance, CurrencyCode.TRY, 'tr') },
  ];

  return (
    <div>
      <PageHeader title={t('cari.balance')} />
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} />
    </div>
  );
}