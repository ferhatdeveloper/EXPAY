import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useState } from 'react';

interface ClosingRow {
  code: string;
  buyRate: number;
  sellRate: number;
}

export function RateClosingPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: items = [] } = useQuery({
    queryKey: ['closing-rates', branchId, date],
    queryFn: () => api.get('/exchange-rates/closing', { params: { branchId, date } }).then((r) => r.data),
  });

  const columns: Column<ClosingRow>[] = [
    { key: 'code', header: 'Doviz', render: (r) => r.code },
    { key: 'buy', header: 'Alis', render: (r) => r.buyRate.toFixed(4) },
    { key: 'sell', header: 'Satis', render: (r) => r.sellRate.toFixed(4) },
  ];

  return (
    <div>
      <PageHeader title={t('rate.closing')} />
      <div className="mb-4 max-w-xs">
        <Label>Tarih</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <DataTable columns={columns} data={items as ClosingRow[]} rowKey={(r) => r.code} />
    </div>
  );
}