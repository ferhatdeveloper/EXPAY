import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  FileText,
  FileSpreadsheet,
  Printer,
  FileDown,
  UserCheck,
  Activity,
  Coins,
  Filter,
  Search,
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

interface P {
  id: string;
  userId: string;
  fullName: string;
  username?: string;
  vezneCode?: string;
  transactionCount: number;
  totalVolume: number;
  grossProfit: number;
}

export function PersonnelReportPage() {
  const branchId = useAuthStore((s) => s.user?.defaultBranchId) ?? '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['report-personnel', branchId, startDate, endDate, userId],
    queryFn: () =>
      api
        .get('/reports/personnel', {
          params: { branchId, startDate, endDate, userId: userId || undefined },
        })
        .then((r) => r.data?.items ?? r.data ?? []),
  });

  const arr = items as P[];

  const filtered = useMemo(() => {
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.username ?? '').toLowerCase().includes(q) ||
        (p.vezneCode ?? '').toLowerCase().includes(q),
    );
  }, [arr, search]);

  const stats = useMemo(() => {
    const total = arr.length;
    const totalTransactions = arr.reduce((acc, p) => acc + p.transactionCount, 0);
    const totalVolume = arr.reduce((acc, p) => acc + p.totalVolume, 0);
    const mostActive = [...arr].sort((a, b) => b.transactionCount - a.transactionCount)[0];
    return { total, totalTransactions, totalVolume, mostActive };
  }, [arr]);

  const exportColumns = [
    { key: 'fullName' as const, header: 'Personel' },
    { key: 'vezneCode' as const, header: 'Vezne' },
    { key: 'transactionCount' as const, header: 'İşlem Sayısı' },
    { key: 'totalVolume' as const, header: 'Toplam Hacim' },
    { key: 'grossProfit' as const, header: 'Brüt Kâr' },
  ];

  const handlePrint = () => {
    const rows = filtered
      .map(
        (p) =>
          `<tr><td>${p.fullName}</td><td>${p.vezneCode ?? '-'}</td><td>${p.transactionCount}</td><td>${p.totalVolume.toFixed(2)}</td><td>${p.grossProfit.toFixed(2)}</td></tr>`,
      )
      .join('');
    const html = `<h2>Personel Raporu</h2><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Personel</th><th>Vezne</th><th>İşlem</th><th>Hacim</th><th>Brüt Kâr</th></tr></thead><tbody>${rows}</tbody></table>`;
    printHtml('Personel', html);
  };

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <Users className="h-6 w-6 text-blue-600" />
              Personel Raporu
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Kullanıcı performansı, vezne bazlı işlem hacmi ve kârlılık
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() =>
                exportToExcel('personel-raporu', filtered as never, exportColumns as never)
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToCSV('personel-raporu', filtered as never)}
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

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.total.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam Kullanıcı</div>
              <div className="mt-2 text-xs text-blue-600">Aktif personel</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.mostActive?.fullName ?? '—'}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">En Aktif Personel</div>
              <div className="mt-2 text-xs text-emerald-600">
                {stats.mostActive
                  ? `${stats.mostActive.transactionCount} işlem`
                  : 'Veri yok'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                  <Activity className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.totalTransactions.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam İşlem</div>
              <div className="mt-2 text-xs text-violet-600">
                {formatCurrency(stats.totalVolume, CurrencyCode.TRY, 'tr')} hacim
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FILTERS */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <Filter className="h-4 w-4 text-blue-600" />
              Filtreler
            </CardTitle>
            <CardDescription>Tarih ve personel filtresi</CardDescription>
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

        {/* TABLE */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                  <Coins className="h-4 w-4 text-blue-600" />
                  Personel Performansı
                </CardTitle>
                <CardDescription>{filtered.length} personelin özeti</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Personel ara..."
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
                      Kullanıcı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Vezne
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      İşlem Sayısı
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Toplam Hacim
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Brüt Kâr
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-sm text-gray-400"
                      >
                        Filtreye uyan personel yok
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                              {p.fullName
                                .split(' ')
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                {p.fullName}
                              </div>
                              {p.username && (
                                <div className="font-mono text-xs text-gray-500">
                                  @{p.username}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.vezneCode ? (
                            <span className="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 font-mono text-xs font-semibold dark:border-slate-700">
                              {p.vezneCode}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {p.transactionCount.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-slate-300">
                          {formatCurrency(p.totalVolume, CurrencyCode.TRY, 'tr')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-600">
                          {formatCurrency(p.grossProfit, CurrencyCode.TRY, 'tr')}
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
