import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  FileText,
  FileSpreadsheet,
  Printer,
  FileDown,
  Receipt,
  TrendingUp,
  TrendingDown,
  Coins,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { exportToCSV, exportToExcel, printHtml } from '@/components/shared/exporters';
import { formatCurrency } from '@/lib/format';
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

interface DayDetailItem {
  id: string;
  receiptNo: string;
  receiptType: 'BUY' | 'SELL';
  currencyCode: string;
  foreignAmount: string;
  rate: string;
  tryAmount: string;
  receiptDate: string;
  user?: { fullName: string };
}

interface DayGroup {
  date: string;
  count: number;
  totalTry: number;
  totalForeign: number;
  items: DayDetailItem[];
}

export function DailyDetailReportPage() {
  const branchId = useAuthStore((s) => s.user?.defaultBranchId) ?? '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['report-daily-detail', branchId, startDate, endDate, userId],
    queryFn: () =>
      api
        .get('/reports/daily-detail', {
          params: { branchId, startDate, endDate, userId: userId || undefined },
        })
        .then((r) => r.data?.items ?? r.data ?? []),
  });

  const arr = groups as DayGroup[];

  const stats = useMemo(() => {
    let totalCount = 0;
    let totalTry = 0;
    let totalForeign = 0;
    let buyCount = 0;
    let sellCount = 0;
    let grossProfit = 0;
    let commission = 0;

    arr.forEach((g) => {
      totalCount += g.count;
      totalTry += g.totalTry;
      totalForeign += g.totalForeign;
      g.items.forEach((i) => {
        if (i.receiptType === 'BUY') buyCount++;
        else if (i.receiptType === 'SELL') {
          sellCount++;
          grossProfit += Number(i.tryAmount) * 0.005;
          commission += Number(i.tryAmount) * 0.002;
        }
      });
    });

    return { totalCount, totalTry, totalForeign, buyCount, sellCount, grossProfit, commission };
  }, [arr]);

  const flatItems = useMemo(() => {
    const out: Array<Record<string, unknown>> = [];
    arr.forEach((g) => {
      g.items.forEach((i) => {
        out.push({
          date: g.date,
          receiptNo: i.receiptNo,
          type: i.receiptType,
          currency: i.currencyCode,
          foreignAmount: i.foreignAmount,
          rate: i.rate,
          tryAmount: i.tryAmount,
          time: i.receiptDate,
          user: i.user?.fullName ?? '',
        });
      });
    });
    return out;
  }, [arr]);

  const exportColumns = [
    { key: 'date' as const, header: 'Tarih' },
    { key: 'receiptNo' as const, header: 'Fiş No' },
    { key: 'type' as const, header: 'Tip' },
    { key: 'currency' as const, header: 'Döviz' },
    { key: 'foreignAmount' as const, header: 'Miktar' },
    { key: 'rate' as const, header: 'Kur' },
    { key: 'tryAmount' as const, header: 'TRY' },
    { key: 'time' as const, header: 'Zaman' },
  ];

  const handlePrint = () => {
    const rows = flatItems
      .map(
        (r) =>
          `<tr><td>${String(r.date)}</td><td>${String(r.receiptNo)}</td><td>${String(r.type)}</td><td>${String(r.currency)}</td><td>${String(r.foreignAmount)}</td><td>${String(r.rate)}</td><td>${String(r.tryAmount)}</td></tr>`,
      )
      .join('');
    const html = `<h2>Günlük Detay Raporu</h2><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Tarih</th><th>Fiş No</th><th>Tip</th><th>Döviz</th><th>Miktar</th><th>Kur</th><th>TRY</th></tr></thead><tbody>${rows}</tbody></table>`;
    printHtml('Günlük Detay', html);
  };

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <CalendarDays className="h-6 w-6 text-blue-600" />
              Günlük Detay Raporu
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Tarihe göre gruplanmış işlem detayları — günü tıklayarak detayları açın
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToExcel('gunluk-detay', flatItems as never, exportColumns as never)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToCSV('gunluk-detay', flatItems as never)}
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.totalCount.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam İşlem</div>
              <div className="mt-2 text-xs text-blue-600 font-medium">{arr.length} gün</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <Coins className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.grossProfit, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Brüt Kâr</div>
              <div className="mt-2 text-xs text-emerald-600">Spread geliri</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                  <Coins className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.commission, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Komisyon</div>
              <div className="mt-2 text-xs text-violet-600">Hesaplanan</div>
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
            <CardDescription>Tarih aralığı ve kullanıcı filtresi</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

        {/* EXPANDABLE GROUPS */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Günlük Özet
            </CardTitle>
            <CardDescription>
              {arr.length} gün, {stats.totalCount} işlem — detay için tıklayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 w-full animate-pulse rounded bg-gray-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : arr.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                Filtreye uyan gün yok
              </div>
            ) : (
              arr.map((g) => {
                const isOpen = expandedDate === g.date;
                return (
                  <div
                    key={g.date}
                    className="rounded-lg border border-gray-200 dark:border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDate(isOpen ? null : g.date)}
                      className="flex w-full items-center justify-between gap-3 rounded-t-lg bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {g.date}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {g.count} fiş
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-xs text-gray-500">Yabancı: </span>
                          <span className="font-mono font-medium">
                            {g.totalForeign.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">TRY: </span>
                          <span className="font-mono font-semibold text-gray-900 dark:text-slate-100">
                            {formatCurrency(g.totalTry, CurrencyCode.TRY, 'tr')}
                          </span>
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="overflow-x-auto border-t border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-800">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                Zaman
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                Fiş No
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                Tip
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                Döviz
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Miktar
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Kur
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                TRY
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                Kullanıcı
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.items.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="px-4 py-6 text-center text-sm text-gray-400"
                                >
                                  Bu günde işlem yok
                                </td>
                              </tr>
                            ) : (
                              g.items.map((i) => (
                                <tr
                                  key={i.id}
                                  className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                                >
                                  <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-slate-400">
                                    {new Date(i.receiptDate).toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-sm font-medium text-gray-900 dark:text-slate-100">
                                    {i.receiptNo}
                                  </td>
                                  <td className="px-4 py-2">
                                    {i.receiptType === 'BUY' ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        <TrendingDown className="h-3 w-3" />A
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                        <TrendingUp className="h-3 w-3" />S
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 font-mono text-xs font-semibold dark:border-slate-700">
                                      {i.currencyCode}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-sm">
                                    {Number(i.foreignAmount).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-sm text-gray-600">
                                    {Number(i.rate).toFixed(4)}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-sm font-semibold">
                                    {formatCurrency(Number(i.tryAmount), CurrencyCode.TRY, 'tr')}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300">
                                    {i.user?.fullName ?? '—'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
