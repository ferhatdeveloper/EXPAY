import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface FY {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

export function FiscalYearsPage() {
  const { t } = useTranslation();
  const { data: items = [] } = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: () => api.get('/accounting/fiscal-years').then((r) => r.data),
  });

  const columns: Column<FY>[] = [
    { key: 'year', header: 'Yil', render: (f) => f.year },
    { key: 'start', header: 'Baslangic', render: (f) => new Date(f.startDate).toLocaleDateString() },
    { key: 'end', header: 'Bitis', render: (f) => new Date(f.endDate).toLocaleDateString() },
    { key: 'active', header: 'Aktif', render: (f) => <Badge variant={f.active ? 'success' : 'outline'}>{f.active ? 'Evet' : 'Hayir'}</Badge> },
  ];

  return (
    <div>
      <PageHeader title={t('muhasebe.fiscalYear')} />
      <DataTable columns={columns} data={items as FY[]} rowKey={(f) => f.id} />
    </div>
  );
}