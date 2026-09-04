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
  Building2,
  Power,
  Edit,
  Eye,
  PieChart as PieIcon,
  X,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
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
  ADMIN: {
    label: 'Admin',
    bg: 'bg-violet-100 dark:bg-violet-900/40',
    tone: 'text-violet-700 dark:text-violet-300',
  },
  MANAGER: {
    label: 'Müdür',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    tone: 'text-blue-700 dark:text-blue-300',
  },
  CASHIER: {
    label: 'Veznedar',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    tone: 'text-emerald-700 dark:text-emerald-300',
  },
  ACCOUNTANT: {
    label: 'Muhasebeci',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    tone: 'text-amber-700 dark:text-amber-300',
  },
};

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

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
    queryFn: () => api.get('/users').then((r) => r.data?.items ?? r.data ?? []),
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
    mutationFn: (data: unknown) => api.post('/users', data).then((r) => r.data),
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
      if (branchFilter !== 'ALL' && !u.branches.some((b) => b.branch.id === branchFilter))
        return false;
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
  }, [items, roleFilter, statusFilter, branchFilter, search]);

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

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <Users className="h-6 w-6 text-blue-600" />
              Kullanıcılar
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Sistem kullanıcılarını, rolleri ve şube atamalarını yönetin
            </p>
          </div>
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Kullanıcı'}
          </Button>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
              <div className="mt-2 text-xs text-blue-600">Sistem genelinde</div>
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
                {stats.active.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Aktif</div>
              <div className="mt-2 text-xs text-emerald-600">
                {stats.total
                  ? `%${Math.round((stats.active / stats.total) * 100)}`
                  : '0%'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                  <UserX className="h-5 w-5 text-rose-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.inactive.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Pasif</div>
              <div className="mt-2 text-xs text-rose-600">Devre dışı</div>
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
                {stats.todayLogins.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Bugün Giriş</div>
              <div className="mt-2 text-xs text-violet-600">Son 24 saat</div>
            </CardContent>
          </Card>
        </div>

        {/* FİLTRE + FORM + LİSTE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <CardHeader className="border-b border-gray-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                    <Users className="h-4 w-4 text-blue-600" />
                    Kullanıcı Listesi
                  </CardTitle>
                  <CardDescription>{filtered.length} / {stats.total} kullanıcı</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Kullanıcı ara..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-9 w-56 bg-gray-50 pl-9"
                    />
                  </div>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:bg-white"
                  >
                    <option value="ALL">Tüm Şubeler</option>
                    {(branches as Branch[]).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                  </select>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:bg-white"
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
                    className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:bg-white"
                  >
                    <option value="ALL">Tüm Durumlar</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Pasif</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            {showForm && (
              <CardContent className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                    <Plus className="h-4 w-4 text-blue-600" /> Yeni Kullanıcı
                  </h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setShowForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
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
                      className="bg-white"
                      {...register('username', { required: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ad Soyad</Label>
                    <Input
                      placeholder="Ad Soyad"
                      className="bg-white"
                      {...register('fullName', { required: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Eposta</Label>
                    <Input
                      type="email"
                      placeholder="ornek@firma.com"
                      className="bg-white"
                      {...register('email')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Şifre</Label>
                    <Input
                      type="password"
                      className="bg-white"
                      {...register('password', { required: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rol</Label>
                    <select
                      {...register('roleId', { required: true })}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
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
                    <Label>Şubeler (birden fazla seçilebilir)</Label>
                    <select
                      {...register('branchIds')}
                      className="h-20 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
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
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                      onClick={() => setShowForm(false)}
                    >
                      İptal
                    </Button>
                    <Button
                      type="submit"
                      disabled={create.isPending}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Kullanıcı Oluştur
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
            <div className="overflow-x-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Filter className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                    Kullanıcı bulunamadı
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Filtreleri değiştirin veya yeni kullanıcı oluşturun
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                        Kullanıcı
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                        Eposta
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                        Rol
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                        Şubeler
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                        Son Giriş
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
                        Aktif
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const meta = ROLE_TONES[u.role?.code];
                      const initials = u.fullName
                        .split(' ')
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();
                      return (
                        <tr
                          key={u.id}
                          className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                                {initials}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                  {u.fullName}
                                </div>
                                <div className="font-mono text-xs text-gray-500">
                                  @{u.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {u.email ? (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-400">
                                <Mail className="h-3 w-3" />
                                {u.email}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                meta?.bg,
                                meta?.tone,
                              )}
                            >
                              {meta?.label ?? u.role?.code ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.branches.length === 0 ? (
                                <span className="text-xs text-gray-400">—</span>
                              ) : (
                                <>
                                  {u.branches.slice(0, 3).map((b, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    >
                                      <Building2 className="h-2.5 w-2.5" />
                                      {b.branch.code}
                                    </span>
                                  ))}
                                  {u.branches.length > 3 && (
                                    <span className="text-[10px] text-gray-500">
                                      +{u.branches.length - 3}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {u.lastLoginAt ? (
                              <span className="font-mono text-xs text-gray-600 dark:text-slate-400">
                                {new Date(u.lastLoginAt).toLocaleString('tr-TR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Hiç girmedi</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              className={cn(
                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                u.active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700',
                              )}
                              title={u.active ? 'Aktif' : 'Pasif'}
                            >
                              <span
                                className={cn(
                                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                                  u.active ? 'translate-x-4' : 'translate-x-0.5',
                                )}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-600"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* ROLE PIE */}
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                <PieIcon className="h-4 w-4 text-violet-600" />
                Rol Dağılımı
              </CardTitle>
              <CardDescription>Toplam {stats.total} kullanıcı</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {pieData.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center text-gray-400">
                  <PieIcon className="mb-2 h-8 w-8" />
                  <p className="text-sm">Veri yok</p>
                </div>
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
                          <span className="font-medium text-gray-700 dark:text-slate-300">
                            {d.name}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-gray-900 dark:text-slate-100">
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
      </div>
    </div>
  );
}
