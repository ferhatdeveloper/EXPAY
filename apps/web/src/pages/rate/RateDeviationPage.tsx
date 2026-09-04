import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface DevRow {
  id: string;
  currencyCode: string;
  rateType: string;
  previousRate: string;
  newRate: string;
  deviationPct: string;
  direction: string;
  createdAt: string;
  user: { fullName: string };
}

export function RateDeviationPage() {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data = { items: [] } } = useQuery({
    queryKey: ['rate-deviations', startDate, endDate],
    queryFn: () => api.get('/exchange-rates/deviations', { params: { startDate, endDate } }).then((r) => r.data),
  });

  const columns: Column<DevRow>[] = [
    { key: 'date', header: 'Tarih', render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'type', header: 'Tur', render: (r) => <Badge variant="outline">{r.rateType}</Badge> },
    { key: 'prev', header: 'Onceki', render: (r) => Number(r.previousRate).toFixed(4) },
    { key: 'new', header: 'Yeni', render: (r) => Number(r.newRate).toFixed(4) },
    { key: 'pct', header: 'Sapma %', render: (r) => `${Number(r.deviationPct).toFixed(2)}%` },
    { key: 'dir', header: 'Yon', render: (r) => <Badge variant={r.direction === 'UP' ? 'success' : 'danger'}>{r.direction}</Badge> },
    { key: 'user', header: 'Kullanici', render: (r) => r.user?.fullName },
  ];

  return (
    <div>
      <PageHeader title={t('sapma.rateReport')} />
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
      <DataTable columns={columns} data={data.items as DevRow[]} rowKey={(r) => r.id} />
    </div>
  );
}