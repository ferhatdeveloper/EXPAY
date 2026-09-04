import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: { code: string; name: string };
  branches: Array<{ branch: { code: string; name: string } }>;
}

export function UsersPage() {
  const { t } = useTranslation();
  const { data: items = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data.items ?? []),
  });

  const columns: Column<User>[] = [
    { key: 'username', header: 'Kullanici', render: (u) => u.username },
    { key: 'name', header: 'Ad Soyad', render: (u) => u.fullName },
    { key: 'email', header: 'Eposta', render: (u) => u.email ?? '-' },
    { key: 'role', header: 'Rol', render: (u) => <Badge variant="outline">{u.role?.code}</Badge> },
    { key: 'branches', header: 'Subeler', render: (u) => u.branches.map((b) => b.branch.code).join(', ') },
  ];

  return (
    <div>
      <PageHeader title={t('nav.admin') + ' - Kullanicilar'} />
      <DataTable columns={columns} data={items as User[]} rowKey={(u) => u.id} />
    </div>
  );
}