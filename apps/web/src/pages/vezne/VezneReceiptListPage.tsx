import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { exportToCSV, exportToExcel } from '@/components/shared/exporters';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReceiptRow {
  id: string;
  receiptNo: string;
  receiptType: 'BUY' | 'SELL';
  currencyCode: string;
  foreignAmount: string;
  rate: string;
  tryAmount: string;
  status: string;
  receiptDate: string;
  user: { fullName: string };
}

export function VezneReceiptListPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId);
  const { data: items = [] } = useQuery({
    queryKey: ['vezne-receipts', branchId],
    queryFn: () => api.get('/vezne/receipts', { params: { branchId } }).then((r) => r.data.items ?? []),
    enabled: !!branchId,
  });

  const columns: Column<ReceiptRow>[] = [
    { key: 'no', header: 'Fis No', render: (r) => r.receiptNo, width: '140px' },
    { key: 'type', header: 'Tur', render: (r) => <Badge variant={r.receiptType === 'BUY' ? 'success' : 'warning'}>{r.receiptType === 'BUY' ? 'Alis' : 'Satis'}</Badge> },
    { key: 'date', header: 'Tarih', render: (r) => new Date(r.receiptDate).toLocaleString() },
    { key: 'user', header: 'Kullanici', render: (r) => r.user?.fullName },
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'amount', header: 'Yabanci', render: (r) => Number(r.foreignAmount).toFixed(2) },
    { key: 'rate', header: 'Kur', render: (r) => Number(r.rate).toFixed(4) },
    { key: 'try', header: 'TL', render: (r) => Number(r.tryAmount).toFixed(2) },
    { key: 'status', header: 'Durum', render: (r) => <Badge variant="outline">{r.status}</Badge> },
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
              { key: 'receiptDate', header: 'Tarih' },
              { key: 'user.fullName', header: 'Kullanici' },
              { key: 'currencyCode', header: 'Doviz' },
              { key: 'foreignAmount', header: 'Yabanci' },
              { key: 'rate', header: 'Kur' },
              { key: 'tryAmount', header: 'TL' },
              { key: 'status', header: 'Durum' },
            ] as never)}>Excel</Button>
            <Button variant="outline" onClick={() => exportToCSV('fis-listesi', items as never)}>CSV</Button>
          </>
        }
      />
      <DataTable columns={columns} data={items as ReceiptRow[]} rowKey={(r) => r.id} />
    </div>
  );
}