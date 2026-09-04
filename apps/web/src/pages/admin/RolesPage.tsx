import { useTranslation } from 'react-i18next';
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
} from 'lucide-react';
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const { register, handleSubmit, reset } = useForm<FormVals>({
    defaultValues: { code: '', name: '', description: '' },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () =>
      api.get('/roles/permissions').then((r) => r.data ?? []),
  });

  const create = useMutation({
    mutationFn: (data: unknown) =>
      api.post('/roles', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Rol oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowForm(false);
      reset();
    },
  });

  const updatePerms = useMutation({
    mutationFn: ({ id, codes }: { id: string; codes: string[] }) =>
      api.post(`/roles/${id}/permissions`, { codes }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Yetkiler güncellendi');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditing(null);
    },
  });

  const openEditor = (role: Role) => {
    setEditing(role);
    setSelectedPerms(new Set(role.permissions.map((p) => p.permission.code)));
  };

  const togglePerm = (code: string) =>
    setSelectedPerms((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const toggleGroup = (group: string) => {
    const groupPerms = (permissions as Permission[]).filter((p) => p.group === group);
    const allOn = groupPerms.every((p) => selectedPerms.has(p.code));
    setSelectedPerms((s) => {
      const next = new Set(s);
      groupPerms.forEach((p) => {
        if (allOn) next.delete(p.code);
        else next.add(p.code);
      });
      return next;
    });
  };

  const groupedPerms = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of permissions as Permission[]) {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    }
    return groups;
  }, [permissions]);

  const filtered = useMemo(() => {
    return (items as Role[]).filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.code.toLowerCase().includes(q) &&
          !r.name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const list = items as Role[];
    return {
      total: list.length,
      system: list.filter((r) => r.isSystem).length,
      custom: list.filter((r) => !r.isSystem).length,
      totalPerms: list.reduce((acc, r) => acc + r.permissions.length, 0),
    };
  }, [items]);

  const columns: Column<Role>[] = [
    {
      key: 'code',
      header: 'Kod',
      render: (r) => (
        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Ad',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-violet-500" />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {r.name}
            </div>
            {r.description && (
              <div className="text-xs text-slate-500">{r.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'perms',
      header: 'Yetkiler',
      render: (r) => (
        <Badge variant="outline" className="font-mono">
          {r.permissions.length} yetki
        </Badge>
      ),
    },
    {
      key: 'system',
      header: 'Sistem',
      render: (r) =>
        r.isSystem ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Lock className="h-3 w-3" />
            Sistem
          </span>
        ) : (
          <span className="text-xs text-slate-400">Özel</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditor(r)}
            disabled={r.isSystem}
          >
            <Edit className="mr-1 h-3 w-3" />
            Yetkileri Düzenle
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={Shield}
        title="Roller"
        description="Sistem ve özel rolleri, yetki setlerini yönetin"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Rol'}
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Toplam Rol"
          value={stats.total.toLocaleString('tr-TR')}
          icon={<Shield className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          title="Sistem Rolü"
          value={stats.system.toString()}
          icon={<Lock className="h-5 w-5" />}
          tone="amber"
          sublabel="Değiştirilemez"
        />
        <StatCard
          title="Özel Rol"
          value={stats.custom.toString()}
          icon={<Key className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Toplam Yetki"
          value={(permissions as Permission[]).length.toLocaleString('tr-TR')}
          icon={<CheckSquare className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-violet-600" />
              Rol Listesi
              <Badge variant="outline" className="ml-2 font-mono">
                {filtered.length}
              </Badge>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rol ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pl-7"
              />
            </div>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="border-b bg-slate-50 dark:bg-slate-900/40">
            <form
              onSubmit={handleSubmit((data) => create.mutate(data))}
              className="grid grid-cols-1 gap-3 md:grid-cols-3"
            >
              <div className="space-y-1.5">
                <Label>Kod</Label>
                <Input
                  placeholder="ROLE_CODE"
                  {...register('code', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ad</Label>
                <Input
                  placeholder="Rol adı"
                  {...register('name', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Input
                  placeholder="Açıklama"
                  {...register('description')}
                />
              </div>
              <div className="md:col-span-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  <Plus className="mr-2 h-4 w-4" /> Rol Oluştur
                </Button>
              </div>
            </form>
          </CardContent>
        )}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              title="Rol bulunamadı"
              description="Yeni rol oluşturun"
              icon={Shield}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(r) => r.id}
            />
          )}
        </CardContent>
      </Card>

      {/* MODAL: YETKİ DÜZENLEME */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="flex max-h-[88vh] w-full max-w-3xl flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-violet-600" />
                  {editing.name} — Yetkileri Düzenle
                </CardTitle>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {editing.code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {Object.entries(groupedPerms).map(([group, perms]) => {
                  const allOn = perms.every((p) => selectedPerms.has(p.code));
                  const someOn = perms.some((p) => selectedPerms.has(p.code));
                  return (
                    <div
                      key={group}
                      className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <button
                        onClick={() => toggleGroup(group)}
                        className="mb-3 flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {allOn ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : someOn ? (
                            <Square className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {group}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {
                              perms.filter((p) => selectedPerms.has(p.code))
                                .length
                            }
                            /{perms.length}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {allOn ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                        </span>
                      </button>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {perms.map((p) => (
                          <label
                            key={p.code}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                              selectedPerms.has(p.code)
                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(p.code)}
                              onChange={() => togglePerm(p.code)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs">
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {p.code}
                              </span>
                              {p.name && (
                                <span className="ml-2 text-slate-500">
                                  {p.name}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <div className="flex items-center justify-between gap-2 border-t bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <strong>{selectedPerms.size}</strong> yetki seçili
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  İptal
                </Button>
                <Button
                  onClick={() =>
                    updatePerms.mutate({
                      id: editing.id,
                      codes: Array.from(selectedPerms),
                    })
                  }
                  disabled={updatePerms.isPending}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Yetkileri Kaydet
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
