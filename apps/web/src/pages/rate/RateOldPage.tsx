import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDateForBranch } from '@/lib/format';

interface RateRow {
  id: string;
  currencyCode: string;
  rateType: string;
  buyRate: string;
  sellRate: string;
  effectiveAt: string;
  note: string | null;
}

export function RateOldPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rateType, setRateType] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');

  const { data = { items: [], total: 0 } } = useQuery({
    queryKey: ['old-rates', branchId, startDate, endDate, rateType, currencyCode],
    queryFn: () =>
      api
        .get('/exchange-rates', {
          params: { branchId, startDate, endDate, rateType: rateType || undefined, currencyCode: currencyCode || undefined },
        })
        .then((r) => r.data),
  });

  const columns: Column<RateRow>[] = [
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'type', header: 'Tur', render: (r) => <Badge variant="outline">{r.rateType}</Badge> },
    { key: 'buy', header: 'Alis', render: (r) => Number(r.buyRate).toFixed(4) },
    { key: 'sell', header: 'Satis', render: (r) => Number(r.sellRate).toFixed(4) },
    { key: 'date', header: 'Tarih', render: (r) => formatDateForBranch(r.effectiveAt, (useAuthStore.getState().user as any)?.branch?.country === 'IQ' ? 'IQ' : 'TR') },
    { key: 'note', header: 'Not', render: (r) => r.note ?? '-' },
  ];

  return (
    <div>
      <PageHeader title={t('rate.old')} />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
        <div className="space-y-1">
          <Label>Baslangic</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Bitis</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tur</Label>
          <select value={rateType} onChange={(e) => setRateType(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
            <option value="">Tumu</option>
            <option value="RAW_FREE">Ham Serbest</option>
            <option value="FREE">Serbest</option>
            <option value="CLOSING">Kapanis</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Doviz</Label>
          <Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="USD" />
        </div>
      </div>
      <DataTable columns={columns} data={data.items as RateRow[]} rowKey={(r) => r.id} />
    </div>
  );
}