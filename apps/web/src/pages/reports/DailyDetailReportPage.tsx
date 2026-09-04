import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { exportToExcel } from '@/components/shared/exporters';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface DayGroup {
  date: string;
  count: number;
  totalTry: number;
  totalForeign: number;
}

export function DailyDetailReportPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data = [] } = useQuery({
    queryKey: ['report-daily-detail', branchId, startDate, endDate],
    queryFn: () => api.get('/reports/daily-detail', { params: { branchId, startDate, endDate } }).then((r) => r.data),
  });

  const columns: Column<DayGroup>[] = [
    { key: 'date', header: 'Tarih', render: (r) => r.date },
    { key: 'count', header: 'Fis Sayisi', render: (r) => r.count },
    { key: 'totalForeign', header: 'Toplam Yabanci', render: (r) => r.totalForeign.toFixed(2) },
    { key: 'totalTry', header: 'Toplam TL', render: (r) => r.totalTry.toFixed(2) },
  ];

  return (
    <div>
      <PageHeader
        title={t('raporlar.dailyDetail')}
        actions={
          <Button variant="outline" onClick={() => exportToExcel('gunluk-detay', data as never, [
            { key: 'date', header: 'Tarih' },
            { key: 'count', header: 'Fis Sayisi' },
            { key: 'totalForeign', header: 'Toplam Yabanci' },
            { key: 'totalTry', header: 'Toplam TL' },
          ] as never)}>Excel</Button>
        }
      />
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
      <DataTable columns={columns} data={data as DayGroup[]} rowKey={(r) => r.date} />
    </div>
  );
}