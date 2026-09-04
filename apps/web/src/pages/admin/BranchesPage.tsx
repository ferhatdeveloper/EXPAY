import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Globe2,
  Clock,
  CircleDollarSign,
  Percent,
  Power,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { PageShell } from '@/components/ui/page-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';

interface Branch {
  id: string;
  code: string;
  name: string;
  country: 'TR' | 'IQ' | string;
  city?: string;
  timezone: string;
  currencyCode?: string;
  defaultRateSpread?: number;
  active: boolean;
  phone?: string;
  address?: string;
}

interface FormVals {
  code: string;
  name: string;
  country: string;
  city: string;
  timezone: string;
  currencyCode: string;
  defaultRateSpread: number;
  phone: string;
  address: string;
}

const COUNTRY_META: Record<string, { flag: string; label: string; bg: string; tone: string }> = {
  TR: {
    flag: '🇹🇷',
    label: 'Türkiye',
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    tone: 'text-rose-700 dark:text-rose-300',
  },
  IQ: {
    flag: '🇮🇶',
    label: 'Irak',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    tone: 'text-emerald-700 dark:text-emerald-300',
  },
};

const BAR_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function BranchesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const { register, handleSubmit, reset } = useForm<FormVals>({
    defaultValues: {
      code: '',
      name: '',
      country: 'TR',
      city: '',
      timezone: 'Europe/Istanbul',
      currencyCode: 'TRY',
      defaultRateSpread: 0.5,
      phone: '',
      address: '',
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) =>
      api.post('/branches', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Şube oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowForm(false);
      reset();
    },
  });

  const filtered = useMemo(() => {
    return (items as Branch[]).filter((b) => {
      if (countryFilter !== 'ALL' && b.country !== countryFilter) return false;
      if (activeFilter === 'ACTIVE' && !b.active) return false;
      if (activeFilter === 'INACTIVE' && b.active) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !b.code.toLowerCase().includes(q) &&
          !b.name.toLowerCase().includes(q) &&
          !(b.city ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, countryFilter, activeFilter, search]);

  const stats = useMemo(() => {
    const list = items as Branch[];
    return {
      total: list.length,
      tr: list.filter((b) => b.country === 'TR').length,
      iq: list.filter((b) => b.country === 'IQ').length,
      active: list.filter((b) => b.active).length,
    };
  }, [items]);

  // Ülke dağılımı bar chart
  const countryData = useMemo(() => {
    const list = items as Branch[];
    const map = new Map<string, { name: string; count: number; active: number; total: number }>();
    for (const b of list) {
      const key = b.country;
      const cur = map.get(key) ?? { name: COUNTRY_META[key]?.label ?? key, count: 0, active: 0, total: 0 };
      cur.count += 1;
      cur.total += 1;
      if (b.active) cur.active += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries()).map(([k, v]) => ({
      code: k,
      ...v,
    }));
  }, [items]);

  const columns: Column<Branch>[] = [
    {
      key: 'code',
      header: 'Kod',
      render: (b) => (
        <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
          {b.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Şube Adı',
      render: (b) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {b.name}
            </div>
            {b.city && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {b.city}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Ülke',
      render: (b) => {
        const meta = COUNTRY_META[b.country];
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
              meta?.bg,
              meta?.tone,
            )}
          >
            <span className="text-sm">{meta?.flag}</span>
            {meta?.label ?? b.country}
          </span>
        );
      },
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (b) => (
        <div className="flex items-center gap-1 font-mono text-xs text-slate-600 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          {b.timezone}
        </div>
      ),
    },
    {
      key: 'currency',
      header: 'Para Birimi',
      render: (b) =>
        b.currencyCode ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <CircleDollarSign className="h-3 w-3" />
            {b.currencyCode}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'spread',
      header: 'Default Spread',
      className: 'text-right',
      render: (b) =>
        b.defaultRateSpread != null ? (
          <div className="flex items-center justify-end gap-1">
            <Percent className="h-3 w-3 text-slate-400" />
            <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
              {Number(b.defaultRateSpread).toFixed(2)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'active',
      header: 'Aktif',
      render: (b) =>
        b.active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Pasif
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: () => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600">
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={Building2}
        title="Şubeler"
        description="Tüm şubeleri, ülke, zaman dilimi ve kur spread ayarlarını yönetin"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Şube'}
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Toplam Şube"
          value={stats.total.toLocaleString('tr-TR')}
          icon={<Building2 className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="TR Şube"
          value={stats.tr.toLocaleString('tr-TR')}
          icon={<span className="text-base">🇹🇷</span>}
          tone="rose"
        />
        <StatCard
          title="IQ Şube"
          value={stats.iq.toLocaleString('tr-TR')}
          icon={<span className="text-base">🇮🇶</span>}
          tone="emerald"
        />
        <StatCard
          title="Aktif"
          value={stats.active.toLocaleString('tr-TR')}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="violet"
          trend={{
            value: stats.total
              ? `${Math.round((stats.active / stats.total) * 100)}%`
              : '0%',
            direction: 'up',
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-blue-600" />
                Şube Listesi
                <Badge variant="outline" className="ml-2 font-mono">
                  {filtered.length}
                </Badge>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Şube ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-56 pl-7"
                  />
                </div>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                >
                  <option value="ALL">Tüm Ülkeler</option>
                  <option value="TR">🇹🇷 Türkiye</option>
                  <option value="IQ">🇮🇶 Irak</option>
                </select>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
              </div>
            </div>
          </CardHeader>
          {showForm && (
            <CardContent className="border-b bg-slate-50 dark:bg-slate-900/40">
              <form
                onSubmit={handleSubmit((data) => create.mutate(data))}
                className="grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                <div className="space-y-1.5">
                  <Label>Kod</Label>
                  <Input
                    placeholder="IST01"
                    {...register('code', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ad</Label>
                  <Input
                    placeholder="İstanbul Merkez"
                    {...register('name', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ülke</Label>
                  <select
                    {...register('country', { required: true })}
                    className="h-10 w-full rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                  >
                    <option value="TR">🇹🇷 Türkiye</option>
                    <option value="IQ">🇮🇶 Irak</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Şehir</Label>
                  <Input
                    placeholder="İstanbul"
                    {...register('city')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Input
                    placeholder="Europe/Istanbul"
                    {...register('timezone', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Para Birimi</Label>
                  <Input
                    placeholder="TRY"
                    {...register('currencyCode')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Default Spread (%)</Label>
                  <Input
                    type="number"
                    step="any"
                    {...register('defaultRateSpread', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input
                    placeholder="+90 212 ..."
                    {...register('phone')}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Adres</Label>
                  <Input
                    placeholder="Adres"
                    {...register('address')}
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    <Plus className="mr-2 h-4 w-4" /> Şube Oluştur
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                title="Şube bulunamadı"
                description="Filtreleri değiştirin veya yeni şube oluşturun"
                icon={Filter}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filtered}
                rowKey={(b) => b.id}
              />
            )}
          </CardContent>
        </Card>

        {/* COUNTRY BAR */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe2 className="h-4 w-4 text-blue-600" />
              Ülke Dağılımı
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Şube sayısı ve aktiflik oranı
            </p>
          </CardHeader>
          <CardContent>
            {countryData.length === 0 ? (
              <EmptyState title="Veri yok" icon={Globe2} />
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                        }}
                      />
                      <Bar
                        dataKey="count"
                        radius={[6, 6, 0, 0]}
                        name="Şube"
                      >
                        {countryData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={BAR_COLORS[i % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {countryData.map((d, i) => (
                    <div
                      key={d.code}
                      className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                            }}
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {COUNTRY_META[d.code]?.flag} {d.name}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                          {d.count}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={cn(
                            'h-full bg-gradient-to-r',
                            d.code === 'TR'
                              ? 'from-rose-500 to-rose-400'
                              : 'from-emerald-500 to-emerald-400',
                          )}
                          style={{
                            width: `${d.total ? (d.active / d.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {d.active}/{d.total} aktif
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
