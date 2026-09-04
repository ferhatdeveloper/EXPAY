import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { exportToCSV, exportToExcel } from '@/components/shared/exporters';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface R {
  id: string;
  receiptNo: string;
  receiptType: 'BUY' | 'SELL';
  currencyCode: string;
  foreignAmount: string;
  rate: string;
  tryAmount: string;
  receiptDate: string;
  user: { fullName: string };
}

export function ReceiptListReportPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['report-receipt-list', branchId, startDate, endDate],
    queryFn: () => api.get('/reports/receipt-list', { params: { branchId, startDate, endDate } }).then((r) => r.data),
  });

  const columns: Column<R>[] = [
    { key: 'no', header: 'Fis No', render: (r) => r.receiptNo },
    { key: 'type', header: 'Tur', render: (r) => <Badge variant={r.receiptType === 'BUY' ? 'success' : 'warning'}>{r.receiptType}</Badge> },
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'foreign', header: 'Yabanci', render: (r) => Number(r.foreignAmount).toFixed(2) },
    { key: 'rate', header: 'Kur', render: (r) => Number(r.rate).toFixed(4) },
    { key: 'try', header: 'TL', render: (r) => Number(r.tryAmount).toFixed(2) },
    { key: 'date', header: 'Tarih', render: (r) => new Date(r.receiptDate).toLocaleString() },
    { key: 'user', header: 'Kullanici', render: (r) => r.user?.fullName },
  ];

  return (
    <div>
      <PageHeader
        title={t('raporlar.receiptList')}
        actions={
          <>
            <Button variant="outline" onClick={() => exportToExcel('fis-listesi', items as never, [
              { key: 'receiptNo', header: 'Fis No' },
              { key: 'receiptType', header: 'Tur' },
              { key: 'currencyCode', header: 'Doviz' },
              { key: 'foreignAmount', header: 'Yabanci' },
              { key: 'rate', header: 'Kur' },
              { key: 'tryAmount', header: 'TL' },
              { key: 'receiptDate', header: 'Tarih' },
            ] as never)}>Excel</Button>
            <Button variant="outline" onClick={() => exportToCSV('fis-listesi', items as never)}>CSV</Button>
          </>
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
      <DataTable columns={columns} data={items as R[]} rowKey={(r) => r.id} />
    </div>
  );
}