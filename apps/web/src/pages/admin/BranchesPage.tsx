import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Branch {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  active: boolean;
}

export function BranchesPage() {
  const { t } = useTranslation();
  const { data: items = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then((r) => r.data),
  });

  const columns: Column<Branch>[] = [
    { key: 'code', header: 'Kod', render: (b) => b.code },
    { key: 'name', header: 'Ad', render: (b) => b.name },
    { key: 'phone', header: 'Telefon', render: (b) => b.phone ?? '-' },
    { key: 'address', header: 'Adres', render: (b) => b.address ?? '-' },
    { key: 'active', header: 'Durum', render: (b) => <Badge variant={b.active ? 'success' : 'outline'}>{b.active ? 'Aktif' : 'Pasif'}</Badge> },
  ];

  return (
    <div>
      <PageHeader title={t('nav.admin') + ' - Subeler'} />
      <DataTable columns={columns} data={items as Branch[]} rowKey={(b) => b.id} />
    </div>
  );
}