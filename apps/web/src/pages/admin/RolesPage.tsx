import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Search,
  Lock,
  Key,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  X,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
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
import { api } from '@/lib/api';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{ permission: { code: string; name?: string; group?: string } }>;
}

interface Permission {
  code: string;
  name: string;
  group: string;
}

interface FormVals {
  code: string;
  name: string;
  description: string;
}

export function RolesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { register, handleSubmit, reset } = useForm<FormVals>({
    defaultValues: { code: '', name: '', description: '' },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data?.items ?? r.data ?? []),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions-list'],
    queryFn: () =>
      api.get('/permissions').then((r) => r.data?.items ?? r.data ?? []),
  });

  const create = useMutation({
    mutationFn: (data: FormVals) =>
      api
        .post('/roles', { ...data, permissions: selectedPermissions })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success('Rol oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowForm(false);
      setSelectedPermissions([]);
      reset();
    },
  });

  const updatePerms = useMutation({
    mutationFn: ({ id, perms }: { id: string; perms: string[] }) =>
      api.put(`/roles/${id}/permissions`, { permissions: perms }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Yetkiler güncellendi');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
    },
  });

  const filtered = useMemo(() => {
    const list = roles as Role[];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
    );
  }, [roles, search]);

  const stats = useMemo(() => {
    const list = roles as Role[];
    return {
      total: list.length,
      system: list.filter((r) => r.isSystem).length,
      custom: list.filter((r) => !r.isSystem).length,
      totalPermissions: (permissions as Permission[]).length,
    };
  }, [roles, permissions]);

  const grouped = useMemo(() => {
    const list = permissions as Permission[];
    const map: Record<string, Permission[]> = {};
    list.forEach((p) => {
      (map[p.group] ??= []).push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const toggleGroup = (group: string) => {
    const codes = (permissions as Permission[])
      .filter((p) => p.group === group)
      .map((p) => p.code);
    const allSelected = codes.every((c) => selectedPermissions.includes(c));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <Shield className="h-6 w-6 text-blue-600" />
              Roller
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Sistem ve özel rolleri, izin gruplarını yönetin
            </p>
          </div>
          <Button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingRole(null);
              setSelectedPermissions([]);
            }}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Rol'}
          </Button>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.total.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam Rol</div>
              <div className="mt-2 text-xs text-blue-600">Tüm roller</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                  <Lock className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.system.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Sistem</div>
              <div className="mt-2 text-xs text-violet-600">Düzenlenemez</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.custom.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Özel</div>
              <div className="mt-2 text-xs text-emerald-600">Düzenlenebilir</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <Key className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.totalPermissions.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam İzin</div>
              <div className="mt-2 text-xs text-amber-600">Tanımlı permission</div>
            </CardContent>
          </Card>
        </div>

        {/* NEW ROLE FORM */}
        {showForm && (
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                    <Plus className="h-4 w-4 text-blue-600" /> Yeni Rol Oluştur
                  </CardTitle>
                  <CardDescription>Rol bilgileri ve izin ataması</CardDescription>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedPermissions([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form
                onSubmit={handleSubmit((data) => create.mutate(data))}
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
              >
                <div className="space-y-2">
                  <Label>Kod</Label>
                  <Input
                    placeholder="CASHIER"
                    className="bg-gray-50"
                    {...register('code', { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>İsim</Label>
                  <Input
                    placeholder="Veznedar"
                    className="bg-gray-50"
                    {...register('name', { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Açıklama</Label>
                  <Input
                    placeholder="Opsiyonel"
                    className="bg-gray-50"
                    {...register('description')}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedPermissions([]);
                    }}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    disabled={create.isPending}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Oluştur
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TABLE */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                  <Shield className="h-4 w-4 text-blue-600" /> Rol Listesi
                </CardTitle>
                <CardDescription>{filtered.length} rol listeleniyor</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Rol ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-64 bg-gray-50 pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Filter className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Rol bulunamadı
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
                      Açıklama
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      İzin
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Sistem
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {r.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                        {r.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                        {r.description ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                          <Key className="h-3 w-3" />
                          {r.permissions.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            r.isSystem ? 'bg-slate-400' : 'bg-emerald-500',
                          )}
                          disabled={r.isSystem}
                          title={r.isSystem ? 'Sistem rolü' : 'Özel rol'}
                        >
                          <span
                            className={cn(
                              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                              r.isSystem ? 'translate-x-4' : 'translate-x-0.5',
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingRole(r);
                              setSelectedPermissions(
                                r.permissions.map((p) => p.permission.code),
                              );
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!r.isSystem && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* PERMISSION EDITOR MODAL */}
        {editingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-gray-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="border-b border-gray-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                      <Key className="h-4 w-4 text-blue-600" />
                      {editingRole.name} — İzinler
                    </CardTitle>
                    <CardDescription>
                      {editingRole.code} • {selectedPermissions.length} izin seçili
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingRole(null);
                      setSelectedPermissions([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {grouped.map(([group, perms]) => {
                  const allSelected = perms.every((p) =>
                    selectedPermissions.includes(p.code),
                  );
                  const someSelected = perms.some((p) =>
                    selectedPermissions.includes(p.code),
                  );
                  return (
                    <div
                      key={group}
                      className="rounded-lg border border-gray-200 dark:border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="flex w-full items-center justify-between border-b border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          {allSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : someSelected ? (
                            <div className="relative">
                              <Square className="h-4 w-4 text-blue-600" />
                              <div className="absolute inset-y-1 left-0 w-2 bg-blue-600" />
                            </div>
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {group}
                          </span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {perms.length} izin
                          </span>
                        </div>
                      </button>
                      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
                        {perms.map((p) => {
                          const checked = selectedPermissions.includes(p.code);
                          return (
                            <label
                              key={p.code}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.code)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex flex-col">
                                <span className="font-mono text-xs font-medium text-gray-900 dark:text-slate-100">
                                  {p.code}
                                </span>
                                {p.name && (
                                  <span className="text-[10px] text-gray-500">
                                    {p.name}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-3 dark:border-slate-800">
                  <Button
                    variant="outline"
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                    onClick={() => {
                      setEditingRole(null);
                      setSelectedPermissions([]);
                    }}
                  >
                    İptal
                  </Button>
                  <Button
                    disabled={updatePerms.isPending}
                    onClick={() =>
                      updatePerms.mutate({
                        id: editingRole.id,
                        perms: selectedPermissions,
                      })
                    }
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Kaydet ({selectedPermissions.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
