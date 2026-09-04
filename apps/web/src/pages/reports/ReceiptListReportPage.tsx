import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  FileDown,
  Receipt,
  TrendingUp,
  TrendingDown,
  XCircle,
  Filter,
  Search,
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

interface R {
  id: string;
  receiptNo: string;
  receiptType: 'BUY' | 'SELL';
  currencyCode: string;
  foreignAmount: string;
  rate: string;
  tryAmount: string;
  receiptDate: string;
  status: string;
  branch?: { code: string; name: string };
  user?: { fullName: string };
}

const statusVariant: Record<
  string,
  { label: string; classes: string }
> = {
  POSTED: {
    label: 'İşlendi',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  DRAFT: {
    label: 'Taslak',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  VOIDED: {
    label: 'İptal',
    classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  CANCELLED: {
    label: 'İptal',
    classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  CORRECTED: {
    label: 'Düzeltildi',
    classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

export function ReceiptListReportPage() {
  const branchId = useAuthStore((s) => s.user?.defaultBranchId) ?? '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['report-receipt-list', branchId, startDate, endDate, status, currencyCode, userId],
    queryFn: () =>
      api
        .get('/reports/receipt-list', {
          params: {
            branchId,
            startDate,
            endDate,
            status: status || undefined,
            currencyCode: currencyCode || undefined,
            userId: userId || undefined,
          },
        })
        .then((r) => r.data?.items ?? r.data ?? []),
  });

  const arr = items as R[];

  const filtered = useMemo(() => {
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(
      (r) =>
        r.receiptNo.toLowerCase().includes(q) ||
        (r.user?.fullName ?? '').toLowerCase().includes(q) ||
        r.currencyCode.toLowerCase().includes(q),
    );
  }, [arr, search]);

  const stats = useMemo(() => {
    const buy = arr.filter((r) => r.receiptType === 'BUY');
    const sell = arr.filter((r) => r.receiptType === 'SELL');
    const voided = arr.filter((r) => r.status === 'VOIDED' || r.status === 'CANCELLED');
    const total = arr.length;
    const totalTry = arr.reduce((acc, r) => acc + Number(r.tryAmount), 0);
    return { total, buy: buy.length, sell: sell.length, voided: voided.length, totalTry };
  }, [arr]);

  const exportColumns = [
    { key: 'receiptNo' as const, header: 'Fiş No' },
    { key: 'receiptType' as const, header: 'Tür' },
    { key: 'currencyCode' as const, header: 'Döviz' },
    { key: 'foreignAmount' as const, header: 'Tutar' },
    { key: 'rate' as const, header: 'Kur' },
    { key: 'tryAmount' as const, header: 'TRY' },
    { key: 'receiptDate' as const, header: 'Tarih' },
    { key: 'status' as const, header: 'Durum' },
  ];

  const handlePrint = () => {
    const rows = arr
      .map(
        (r) =>
          `<tr><td>${r.receiptNo}</td><td>${new Date(r.receiptDate).toLocaleString('tr-TR')}</td><td>${r.receiptType}</td><td>${r.currencyCode}</td><td>${Number(r.foreignAmount).toFixed(2)}</td><td>${Number(r.rate).toFixed(4)}</td><td>${Number(r.tryAmount).toFixed(2)}</td><td>${r.status}</td></tr>`,
      )
      .join('');
    const html = `<h2>Fiş Listesi Raporu</h2><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Fiş No</th><th>Tarih</th><th>Tür</th><th>Döviz</th><th>Tutar</th><th>Kur</th><th>TRY</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>`;
    printHtml('Fiş Listesi', html);
  };

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <FileText className="h-6 w-6 text-blue-600" />
              Fiş Listesi Raporu
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Tüm vezne fişlerini tarih, durum, döviz ve kullanıcıya göre filtreleyin
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToExcel('fis-listesi', arr as never, exportColumns as never)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToCSV('fis-listesi', arr as never)}
            >
              <FileDown className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Yazdır
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handlePrint}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.total.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam Fiş</div>
              <div className="mt-2 text-xs text-blue-600 font-medium">
                {formatCurrency(stats.totalTry, CurrencyCode.TRY, 'tr')}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <TrendingDown className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.buy.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">ALIŞ İşlemleri</div>
              <div className="mt-2 text-xs text-emerald-600">
                {stats.total ? `%${((stats.buy / stats.total) * 100).toFixed(0)}` : '%0'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                  <TrendingUp className="h-5 w-5 text-rose-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.sell.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">SATIŞ İşlemleri</div>
              <div className="mt-2 text-xs text-rose-600">
                {stats.total ? `%${((stats.sell / stats.total) * 100).toFixed(0)}` : '%0'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <XCircle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.voided.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">İptal Edilen</div>
              <div className="mt-2 text-xs text-amber-600">
                {stats.total ? `%${((stats.voided / stats.total) * 100).toFixed(0)}` : '%0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FILTER CARD */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <Filter className="h-4 w-4 text-blue-600" />
              Filtreler
            </CardTitle>
            <CardDescription>Detaylı raporlama için filtre uygulayın</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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
              <div className="space-y-2">
                <Label>Durum</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white"
                >
                  <option value="">Tümü</option>
                  <option value="POSTED">İşlendi</option>
                  <option value="DRAFT">Taslak</option>
                  <option value="VOIDED">İptal</option>
                  <option value="CORRECTED">Düzeltildi</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Döviz</Label>
                <Input
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={4}
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label>Kullanıcı ID</Label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="UUID"
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DATA TABLE */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  Fiş Listesi
                </CardTitle>
                <CardDescription>
                  {filtered.length} / {stats.total} fiş listeleniyor
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Fiş No veya Kullanıcı ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-64 bg-gray-50 pl-9"
                />
              </div>
            </div>
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
                      Fiş No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Şube
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Tür
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Döviz
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Tutar
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Kur
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      TRY
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-sm text-gray-400"
                      >
                        Filtreye uyan fiş yok
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const sBadge = statusVariant[r.status] ?? {
                        label: r.status,
                        classes: 'bg-gray-100 text-gray-700',
                      };
                      return (
                        <tr
                          key={r.id}
                          className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {r.receiptNo}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                            {formatDateTime(r.receiptDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                            {r.branch?.code ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            {r.receiptType === 'BUY' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <TrendingDown className="h-3 w-3" />
                                ALIŞ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                <TrendingUp className="h-3 w-3" />
                                SATIŞ
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 font-mono text-xs font-semibold dark:border-slate-700">
                              {r.currencyCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-medium text-gray-900 dark:text-slate-100">
                            {Number(r.foreignAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-gray-600 dark:text-slate-400">
                            {Number(r.rate).toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {formatCurrency(Number(r.tryAmount), CurrencyCode.TRY, 'tr')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sBadge.classes}`}
                            >
                              {sBadge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
