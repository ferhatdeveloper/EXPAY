import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Calculator,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Wallet,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Lock,
  PieChart as PieIcon,
  Edit,
  Eye,
  Power,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
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
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';
import { api } from '@/lib/api';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE' | string;
  parentId?: string | null;
  parent?: { code: string; name: string } | null;
  balance?: string | number;
  active: boolean;
  isSystem?: boolean;
}

const TYPE_META: Record<string, { label: string; tone: string; bg: string }> = {
  ASSET: { label: 'VARLIK', tone: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  LIABILITY: { label: 'BORÇ', tone: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-900/40' },
  EQUITY: { label: 'SERMAYE', tone: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  INCOME: { label: 'GELİR', tone: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  EXPENSE: { label: 'GİDER', tone: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
};

const PIE_COLORS: Record<string, string> = {
  ASSET: '#2563eb',
  LIABILITY: '#ef4444',
  EQUITY: '#10b981',
  INCOME: '#8b5cf6',
  EXPENSE: '#f59e0b',
};

export function AccountingAccountsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { register, handleSubmit, reset } = useForm<{ code: string; name: string; type: string; parentCode?: string }>({
    defaultValues: { type: 'ASSET' },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => api.get('/accounting/accounts').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) => api.post('/accounting/accounts', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Hesap oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] });
      setShowForm(false);
      reset({ type: 'ASSET' });
    },
  });

  const filtered = useMemo(() => {
    return (items as Account[]).filter((a) => {
      if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
      if (activeFilter === 'ACTIVE' && !a.active) return false;
      if (activeFilter === 'INACTIVE' && a.active) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.code.toLowerCase().includes(q) &&
          !a.name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, typeFilter, activeFilter, search]);

  const stats = useMemo(() => {
    const list = items as Account[];
    const total = list.length;
    const active = list.filter((a) => a.active).length;
    const inactive = list.filter((a) => !a.active).length;
    const system = list.filter((a) => a.isSystem).length;
    return { total, active, inactive, system };
  }, [items]);

  const pieData = useMemo(() => {
    const list = items as Account[];
    const counts: Record<string, number> = {};
    for (const a of list) {
      counts[a.type] = (counts[a.type] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, value]) => ({
      name: TYPE_META[type]?.label ?? type,
      code: type,
      value,
    }));
  }, [items]);

  const toggleExpand = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const columns: Column<Account>[] = [
    {
      key: 'code',
      header: 'Kod',
      width: '120px',
      render: (a) => (
        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
          {a.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Hesap Adı',
      render: (a) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleExpand(a.id)}
            className="text-slate-400 hover:text-slate-700"
          >
            {expanded[a.id] ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {a.name}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tip',
      render: (a) => {
        const meta = TYPE_META[a.type];
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              meta?.bg,
              meta?.tone,
            )}
          >
            {meta?.label ?? a.type}
          </span>
        );
      },
    },
    {
      key: 'parent',
      header: 'Üst Hesap',
      render: (a) =>
        a.parent ? (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {a.parent.code}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'balance',
      header: 'Bakiye',
      className: 'text-right',
      render: (a) =>
        a.balance != null ? (
          <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatCurrency(Number(a.balance), CurrencyCode.TRY, 'tr')}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'active',
      header: 'Durum',
      render: (a) =>
        a.active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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
        icon={Calculator}
        title="Hesap Planı"
        description="Muhasebe hesap planını yönetin — varlık, borç, sermaye, gelir ve gider hesapları"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Hesap'}
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Toplam Hesap"
          value={stats.total.toLocaleString('tr-TR')}
          icon={<Wallet className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Aktif Hesap"
          value={stats.active.toLocaleString('tr-TR')}
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="emerald"
          trend={{ value: `${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%`, direction: 'up' }}
        />
        <StatCard
          title="Pasif Hesap"
          value={stats.inactive.toLocaleString('tr-TR')}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Sistem Hesapları"
          value={stats.system.toLocaleString('tr-TR')}
          icon={<Lock className="h-5 w-5" />}
          tone="violet"
          sublabel="Değiştirilemez"
        />
      </div>

      {/* FİLTRE BAR + LİSTE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-blue-600" />
                Hesap Listesi
                <Badge variant="outline" className="ml-2 font-mono">
                  {filtered.length}
                </Badge>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Hesap ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-56 pl-7"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                >
                  <option value="ALL">Tüm Tipler</option>
                  <option value="ASSET">Varlık</option>
                  <option value="LIABILITY">Borç</option>
                  <option value="EQUITY">Sermaye</option>
                  <option value="INCOME">Gelir</option>
                  <option value="EXPENSE">Gider</option>
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
                onSubmit={handleSubmit((data) =>
                  create.mutate({ ...data, currencyCode: 'TRY' }),
                )}
                className="grid grid-cols-1 gap-3 md:grid-cols-4"
              >
                <div className="space-y-1.5">
                  <Label>Hesap Kodu</Label>
                  <Input
                    placeholder="100.01"
                    {...register('code', { required: true })}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Hesap Adı</Label>
                  <Input
                    placeholder="Kasa"
                    {...register('name', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tip</Label>
                  <select
                    {...register('type')}
                    className="h-10 w-full rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                  >
                    <option value="ASSET">Varlık</option>
                    <option value="LIABILITY">Borç</option>
                    <option value="EQUITY">Sermaye</option>
                    <option value="INCOME">Gelir</option>
                    <option value="EXPENSE">Gider</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    Hesap Oluştur
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                title="Hesap bulunamadı"
                description="Filtreleri değiştirin veya yeni hesap oluşturun"
                icon={Filter}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filtered}
                rowKey={(a) => a.id}
              />
            )}
          </CardContent>
        </Card>

        {/* PIE CHART */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-violet-600" />
              Hesap Tipi Dağılımı
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Toplam {stats.total} hesap üzerinden
            </p>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyState title="Veri yok" icon={PieIcon} />
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[d.code] ?? '#64748b'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {pieData.map((d) => (
                    <div
                      key={d.code}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[d.code] }}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {d.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {d.value}
                      </span>
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
