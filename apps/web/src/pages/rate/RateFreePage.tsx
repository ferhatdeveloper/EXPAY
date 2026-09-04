import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';

interface RateRow {
  code: string;
  buyRate: number;
  sellRate: number;
  rawBuyRate: number | null;
  rawSellRate: number | null;
  effectiveAt: string | null;
}

export function RateFreePage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId);
  const { data: items = [] } = useQuery({
    queryKey: ['current-rates', branchId],
    queryFn: () => api.get('/exchange-rates/current', { params: { branchId } }).then((r) => r.data),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const columns: Column<RateRow>[] = [
    { key: 'code', header: 'Doviz', render: (r) => r.code },
    { key: 'rawBuy', header: 'Ham Alis', render: (r) => r.rawBuyRate != null ? formatCurrency(r.rawBuyRate, CurrencyCode.TRY, 'tr') : '-' },
    { key: 'rawSell', header: 'Ham Satis', render: (r) => r.rawSellRate != null ? formatCurrency(r.rawSellRate, CurrencyCode.TRY, 'tr') : '-' },
    { key: 'buy', header: 'Alis', render: (r) => formatCurrency(r.buyRate, CurrencyCode.TRY, 'tr') },
    { key: 'sell', header: 'Satis', render: (r) => formatCurrency(r.sellRate, CurrencyCode.TRY, 'tr') },
    { key: 'date', header: 'Gecerlilik', render: (r) => r.effectiveAt ? new Date(r.effectiveAt).toLocaleString() : '-' },
  ];

  return (
    <div>
      <PageHeader title={t('rate.free')} />
      <DataTable columns={columns} data={items as RateRow[]} rowKey={(r) => r.code} />
    </div>
  );
}