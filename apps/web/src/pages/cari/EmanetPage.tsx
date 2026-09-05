import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Plus,
  RefreshCw,
  Eye,
  ArrowDownToLine,
  Search,
  Coins,
  Scale,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShell } from '@/components/ui/page-shell';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatNumber, formatDate } from '@/lib/format';

interface EmanetItem {
  id: string;
  referenceNo: string;
  customerId: string;
  customer?: { id: string; code?: string; fullName: string };
  branchId: string;
  branch?: { code: string; name: string };
  currency: string;
  kind: 'CURRENCY' | 'PRECIOUS_METAL';
  metalType?: string | null;
  initialAmount: string;
  currentAmount: string;
  entryTRYEquivalent: string;
  currentTRYEquivalent?: string | null;
  storageLocation?: string | null;
  vaultNumber?: string | null;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'FORFEIT';
  openedAt: string;
  closedAt?: string | null;
  description?: string | null;
  opener?: { id: string; fullName: string; username: string };
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

const STATUS_TONE: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Açık', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  PARTIAL: { label: 'Kısmi', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  CLOSED: { label: 'Kapalı', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  FORFEIT: { label: 'Müsadere', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export function EmanetPage() {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.defaultBranchId;
  const navigate = useNavigate();

  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [search, setSearch] = useState('');

  const branchesQ = useQuery({
    queryKey: ['branches-all'],
    queryFn: () => api.get('/branches').then((r) => (Array.isArray(r.data) ? r.data : r.data?.items ?? []) as Branch[]),
  });

  const emanetQ = useQuery({
    queryKey: ['emanet', branchId],
    queryFn: () =>
      api.get('/emanet', { params: { branchId } }).then((r) => (Array.isArray(r.data) ? r.data : []) as EmanetItem[]),
    enabled: !!branchId,
  });

  const items = emanetQ.data ?? [];
  const branches = branchesQ.data ?? [];

  const filtered = useMemo(() => {
    return items.filter((e) => {
      if (filterBranch !== 'all' && e.branchId !== filterBranch) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterCurrency !== 'all' && e.currency !== filterCurrency) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !e.referenceNo.toLowerCase().includes(s) &&
          !(e.customer?.fullName ?? '').toLowerCase().includes(s) &&
          !e.currency.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, filterBranch, filterStatus, filterCurrency, search]);

  const stats = useMemo(() => {
    const total = items.length;
    const open = items.filter((e) => e.status === 'OPEN' || e.status === 'PARTIAL').length;
    const closed = items.filter((e) => e.status === 'CLOSED').length;
    const openTRY = items
      .filter((e) => e.status === 'OPEN' || e.status === 'PARTIAL')
      .reduce((sum, e) => {
        const ratio = Number(e.currentAmount) / Number(e.initialAmount || 1);
        return sum + Number(e.entryTRYEquivalent) * ratio;
      }, 0);
    const today = new Date().toDateString();
    const todayOpened = items.filter((e) => new Date(e.openedAt).toDateString() === today).length;
    return { total, open, closed, openTRY, todayOpened };
  }, [items]);

  const currencies = useMemo(() => {
    const set = new Set(items.map((e) => e.currency));
    return Array.from(set).sort();
  }, [items]);

  return (
    <PageShell>
      <PageHeader
        title="Emanet (Trust / Custody)"
        description="Müşteri emanetlerini yönetin — döviz ve kıymetli maden"
        icon={Box}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => emanetQ.refetch()}
              disabled={emanetQ.isFetching}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${emanetQ.isFetching ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            <Button
              onClick={() => navigate('/cari/emanet/new')}
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Emanet
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Emanet"
          value={stats.total.toString()}
          icon={<Box className="h-5 w-5" />}
          tone="blue"
          sublabel="Tüm zamanlar"
        />
        <StatCard
          title="Açık Emanet"
          value={stats.open.toString()}
          icon={<Clock className="h-5 w-5" />}
          tone="orange"
          sublabel="OPEN + PARTIAL"
        />
        <StatCard
          title="Açık TRY Değeri"
          value={formatNumber(stats.openTRY, "tr", 2)}
          icon={<Coins className="h-5 w-5" />}
          tone="green"
          sublabel="Anlık piyasa kuru ile"
        />
        <StatCard
          title="Bugün Açılan"
          value={stats.todayOpened.toString()}
          icon={<Calendar className="h-5 w-5" />}
          tone="purple"
          sublabel={formatDate(new Date())}
        />
      </div>

      <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Şube</Label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
              >
                <option value="all">Tüm Şubeler</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Durum</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
              >
                <option value="all">Tümü</option>
                <option value="OPEN">Açık</option>
                <option value="PARTIAL">Kısmi İade</option>
                <option value="CLOSED">Kapalı</option>
                <option value="FORFEIT">Müsadere</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Currency</Label>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
              >
                <option value="all">Tümü</option>
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 dark:text-slate-400">Arama</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Ref No / Müşteri / Currency"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
        <CardHeader className="p-4 border-b border-gray-200 dark:border-slate-800">
          <CardTitle className="flex items-center justify-between text-base text-gray-900 dark:text-slate-50">
            <span className="flex items-center gap-2">
              <Box className="h-5 w-5 text-blue-600" />
              Emanet Listesi
            </span>
            <Badge variant="outline" className="font-mono">
              {filtered.length} / {items.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {emanetQ.isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="Emanet bulunamadı" description="Yeni emanet açarak başlayın" icon={Box} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 dark:bg-slate-900/40 dark:border-slate-800">
                    <th className="px-4 py-3 text-left text-xs text-gray-600 dark:text-slate-400">Referans No</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 dark:text-slate-400">Müşteri</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 dark:text-slate-400">Şube</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 dark:text-slate-400">Tür</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-600 dark:text-slate-400">Başlangıç</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-600 dark:text-slate-400">Kalan</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-600 dark:text-slate-400">Başlangıç TRY</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 dark:text-slate-400">Açılış</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-600 dark:text-slate-400">Durum</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-600 dark:text-slate-400">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const tone = STATUS_TONE[e.status] ?? STATUS_TONE.OPEN;
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/cari/emanet/${e.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-sm font-medium text-blue-700 dark:text-blue-300">
                          {e.referenceNo}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-50">
                          {e.customer?.fullName ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">
                          {e.branch?.code ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          {e.kind === 'PRECIOUS_METAL' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                              <Scale className="h-3 w-3" />
                              {e.metalType ?? 'XAU'}
                            </span>
                          ) : (
                            <span className="font-mono text-sm text-gray-700 dark:text-slate-300">{e.currency}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-slate-300">
                          {formatNumber(Number(e.initialAmount), "tr", 4)} {e.currency}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-gray-900 dark:text-slate-50">
                          {formatNumber(Number(e.currentAmount), "tr", 4)} {e.currency}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-slate-300">
                          {formatNumber(Number(e.entryTRYEquivalent), "tr", 2)} ₺
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">
                          {formatDate(e.openedAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${tone.cls}`}
                          >
                            {e.status === 'OPEN' && <Clock className="w-3 h-3" />}
                            {e.status === 'PARTIAL' && <ArrowDownToLine className="w-3 h-3" />}
                            {e.status === 'CLOSED' && <CheckCircle2 className="w-3 h-3" />}
                            {e.status === 'FORFEIT' && <Lock className="w-3 h-3" />}
                            {tone.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                navigate(`/cari/emanet/${e.id}`);
                              }}
                              className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
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
    </PageShell>
  );
}

export default EmanetPage;
