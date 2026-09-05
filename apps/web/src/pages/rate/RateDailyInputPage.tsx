import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  TrendingUp,
  TrendingDown,
  Calculator,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface CurrencyRow {
  currency: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  buySpread: number;
  sellSpread: number;
  buyRate: number | null;
  sellRate: number | null;
  effectiveAt: string | null;
  lastUpdateHoursAgo: number | null;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

const inputClass =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100';

const numberInputClass =
  'w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function RateDailyInputPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userDefaultBranch = useAuthStore((s) => s.user?.defaultBranchId);
  const userPermissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canUpdate =
    useAuthStore((s) => s.user?.roleCode) === 'ADMIN' ||
    userPermissions.includes('rate.update');

  const [branchId, setBranchId] = useState<string>('');
  const [rateType, setRateType] = useState<'FREE' | 'RAW_FREE'>('FREE');
  const [rows, setRows] = useState<CurrencyRow[]>([]);
  const [filter, setFilter] = useState('');
  const [bulkPercent, setBulkPercent] = useState<number>(0);
  const [bulkCurrencies, setBulkCurrencies] = useState<string[] | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Şubeler
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-list'],
    queryFn: async () => (await api.get('/branches')).data,
  });

  // İlk açılışta varsayılan şubeyi seç
  useEffect(() => {
    if (branchId || branches.length === 0) return;
    const def =
      branches.find((b) => b.code === 'MAIN') ?? branches[0];
    if (def) setBranchId(def.id);
  }, [branches, branchId]);

  // Şube veya kur tipi değişince son kurları çek
  const {
    data: latest = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['latest-for-input', branchId, rateType],
    enabled: !!branchId,
    queryFn: async () =>
      (
        await api.get(
          `/exchange-rates/latest-for-input/${branchId}?rateType=${rateType}`,
        )
      ).data as CurrencyRow[],
  });

  useEffect(() => {
    setRows(latest);
  }, [latest]);

  function updateRow(
    currency: string,
    field: 'buyRate' | 'sellRate',
    value: number,
  ) {
    setRows((prev) =>
      prev.map((r) => (r.currency === currency ? { ...r, [field]: value } : r)),
    );
  }

  function applyBulkPercent() {
    if (bulkPercent === 0) {
      toast.info('Yüzde 0 — bir değişiklik uygulanmadı');
      return;
    }
    const factor = 1 + bulkPercent / 100;
    const targets = bulkCurrencies && bulkCurrencies.length > 0
      ? new Set(bulkCurrencies)
      : null;
    setRows((prev) =>
      prev.map((r) => {
        if (targets && !targets.has(r.currency)) return r;
        return {
          ...r,
          buyRate: r.buyRate
            ? Number((Number(r.buyRate) * factor).toFixed(6))
            : r.buyRate,
          sellRate: r.sellRate
            ? Number((Number(r.sellRate) * factor).toFixed(6))
            : r.sellRate,
        };
      }),
    );
    toast.success(
      `%${bulkPercent} ${
        targets ? `${targets.size} para için` : 'tüm kurlara'
      } uygulandı (önizleme)`,
    );
  }

  function applyAutoSpread(currency: string) {
    const row = rows.find((r) => r.currency === currency);
    if (!row) return;
    const buy = Number(row.buyRate ?? 0);
    const sell = Number(row.sellRate ?? 0);
    if (!buy || !sell) return;
    const mid = (buy + sell) / 2;
    const buySpread = Number(row.buySpread ?? 0);
    const sellSpread = Number(row.sellSpread ?? 0);
    const newBuy = mid * (1 - buySpread / 100);
    const newSell = mid * (1 + sellSpread / 100);
    setRows((prev) =>
      prev.map((r) =>
        r.currency === currency
          ? {
              ...r,
              buyRate: Number(newBuy.toFixed(6)),
              sellRate: Number(newSell.toFixed(6)),
            }
          : r,
      ),
    );
    toast.success(`${currency}: spread otomatik uygulandı`);
  }

  function fillFromLatest(currency: string) {
    const latestRow = latest.find((r) => r.currency === currency);
    if (!latestRow || latestRow.buyRate === null || latestRow.sellRate === null) {
      toast.error(`${currency} için mevcut kur yok`);
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.currency === currency
          ? { ...r, buyRate: latestRow.buyRate, sellRate: latestRow.sellRate }
          : r,
      ),
    );
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      branchId: string;
      rateType: 'FREE' | 'RAW_FREE';
      rates: Array<{ currency: string; buyRate: number; sellRate: number }>;
    }) => (await api.post('/exchange-rates/daily-input', payload)).data,
    onSuccess: (data: { updated: number }) => {
      setLastSaved(new Date().toLocaleTimeString('tr-TR'));
      toast.success(`${data.updated} kur güncellendi`);
      queryClient.invalidateQueries({
        queryKey: ['latest-for-input', branchId, rateType],
      });
      queryClient.invalidateQueries({ queryKey: ['current-rates', branchId] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? 'Giriş başarısız',
      );
    },
  });

  const bulkAdjustMutation = useMutation({
    mutationFn: async (payload: {
      branchId: string;
      rateType: 'FREE' | 'RAW_FREE';
      percentChange: number;
      currencies?: string[];
    }) => (await api.post('/exchange-rates/bulk-adjust', payload)).data,
    onSuccess: (data: { updated: number; percentChange: number }) => {
      toast.success(
        `${data.updated} kur %${data.percentChange} ile güncellendi`,
      );
      queryClient.invalidateQueries({
        queryKey: ['latest-for-input', branchId, rateType],
      });
      queryClient.invalidateQueries({ queryKey: ['current-rates', branchId] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? 'Bulk adjust başarısız',
      );
    },
  });

  function saveAll() {
    if (!branchId) return;
    const filled = rows.filter(
      (r) =>
        r.buyRate !== null &&
        r.sellRate !== null &&
        Number.isFinite(Number(r.buyRate)) &&
        Number.isFinite(Number(r.sellRate)) &&
        Number(r.buyRate) > 0 &&
        Number(r.sellRate) > 0,
    );
    if (filled.length === 0) {
      toast.warning('En az bir kur doldurmalısınız');
      return;
    }
    saveMutation.mutate({
      branchId,
      rateType,
      rates: filled.map((r) => ({
        currency: r.currency,
        buyRate: Number(r.buyRate),
        sellRate: Number(r.sellRate),
      })),
    });
  }

  function commitBulkAdjust() {
    if (!branchId) return;
    if (bulkPercent === 0) {
      toast.warning('Yüzde 0 — bulk adjust uygulanmaz');
      return;
    }
    const confirm = window.confirm(
      `Şubenin tüm ${rateType} kurları %${bulkPercent} oranında güncellenecek. Onaylıyor musunuz?`,
    );
    if (!confirm) return;
    bulkAdjustMutation.mutate({
      branchId,
      rateType,
      percentChange: bulkPercent,
      currencies:
        bulkCurrencies && bulkCurrencies.length > 0
          ? bulkCurrencies
          : undefined,
    });
  }

  const filteredRows = useMemo(() => {
    if (!filter) return rows;
    const f = filter.toUpperCase();
    return rows.filter(
      (r) => r.currency.includes(f) || r.name.toLowerCase().includes(filter.toLowerCase()),
    );
  }, [rows, filter]);

  const stats = useMemo(() => {
    const filled = rows.filter((r) => r.buyRate && r.sellRate).length;
    const stale = rows.filter(
      (r) => r.lastUpdateHoursAgo !== null && r.lastUpdateHoursAgo > 24,
    ).length;
    const empty = rows.length - filled;
    return { total: rows.length, filled, stale, empty };
  }, [rows]);

  function computeSpread(currency: string) {
    const row = rows.find((r) => r.currency === currency);
    if (!row?.buyRate || !row?.sellRate) return null;
    const buy = Number(row.buyRate);
    const sell = Number(row.sellRate);
    if (!buy || !sell) return null;
    const spread = sell - buy;
    const spreadPct = (spread / buy) * 100;
    return { spread: spread.toFixed(4), spreadPct: spreadPct.toFixed(3) };
  }

  const saving = saveMutation.isPending || bulkAdjustMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('rate.dailyInput', { defaultValue: 'Günlük Piyasa Kuru' })}
        description="Serbest piyasa kurlarını toplu gir veya yüzde ile güncelle"
        icon={Calculator}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={commitBulkAdjust}
              disabled={!canUpdate || saving || bulkPercent === 0}
              title="Tüm kurlara yüzdeyi uygula ve DB'ye yaz"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Bulk % Uygula
            </Button>
            <Button
              onClick={saveAll}
              disabled={!canUpdate || saving || stats.filled === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-premium"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving
                ? 'Kaydediliyor...'
                : `${stats.filled} Kur Kaydet`}
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400 mb-1 block">
                Şube
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className={inputClass}
              >
                <option value="">— seçiniz —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400 mb-1 block">
                Kur Tipi
              </label>
              <select
                value={rateType}
                onChange={(e) =>
                  setRateType(e.target.value as 'FREE' | 'RAW_FREE')
                }
                className={inputClass}
              >
                <option value="FREE">Serbest Piyasa</option>
                <option value="RAW_FREE">Ham Serbest</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400 mb-1 block">
                Filtre
              </label>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Para ara..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400 mb-1 block">
                Bulk Yüzde (±)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(Number(e.target.value))}
                  className={inputClass}
                  placeholder="±%"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="px-3"
                  onClick={applyBulkPercent}
                  title="Önizleme olarak tüm satırlara uygula"
                  disabled={bulkPercent === 0}
                >
                  {bulkPercent > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : bulkPercent < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400 mb-1 block">
                İşlem
              </label>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={!branchId || isRefetching}
                className="w-full"
              >
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Yenile
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4 dark:border-slate-800">
            <Badge variant="outline">
              <strong>{stats.filled}</strong>/{stats.total} kur girildi
            </Badge>
            {stats.empty > 0 && (
              <Badge variant="outline" className="text-red-600 border-red-200">
                {stats.empty} boş
              </Badge>
            )}
            {stats.stale > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <AlertCircle className="mr-1 h-3 w-3" />
                {stats.stale} kur 24 saatten eski
              </Badge>
            )}
            {lastSaved && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Son kayıt: {lastSaved}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ana Tablo */}
      <Card>
        <CardHeader>
          <CardTitle>Piyasa Kurları — {rateType}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!branchId ? (
            <div className="p-12 text-center text-gray-500">
              Önce bir şube seçin.
            </div>
          ) : isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
              Yükleniyor...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                      Para
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300">
                      Son Güncelleme
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300">
                      Alış (Buy)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-slate-300">
                      Spread
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300">
                      Satış (Sell)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-slate-300">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filteredRows.map((row) => {
                    const spreadInfo = computeSpread(row.currency);
                    const isStale =
                      row.lastUpdateHoursAgo !== null &&
                      row.lastUpdateHoursAgo > 24;
                    const hasValue = row.buyRate !== null && row.sellRate !== null;
                    return (
                      <tr
                        key={row.currency}
                        className={
                          isStale ? 'bg-orange-50 dark:bg-orange-950/20' : ''
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900 dark:text-slate-100">
                            {row.currency}
                          </div>
                          <div className="text-xs text-gray-500">{row.name}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">
                          {row.lastUpdateHoursAgo !== null ? (
                            <span
                              className={
                                isStale
                                  ? 'text-orange-600 font-semibold'
                                  : ''
                              }
                            >
                              {row.lastUpdateHoursAgo} saat önce
                            </span>
                          ) : (
                            <span className="text-red-500 font-semibold">
                              Yok
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.0001"
                            value={row.buyRate ?? ''}
                            onChange={(e) =>
                              updateRow(
                                row.currency,
                                'buyRate',
                                Number(e.target.value),
                              )
                            }
                            className={numberInputClass}
                            placeholder="0.0000"
                            disabled={!canUpdate}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {spreadInfo ? (
                            <div className="text-xs">
                              <div className="font-mono">
                                {spreadInfo.spread}
                              </div>
                              <div className="text-gray-500">
                                ({spreadInfo.spreadPct}%)
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.0001"
                            value={row.sellRate ?? ''}
                            onChange={(e) =>
                              updateRow(
                                row.currency,
                                'sellRate',
                                Number(e.target.value),
                              )
                            }
                            className={numberInputClass}
                            placeholder="0.0000"
                            disabled={!canUpdate}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyAutoSpread(row.currency)}
                              title="Spread'i otomatik uygula"
                              disabled={
                                !canUpdate || !row.buyRate || !row.sellRate
                              }
                            >
                              <Calculator className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => fillFromLatest(row.currency)}
                              title="Mevcut kuru geri yükle"
                              disabled={!canUpdate || !hasValue}
                            >
                              ↺
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!canUpdate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertCircle className="inline h-4 w-4 mr-1" />
          Bu sayfada değişiklik yapmak için <code>rate.update</code> yetkisi
          gerekiyor. Sadece görüntüleme modu açık.
        </div>
      )}
    </div>
  );
}
