import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{ permission: { code: string } }>;
}

export function RolesPage() {
  const { t } = useTranslation();
  const { data: items = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const columns: Column<Role>[] = [
    { key: 'code', header: 'Kod', render: (r) => r.code },
    { key: 'name', header: 'Ad', render: (r) => r.name },
    { key: 'desc', header: 'Aciklama', render: (r) => r.description ?? '-' },
    { key: 'perms', header: 'Yetki Sayisi', render: (r) => r.permissions.length },
    { key: 'sys', header: 'Sistem', render: (r) => r.isSystem ? <Badge variant="success">Evet</Badge> : '-' },
  ];

  return (
    <div>
      <PageHeader title={t('nav.admin') + ' - Roller'} />
      <DataTable columns={columns} data={items as Role[]} rowKey={(r) => r.id} />
    </div>
  );
}