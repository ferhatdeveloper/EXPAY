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
  userId: string;
  fullName: string;
  username: string;
  count: number;
  totalTry: number;
  totalForeign: number;
}

export function PersonnelReportPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data = [] } = useQuery({
    queryKey: ['report-personnel', branchId, startDate, endDate],
    queryFn: () => api.get('/reports/personnel', { params: { branchId, startDate, endDate } }).then((r) => r.data),
  });

  const columns: Column<P>[] = [
    { key: 'name', header: 'Ad Soyad', render: (r) => r.fullName },
    { key: 'user', header: 'Kullanici', render: (r) => r.username },
    { key: 'count', header: 'Fis Sayisi', render: (r) => r.count },
    { key: 'totalForeign', header: 'Toplam Yabanci', render: (r) => r.totalForeign.toFixed(2) },
    { key: 'totalTry', header: 'Toplam TL', render: (r) => formatCurrency(r.totalTry, CurrencyCode.TRY, 'tr') },
  ];

  return (
    <div>
      <PageHeader title={t('raporlar.personnel')} />
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
      <DataTable columns={columns} data={data as P[]} rowKey={(r) => r.userId} />
    </div>
  );
}