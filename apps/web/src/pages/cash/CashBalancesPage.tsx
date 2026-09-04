import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';

interface BalanceRow {
  cashAccountId: string;
  accountName: string;
  balances: Array<{ currencyCode: string; balance: number }>;
}

export function CashBalancesPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId);
  const { data: items = [] } = useQuery({
    queryKey: ['cash-balances', branchId],
    queryFn: () => api.get('/cash/balances', { params: { branchId } }).then((r) => r.data),
  });

  const rows = (items as BalanceRow[]).flatMap((a) => a.balances.map((b) => ({
    id: `${a.cashAccountId}-${b.currencyCode}`,
    account: a.accountName,
    currencyCode: b.currencyCode,
    balance: b.balance,
  })));

  const columns: Column<{ id: string; account: string; currencyCode: string; balance: number }>[] = [
    { key: 'acc', header: 'Hesap', render: (r) => r.account },
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'bal', header: 'Bakiye', render: (r) => formatCurrency(r.balance, CurrencyCode.TRY, 'tr') },
  ];

  return (
    <div>
      <PageHeader title={t('kasa.balance')} />
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} />
    </div>
  );
}