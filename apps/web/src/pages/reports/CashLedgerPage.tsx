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

interface LedgerRow {
  id: string;
  cashAccount: { code: string; name: string };
  currencyCode: string;
  debit: string;
  credit: string;
  description: string | null;
  txnDate: string;
}

export function CashLedgerPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId)!;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cashAccountId, setCashAccountId] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-accounts', branchId],
    queryFn: () => api.get('/cash/accounts', { params: { branchId } }).then((r) => r.data),
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ['cash-ledger', branchId, startDate, endDate, cashAccountId],
    queryFn: () => api.get('/reports/cash-ledger', { params: { branchId, cashAccountId: cashAccountId || undefined, startDate, endDate } }).then((r) => r.data),
  });

  const columns: Column<LedgerRow>[] = [
    { key: 'date', header: 'Tarih', render: (r) => new Date(r.txnDate).toLocaleString() },
    { key: 'acc', header: 'Hesap', render: (r) => `${r.cashAccount.code} - ${r.cashAccount.name}` },
    { key: 'cur', header: 'Doviz', render: (r) => r.currencyCode },
    { key: 'debit', header: 'Borc', render: (r) => formatCurrency(Number(r.debit), CurrencyCode.TRY, 'tr') },
    { key: 'credit', header: 'Alacak', render: (r) => formatCurrency(Number(r.credit), CurrencyCode.TRY, 'tr') },
    { key: 'desc', header: 'Aciklama', render: (r) => r.description ?? '-' },
  ];

  return (
    <div>
      <PageHeader title={t('kasa.ledger')} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <div className="space-y-1">
          <Label>Hesap</Label>
          <select value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
            <option value="">Tumu</option>
            {accounts.map((a: { id: string; code: string; name: string }) => (
              <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
            ))}
          </select>
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
      <DataTable columns={columns} data={ledger as LedgerRow[]} rowKey={(r) => r.id} />
    </div>
  );
}