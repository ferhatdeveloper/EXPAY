import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ChangeRow {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  user: { fullName: string } | null;
  ip: string | null;
  createdAt: string;
}

export function ChangeReportPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entity, setEntity] = useState('');
  const { data = { items: [] } } = useQuery({
    queryKey: ['audit-changes', branchId, startDate, endDate, entity],
    queryFn: () => api.get('/audit/changes', { params: { branchId, startDate, endDate, entity: entity || undefined } }).then((r) => r.data),
  });

  const columns: Column<ChangeRow>[] = [
    { key: 'date', header: 'Tarih', render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: 'user', header: 'Kullanici', render: (r) => r.user?.fullName ?? '-' },
    { key: 'entity', header: 'Modul', render: (r) => r.entity },
    { key: 'action', header: 'Islem', render: (r) => <Badge variant="outline">{r.action}</Badge> },
    { key: 'ip', header: 'IP', render: (r) => r.ip ?? '-' },
    { key: 'entityId', header: 'Kayit ID', render: (r) => r.entityId.slice(0, 8) },
  ];

  return (
    <div>
      <PageHeader title={t('sapma.changeReport')} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <div className="space-y-1">
          <Label>Modul</Label>
          <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="VezneReceipt" />
        </div>
        <div className="space-y-1">
          <Label>Baslangic</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Bitis</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <DataTable columns={columns} data={data.items as ChangeRow[]} rowKey={(r) => r.id} />
    </div>
  );
}