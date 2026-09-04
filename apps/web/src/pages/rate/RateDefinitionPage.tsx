import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  buySpread: string;
  sellSpread: string;
  active: boolean;
}

export function RateDefinitionPage() {
  const { t } = useTranslation();
  const { data: items = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => api.get('/currencies').then((r) => r.data),
  });

  const columns: Column<CurrencyRow>[] = [
    { key: 'code', header: 'Kod', render: (r) => r.code },
    { key: 'name', header: 'Ad', render: (r) => r.name },
    { key: 'symbol', header: 'Sembol', render: (r) => r.symbol },
    { key: 'dec', header: 'Ondalik', render: (r) => r.decimalDigits },
    { key: 'buy', header: 'Alis Spread', render: (r) => Number(r.buySpread).toFixed(4) },
    { key: 'sell', header: 'Satis Spread', render: (r) => Number(r.sellSpread).toFixed(4) },
    { key: 'active', header: 'Durum', render: (r) => <Badge variant={r.active ? 'success' : 'outline'}>{r.active ? 'Aktif' : 'Pasif'}</Badge> },
  ];

  return (
    <div>
      <PageHeader title={t('rate.definition')} />
      <DataTable columns={columns} data={items as CurrencyRow[]} rowKey={(r) => r.code} />
    </div>
  );
}