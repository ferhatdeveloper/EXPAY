import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Printer,
  FileDown,
  Coins,
  PieChart as PieChartIcon,
  TrendingDown,
  CircleDollarSign,
  Filter,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
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
  currency: string;
  buyCount: number;
  sellCount: number;
  totalBuyTry: number;
  totalSellTry: number;
  profit: number;
  grossProfitTry?: number;
}

const PIE_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

export function ProfitabilityReportPage() {
  const branchId = useAuthStore((s) => s.user?.defaultBranchId) ?? '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data = [] } = useQuery({
    queryKey: ['report-profitability', branchId, startDate, endDate],
    queryFn: () =>
      api
        .get('/reports/profitability', { params: { branchId, startDate, endDate } })
        .then((r) => r.data?.items ?? r.data ?? []),
  });

  const arr = data as P[];

  const stats = useMemo(() => {
    const totalProfit = arr.reduce((acc, p) => acc + (p.grossProfitTry ?? p.profit), 0);
    const buyCount = arr.reduce((acc, p) => acc + p.buyCount, 0);
    const sellCount = arr.reduce((acc, p) => acc + p.sellCount, 0);
    const totalBuyTry = arr.reduce((acc, p) => acc + p.totalBuyTry, 0);
    const totalSellTry = arr.reduce((acc, p) => acc + p.totalSellTry, 0);
    const spreadRevenue = totalBuyTry + totalSellTry;
    return { totalProfit, buyCount, sellCount, totalBuyTry, totalSellTry, spreadRevenue };
  }, [arr]);

  const pieData = useMemo(() => {
    return arr
      .filter((p) => p.profit > 0)
      .slice(0, 8)
      .map((p) => ({ name: p.currency, value: Math.max(Number(p.profit.toFixed(2)), 0) }));
  }, [arr]);

  const exportColumns = [
    { key: 'currency' as const, header: 'Döviz' },
    { key: 'buyCount' as const, header: 'ALIŞ' },
    { key: 'sellCount' as const, header: 'SATIŞ' },
    { key: 'totalBuyTry' as const, header: 'ALIŞ TRY' },
    { key: 'totalSellTry' as const, header: 'SATIŞ TRY' },
    { key: 'profit' as const, header: 'Kâr' },
  ];

  const handlePrint = () => {
    const rows = arr
      .map(
        (r) =>
          `<tr><td>${r.currency}</td><td>${r.buyCount}</td><td>${r.sellCount}</td><td>${r.totalBuyTry.toFixed(2)}</td><td>${r.totalSellTry.toFixed(2)}</td><td>${(r.grossProfitTry ?? r.profit).toFixed(2)}</td></tr>`,
      )
      .join('');
    const html = `<h2>Kârlılık Raporu</h2><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Döviz</th><th>ALIŞ</th><th>SATIŞ</th><th>ALIŞ TRY</th><th>SATIŞ TRY</th><th>Kâr</th></tr></thead><tbody>${rows}</tbody></table>`;
    printHtml('Kârlılık Raporu', html);
  };

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Kârlılık Raporu
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Döviz bazında brüt kâr, ALIŞ/SATIŞ sayıları ve spread geliri analizi
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() =>
                exportToExcel('karlilik', arr as never, exportColumns as never)
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToCSV('karlilik', arr as never)}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <Coins className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.totalProfit, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Brüt Kâr</div>
              <div className="mt-2 text-xs text-emerald-600">{arr.length} döviz</div>
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
                {stats.buyCount.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">ALIŞ İşlemleri</div>
              <div className="mt-2 text-xs text-emerald-600">
                {formatCurrency(stats.totalBuyTry, CurrencyCode.TRY, 'tr')}
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
                {stats.sellCount.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">SATIŞ İşlemleri</div>
              <div className="mt-2 text-xs text-rose-600">
                {formatCurrency(stats.totalSellTry, CurrencyCode.TRY, 'tr')}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                  <CircleDollarSign className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(stats.spreadRevenue, CurrencyCode.TRY, 'tr')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Spread Geliri</div>
              <div className="mt-2 text-xs text-violet-600">ALIŞ + SATIŞ TRY</div>
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
            <CardDescription>Tarih aralığı filtresi</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        {/* TABLE + PIE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <CardHeader className="border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Döviz Bazlı Kârlılık
              </CardTitle>
              <CardDescription>{arr.length} döviz listeleniyor</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              {arr.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-400">
                  Bu dönemde kârlılık verisi yok
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                        Döviz
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        ALIŞ
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        SATIŞ
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        ALIŞ TRY
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        SATIŞ TRY
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        Kâr
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {arr.map((r) => {
                      const profit = r.grossProfitTry ?? r.profit;
                      return (
                        <tr
                          key={r.currency}
                          className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-xs font-bold text-white">
                                {r.currency.slice(0, 3)}
                              </div>
                              <span className="font-mono font-semibold text-gray-900 dark:text-slate-100">
                                {r.currency}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <TrendingDown className="h-3 w-3" />
                              {r.buyCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                              <TrendingUp className="h-3 w-3" />
                              {r.sellCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-slate-300">
                            {formatCurrency(r.totalBuyTry, CurrencyCode.TRY, 'tr')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-slate-300">
                            {formatCurrency(r.totalSellTry, CurrencyCode.TRY, 'tr')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-mono font-semibold ${
                                profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {formatCurrency(profit, CurrencyCode.TRY, 'tr')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                <PieChartIcon className="h-4 w-4 text-blue-600" />
                Kâr Dağılımı
              </CardTitle>
              <CardDescription>Dövize göre kâr payı</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-72">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={(e: { name: string }) => e.name}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                        }}
                        formatter={(v: number) =>
                          formatCurrency(v, CurrencyCode.TRY, 'tr')
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    Veri yok
                  </div>
                )}
              </div>
              {pieData.length > 0 && (
                <div className="mt-4 space-y-2">
                  {pieData.map((d, i) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="font-medium text-gray-700 dark:text-slate-300">
                          {d.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-gray-900 dark:text-slate-100">
                        {formatCurrency(d.value, CurrencyCode.TRY, 'tr')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
