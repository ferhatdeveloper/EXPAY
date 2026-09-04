import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  UserX,
  Activity,
  Mail,
  MoreHorizontal,
  Building2,
  Power,
  Edit,
  Eye,
  PieChart as PieIcon,
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
import { Avatar } from '@/components/ui/avatar';
import { StatCard } from '@/components/ui/stat-card';
import { PageShell } from '@/components/ui/page-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  active: boolean;
  lastLoginAt?: string | null;
  role: { id?: string; code: string; name: string };
  branches: Array<{ branch: { id: string; code: string; name: string } }>;
}

interface Role {
  id: string;
  code: string;
  name: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

const ROLE_TONES: Record<string, { label: string; bg: string; tone: string }> = {
  ADMIN: { label: 'Admin', bg: 'bg-violet-100 dark:bg-violet-900/40', tone: 'text-violet-700 dark:text-violet-300' },
  MANAGER: { label: 'Müdür', bg: 'bg-blue-100 dark:bg-blue-900/40', tone: 'text-blue-700 dark:text-blue-300' },
  CASHIER: { label: 'Veznedar', bg: 'bg-emerald-100 dark:bg-emerald-900/40', tone: 'text-emerald-700 dark:text-emerald-300' },
  ACCOUNTANT: { label: 'Muhasebeci', bg: 'bg-amber-100 dark:bg-amber-900/40', tone: 'text-amber-700 dark:text-amber-300' },
};

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { register, handleSubmit, reset } = useForm<{
    username: string;
    fullName: string;
    email: string;
    password: string;
    roleId: string;
    branchIds: string;
  }>({
    defaultValues: { roleId: '', branchIds: '' },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data?.items ?? []),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => api.get('/roles').then((r) => r.data ?? []),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => api.get('/branches').then((r) => r.data ?? []),
  });

  const create = useMutation({
    mutationFn: (data: unknown) =>
      api.post('/users', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Kullanıcı oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      reset();
    },
  });

  const filtered = useMemo(() => {
    return (items as User[]).filter((u) => {
      if (roleFilter !== 'ALL' && u.role?.code !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.active) return false;
      if (statusFilter === 'INACTIVE' && u.active) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !u.username.toLowerCase().includes(q) &&
          !u.fullName.toLowerCase().includes(q) &&
          !(u.email ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, roleFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const list = items as User[];
    const active = list.filter((u) => u.active).length;
    const inactive = list.filter((u) => !u.active).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogins = list.filter((u) => {
      if (!u.lastLoginAt) return false;
      return new Date(u.lastLoginAt) >= today;
    }).length;
    return { total: list.length, active, inactive, todayLogins };
  }, [items]);

  const pieData = useMemo(() => {
    const list = items as User[];
    const counts: Record<string, number> = {};
    for (const u of list) {
      const code = u.role?.code ?? 'OTHER';
      counts[code] = (counts[code] ?? 0) + 1;
    }
    return Object.entries(counts).map(([code, value]) => ({
      name: ROLE_TONES[code]?.label ?? code,
      code,
      value,
    }));
  }, [items]);

  const columns: Column<User>[] = [
    {
      key: 'username',
      header: 'Kullanıcı',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={u.fullName} />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {u.fullName}
            </div>
            <div className="font-mono text-xs text-slate-500">@{u.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Eposta',
      render: (u) =>
        u.email ? (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <Mail className="h-3 w-3" />
            {u.email}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (u) => {
        const meta = ROLE_TONES[u.role?.code];
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              meta?.bg,
              meta?.tone,
            )}
          >
            {meta?.label ?? u.role?.code ?? '—'}
          </span>
        );
      },
    },
    {
      key: 'branches',
      header: 'Şubeler',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.branches.length === 0 ? (
            <span className="text-xs text-slate-400">—</span>
          ) : (
            u.branches.slice(0, 3).map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                <Building2 className="h-2.5 w-2.5" />
                {b.branch.code}
              </span>
            ))
          )}
          {u.branches.length > 3 && (
            <span className="text-[10px] text-slate-500">
              +{u.branches.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Son Giriş',
      render: (u) =>
        u.lastLoginAt ? (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {new Date(u.lastLoginAt).toLocaleString('tr-TR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Hiç girmedi</span>
        ),
    },
    {
      key: 'active',
      header: 'Aktif',
      render: (u) =>
        u.active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
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
        icon={Users}
        title="Kullanıcılar"
        description="Sistem kullanıcılarını, rolleri ve şube atamalarını yönetin"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Kullanıcı'}
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Toplam Kullanıcı"
          value={stats.total.toLocaleString('tr-TR')}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Aktif"
          value={stats.active.toLocaleString('tr-TR')}
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
          trend={{
            value: stats.total
              ? `${Math.round((stats.active / stats.total) * 100)}%`
              : '0%',
            direction: 'up',
          }}
        />
        <StatCard
          title="Pasif"
          value={stats.inactive.toLocaleString('tr-TR')}
          icon={<UserX className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Bugün Giriş"
          value={stats.todayLogins.toLocaleString('tr-TR')}
          icon={<Activity className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      {/* FİLTRE + LİSTE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-600" />
                Kullanıcı Listesi
                <Badge variant="outline" className="ml-2 font-mono">
                  {filtered.length}
                </Badge>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Kullanıcı ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-56 pl-7"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                >
                  <option value="ALL">Tüm Roller</option>
                  {(roles as Role[]).map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                onSubmit={handleSubmit((data) => {
                  const branchIds = data.branchIds
                    ? data.branchIds.split(',').filter(Boolean)
                    : [];
                  create.mutate({ ...data, branchIds });
                })}
                className="grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                <div className="space-y-1.5">
                  <Label>Kullanıcı Adı</Label>
                  <Input
                    placeholder="kullanici.adi"
                    {...register('username', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ad Soyad</Label>
                  <Input
                    placeholder="Ad Soyad"
                    {...register('fullName', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Eposta</Label>
                  <Input
                    type="email"
                    placeholder="ornek@firma.com"
                    {...register('email')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Şifre</Label>
                  <Input
                    type="password"
                    {...register('password', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <select
                    {...register('roleId', { required: true })}
                    className="h-10 w-full rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                  >
                    <option value="">Rol seçin...</option>
                    {(roles as Role[]).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Şubeler (virgülle)</Label>
                  <select
                    {...register('branchIds')}
                    className="h-10 w-full rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                    multiple
                  >
                    {(branches as Branch[]).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
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
                    <Plus className="mr-2 h-4 w-4" /> Kullanıcı Oluştur
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                title="Kullanıcı bulunamadı"
                description="Filtreleri değiştirin veya yeni kullanıcı oluşturun"
                icon={Filter}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filtered}
                rowKey={(u) => u.id}
              />
            )}
          </CardContent>
        </Card>

        {/* ROLE PIE */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-violet-600" />
              Rol Dağılımı
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Toplam {stats.total} kullanıcı
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
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
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
                  {pieData.map((d, i) => (
                    <div
                      key={d.code}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
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
