import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';

interface P {
  currency: string;
  buyCount: number;
  sellCount: number;
  totalBuyTry: number;
  totalSellTry: number;
  profit: number;
}

export function ProfitabilityReportPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data = [] } = useQuery({
    queryKey: ['report-profitability', branchId, startDate, endDate],
    queryFn: () => api.get('/reports/profitability', { params: { branchId, startDate, endDate } }).then((r) => r.data),
  });

  const columns: Column<P>[] = [
    { key: 'cur', header: 'Doviz', render: (r) => r.currency },
    { key: 'buy', header: 'Alis Fis', render: (r) => r.buyCount },
    { key: 'sell', header: 'Satis Fis', render: (r) => r.sellCount },
    { key: 'buyTry', header: 'Alis TL', render: (r) => formatCurrency(r.totalBuyTry, CurrencyCode.TRY, 'tr') },
    { key: 'sellTry', header: 'Satis TL', render: (r) => formatCurrency(r.totalSellTry, CurrencyCode.TRY, 'tr') },
    { key: 'profit', header: 'Kar', render: (r) => formatCurrency(r.profit, CurrencyCode.TRY, 'tr') },
  ];

  return (
    <div>
      <PageHeader title={t('raporlar.profitability')} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div className="space-y-1">
          <Label>Baslangic</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Bitis</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <DataTable columns={columns} data={data as P[]} rowKey={(r) => r.currency} />
    </div>
  );
}