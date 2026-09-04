import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Edit,
  Power,
  MapPin,
  Globe2,
  Clock,
  BarChart3,
  Filter,
  Trash2,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
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

interface Branch {
  id: string;
  code: string;
  name: string;
  city?: string;
  country: 'TR' | 'IQ';
  timezone: string;
  defaultSpread: number;
  active: boolean;
  manager?: string;
  managerEmail?: string;
  phone?: string;
  address?: string;
}

interface FormVals {
  code: string;
  name: string;
  city: string;
  country: 'TR' | 'IQ';
  timezone: string;
  defaultSpread: number;
  manager: string;
  managerEmail: string;
  phone: string;
  address: string;
}

export function BranchesPage() {
  const queryClient = useQueryClient();
  const [countryFilter, setCountryFilter] = useState<'ALL' | 'TR' | 'IQ'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset } = useForm<FormVals>({
    defaultValues: {
      code: '',
      name: '',
      city: '',
      country: 'TR',
      timezone: 'Europe/Istanbul',
      defaultSpread: 0.005,
      manager: '',
      managerEmail: '',
      phone: '',
      address: '',
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () =>
      api.get('/branches').then((r) => r.data?.items ?? r.data ?? []),
  });

  const create = useMutation({
    mutationFn: (data: FormVals) =>
      api.post('/branches', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Şube oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowForm(false);
      reset();
    },
  });

  const filtered = useMemo(() => {
    let list = items as Branch[];
    if (countryFilter !== 'ALL') list = list.filter((b) => b.country === countryFilter);
    if (statusFilter === 'ACTIVE') list = list.filter((b) => b.active);
    if (statusFilter === 'INACTIVE') list = list.filter((b) => !b.active);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.code.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q) ||
          (b.city ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, countryFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const list = items as Branch[];
    const tr = list.filter((b) => b.country === 'TR').length;
    const iq = list.filter((b) => b.country === 'IQ').length;
    const active = list.filter((b) => b.active).length;
    return { total: list.length, tr, iq, active };
  }, [items]);

  const chartData = useMemo(
    () => [
      {
        name: 'Şubeler',
        TR: stats.tr,
        IQ: stats.iq,
      },
    ],
    [stats],
  );

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <Building2 className="h-6 w-6 text-blue-600" />
              Şubeler
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Tüm mağaza ve şubelerin lokasyon, spread ve durum bilgileri
            </p>
          </div>
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Şube'}
          </Button>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.total.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam Şube</div>
              <div className="mt-2 text-xs text-blue-600">Tüm lokasyonlar</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                  <span className="text-xl">🇹🇷</span>
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.tr.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">TR Şube</div>
              <div className="mt-2 text-xs text-rose-600">Türkiye</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <span className="text-xl">🇮🇶</span>
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.iq.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">IQ Şube</div>
              <div className="mt-2 text-xs text-emerald-600">Irak</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <Power className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.active.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Aktif</div>
              <div className="mt-2 text-xs text-amber-600">Çalışır durumda</div>
            </CardContent>
          </Card>
        </div>

        {/* FİLTRE + FORM */}
        {showForm && (
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                    <Plus className="h-4 w-4 text-blue-600" /> Yeni Şube
                  </CardTitle>
                  <CardDescription>Şube bilgileri ve müdür ataması</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                onSubmit={handleSubmit((data) => create.mutate(data))}
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
              >
                <div className="space-y-2">
                  <Label>Kod</Label>
                  <Input
                    placeholder="IST-001"
                    className="bg-gray-50"
                    {...register('code', { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>İsim</Label>
                  <Input
                    placeholder="Merkez Şube"
                    className="bg-gray-50"
                    {...register('name', { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şehir</Label>
                  <Input
                    placeholder="İstanbul"
                    className="bg-gray-50"
                    {...register('city')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ülke</Label>
                  <select
                    {...register('country', { required: true })}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm"
                  >
                    <option value="TR">🇹🇷 Türkiye</option>
                    <option value="IQ">🇮🇶 Irak</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <select
                    {...register('timezone')}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm"
                  >
                    <option value="Europe/Istanbul">Europe/Istanbul</option>
                    <option value="Asia/Baghdad">Asia/Baghdad</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Default Spread (%)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    className="bg-gray-50"
                    {...register('defaultSpread', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Müdür</Label>
                  <Input
                    placeholder="Ad Soyad"
                    className="bg-gray-50"
                    {...register('manager')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Müdür Eposta</Label>
                  <Input
                    type="email"
                    className="bg-gray-50"
                    {...register('managerEmail')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    placeholder="+90 212 ..."
                    className="bg-gray-50"
                    {...register('phone')}
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <Label>Adres</Label>
                  <Input
                    placeholder="Açık adres"
                    className="bg-gray-50"
                    {...register('address')}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
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
                    <Plus className="mr-2 h-4 w-4" /> Şube Oluştur
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* FILTER BAR */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                  <Filter className="h-4 w-4 text-blue-600" /> Filtre
                </CardTitle>
                <CardDescription>Ülke ve durum filtresi</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={countryFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setCountryFilter('ALL')}
                  className={cn(
                    countryFilter === 'ALL'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  Tümü
                </Button>
                <Button
                  size="sm"
                  variant={countryFilter === 'TR' ? 'default' : 'outline'}
                  onClick={() => setCountryFilter('TR')}
                  className={cn(
                    countryFilter === 'TR'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  🇹🇷 Türkiye
                </Button>
                <Button
                  size="sm"
                  variant={countryFilter === 'IQ' ? 'default' : 'outline'}
                  onClick={() => setCountryFilter('IQ')}
                  className={cn(
                    countryFilter === 'IQ'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  🇮🇶 Irak
                </Button>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                  }
                  className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:bg-white"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Filter className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Şube bulunamadı
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Kod
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      İsim
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Şehir
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Ülke
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Timezone
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Default Spread
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
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {b.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {b.name}
                        </div>
                        {b.manager && (
                          <div className="text-xs text-gray-500">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {b.manager}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        {b.city ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                            b.country === 'TR'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                          )}
                        >
                          {b.country === 'TR' ? '🇹🇷 TR' : '🇮🇶 IQ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {b.timezone}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          %{((b.defaultSpread ?? 0) * 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            b.active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700',
                          )}
                          title={b.active ? 'Aktif' : 'Pasif'}
                        >
                          <span
                            className={cn(
                              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                              b.active ? 'translate-x-4' : 'translate-x-0.5',
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600">
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* BAR CHART */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Ülke Karşılaştırması
            </CardTitle>
            <CardDescription>TR vs IQ şube dağılımı</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="TR" name="🇹🇷 Türkiye" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="IQ" name="🇮🇶 Irak" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
