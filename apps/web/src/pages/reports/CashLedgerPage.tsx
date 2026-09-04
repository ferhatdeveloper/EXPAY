import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  FileText,
  FileSpreadsheet,
  Printer,
  FileDown,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Scale,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { exportToCSV, exportToExcel, printHtml } from '@/components/shared/exporters';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LedgerRow {
  id: string;
  cashAccount: { code: string; name: string };
  currencyCode: string;
  debit: string;
  credit: string;
  description: string | null;
  txnDate: string;
}

interface CashAccount {
  id: string;
  code: string;
  name: string;
}

export function CashLedgerPage() {
  const branchId = useAuthStore((s) => s.user?.defaultBranchId) ?? '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cashAccountId, setCashAccountId] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-accounts', branchId],
    queryFn: () =>
      api
        .get('/cash/accounts', { params: { branchId } })
        .then((r) => r.data?.items ?? r.data ?? []),
  });

  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ['cash-ledger', branchId, startDate, endDate, cashAccountId],
    queryFn: () =>
      api
        .get('/reports/cash-ledger', {
          params: {
            branchId,
            cashAccountId: cashAccountId || undefined,
            startDate,
            endDate,
          },
        })
        .then((r) => r.data?.items ?? r.data ?? []),
  });

  const arr = ledger as LedgerRow[];

  const ledgerWithBalance = useMemo(() => {
    let runningBalance = 0;
    return arr.map((row) => {
      const debit = Number(row.debit);
      const credit = Number(row.credit);
      runningBalance += debit - credit;
      return { ...row, balance: runningBalance };
    });
  }, [arr]);

  const stats = useMemo(() => {
    const totalDebit = arr.reduce((acc, r) => acc + Number(r.debit), 0);
    const totalCredit = arr.reduce((acc, r) => acc + Number(r.credit), 0);
    const lastBalance = ledgerWithBalance[ledgerWithBalance.length - 1]?.balance ?? 0;
    const firstBalance = ledgerWithBalance[0]?.balance ?? 0;
    const firstRow = arr[0];
    const opening = firstRow
      ? firstBalance - (Number(firstRow.debit) - Number(firstRow.credit))
      : 0;
    return {
      opening,
      totalDebit,
      totalCredit,
      closing: lastBalance,
      count: arr.length,
    };
  }, [arr, ledgerWithBalance]);

  const exportColumns = [
    { key: 'txnDate' as const, header: 'Tarih' },
    { key: 'cashAccount' as const, header: 'Hesap' },
    { key: 'currencyCode' as const, header: 'Döviz' },
    { key: 'debit' as const, header: 'Borç' },
    { key: 'credit' as const, header: 'Alacak' },
    { key: 'description' as const, header: 'Açıklama' },
  ];

  const handlePrint = () => {
    const rows = arr
      .map(
        (r) =>
          `<tr><td>${new Date(r.txnDate).toLocaleString('tr-TR')}</td><td>${r.cashAccount.code} - ${r.cashAccount.name}</td><td>${r.currencyCode}</td><td>${Number(r.debit).toFixed(2)}</td><td>${Number(r.credit).toFixed(2)}</td><td>${r.description ?? ''}</td></tr>`,
      )
      .join('');
    const html = `<h2>Kasa Defteri</h2><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Tarih</th><th>Hesap</th><th>Döviz</th><th>Borç</th><th>Alacak</th><th>Açıklama</th></tr></thead><tbody>${rows}</tbody></table>`;
    printHtml('Kasa Defteri', html);
  };

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <BookOpen className="h-6 w-6 text-blue-600" />
              Kasa Defteri
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Tarih aralığına ve kasa hesabına göre tüm borç/alacak hareketleri
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() =>
                exportToExcel('kasa-defteri', arr as never, exportColumns as never)
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToCSV('kasa-defteri', arr as never)}
            >
              <FileDown className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Yazdır
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handlePrint}
            >
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  <CircleDollarSign className="h-5 w-5 text-slate-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.opening, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Açılış Bakiyesi</div>
              <div className="mt-2 text-xs text-slate-500">Dönem başı</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.totalDebit, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam Giriş (Borç)</div>
              <div className="mt-2 text-xs text-emerald-600">{stats.count} işlem</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                  <ArrowUpRight className="h-5 w-5 text-rose-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.totalCredit, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam Çıkış (Alacak)</div>
              <div className="mt-2 text-xs text-rose-600">Dönem içi</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.closing, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Kapanış Bakiyesi</div>
              <div className="mt-2 text-xs text-blue-600">Dönem sonu</div>
            </CardContent>
          </Card>
        </div>

        {/* FILTER */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <Filter className="h-4 w-4 text-blue-600" />
              Filtreler
            </CardTitle>
            <CardDescription>Kasa hesabı ve tarih filtresi</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Kasa Hesabı</Label>
                <select
                  value={cashAccountId}
                  onChange={(e) => setCashAccountId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white"
                >
                  <option value="">Tümü</option>
                  {(accounts as CashAccount[]).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Kasa Hareketleri
            </CardTitle>
            <CardDescription>
              {stats.count} işlem listeleniyor — running balance ile
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-full animate-pulse rounded bg-gray-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Hesap
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Açıklama
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Borç
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Alacak
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Bakiye
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerWithBalance.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-gray-400"
                      >
                        Filtreye uyan hareket yok
                      </td>
                    </tr>
                  ) : (
                    ledgerWithBalance.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                          {formatDateTime(r.txnDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-semibold text-gray-900 dark:text-slate-100">
                            {r.cashAccount.code}
                          </div>
                          <div className="text-xs text-gray-500">{r.cashAccount.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                          {r.description ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {Number(r.debit) > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-600">
                              <ArrowDownLeft className="h-3 w-3" />
                              {formatCurrency(Number(r.debit), CurrencyCode.TRY, 'tr')}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {Number(r.credit) > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-rose-600">
                              <ArrowUpRight className="h-3 w-3" />
                              {formatCurrency(Number(r.credit), CurrencyCode.TRY, 'tr')}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-mono font-bold ${
                              r.balance >= 0
                                ? 'text-gray-900 dark:text-slate-100'
                                : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(r.balance, CurrencyCode.TRY, 'tr')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
