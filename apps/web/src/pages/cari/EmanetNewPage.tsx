import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  Save,
  Loader2,
  Coins,
  Scale,
  MapPin,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatNumber } from '@/lib/format';

interface Customer {
  id: string;
  code: string;
  fullName: string;
  branchId: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

interface NewEmanetForm {
  customerId: string;
  branchId: string;
  currency: string;
  kind: 'CURRENCY' | 'PRECIOUS_METAL';
  metalType?: string;
  weightGrams?: number;
  purity?: number;
  initialAmount: number;
  unit: 'PIECE' | 'GRAM' | 'OUNCE';
  entryRate: number;
  storageLocation?: string;
  vaultNumber?: string;
  description?: string;
  expiresAt?: string;
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CHF', 'XAU', 'XAG', 'IQD'];
const METAL_OPTIONS = [
  { code: 'XAU', name: 'Altın', defaultPurity: 0.9167 },
  { code: 'XAG', name: 'Gümüş', defaultPurity: 0.925 },
  { code: 'XPT', name: 'Platin', defaultPurity: 0.95 },
];

export function EmanetNewPage() {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.defaultBranchId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<NewEmanetForm>({
    customerId: '',
    branchId: branchId ?? '',
    currency: 'USD',
    kind: 'CURRENCY',
    initialAmount: 0,
    unit: 'PIECE',
    entryRate: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const customersQ = useQuery({
    queryKey: ['customers', branchId],
    queryFn: () =>
      api.get('/customers', { params: { branchId } }).then((r) => (Array.isArray(r.data) ? r.data : []) as Customer[]),
    enabled: !!branchId,
  });

  const customers = customersQ.data ?? [];
  const selectedCustomer = customers.find((c) => c.id === form.customerId);

  const tryValue = useMemo(
    () => (form.initialAmount || 0) * (form.entryRate || 0),
    [form.initialAmount, form.entryRate],
  );

  const update = (patch: Partial<NewEmanetForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.customerId) {
      toast.error('Müşteri seçin');
      return;
    }
    if (!form.branchId) {
      toast.error('Şube bilgisi eksik');
      return;
    }
    if (form.initialAmount <= 0) {
      toast.error('Tutar pozitif olmalı');
      return;
    }
    if (form.entryRate <= 0) {
      toast.error('Giriş kuru pozitif olmalı');
      return;
    }
    if (form.kind === 'PRECIOUS_METAL' && !form.metalType) {
      toast.error('Metal türü seçin');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customerId: form.customerId,
        branchId: form.branchId,
        currency: form.currency,
        kind: form.kind,
        initialAmount: form.initialAmount,
        unit: form.unit,
        entryRate: form.entryRate,
      };
      if (form.kind === 'PRECIOUS_METAL') {
        payload.metalType = form.metalType;
        if (form.weightGrams) payload.weightGrams = form.weightGrams;
        if (form.purity) payload.purity = form.purity;
      }
      if (form.storageLocation) payload.storageLocation = form.storageLocation;
      if (form.vaultNumber) payload.vaultNumber = form.vaultNumber;
      if (form.description) payload.description = form.description;
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

      const res = await api.post('/emanet', payload);
      toast.success('Emanet açıldı: ' + res.data.referenceNo);
      queryClient.invalidateQueries({ queryKey: ['emanet', branchId] });
      navigate(`/cari/emanet/${res.data.id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Emanet açılamadı');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Yeni Emanet Aç"
        description="Müşteriden alınan döviz/kıymetli maden emanete alınır"
        icon={Box}
        actions={
          <Link to="/cari/emanet">
            <Button variant="outline" size="sm" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                <Box className="h-5 w-5 text-blue-600" />
                Emanet Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Müşteri seçimi */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-600 dark:text-slate-400">Müşteri *</Label>
                <select
                  value={form.customerId}
                  onChange={(e) => update({ customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  <option value="">-- Müşteri seçin --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.fullName}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <p className="mt-1 text-xs text-gray-500">
                    Şube: <span className="font-mono">{selectedCustomer.branchId}</span>
                  </p>
                )}
              </div>

              {/* Tür seçimi */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-600 dark:text-slate-400">Emanet Türü *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => update({ kind: 'CURRENCY', metalType: undefined, weightGrams: undefined, purity: undefined, unit: 'PIECE' })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                      form.kind === 'CURRENCY'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Coins className="h-4 w-4" />
                    Döviz
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ kind: 'PRECIOUS_METAL', currency: 'XAU', metalType: 'XAU', purity: 0.9167, unit: 'GRAM' })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                      form.kind === 'PRECIOUS_METAL'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Scale className="h-4 w-4" />
                    Kıymetli Maden
                  </button>
                </div>
              </div>

              {/* Currency veya Metal */}
              {form.kind === 'CURRENCY' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 dark:text-slate-400">Currency *</Label>
                    <select
                      value={form.currency}
                      onChange={(e) => update({ currency: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      {CURRENCY_OPTIONS.filter((c) => c !== 'XAU' && c !== 'XAG').map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 dark:text-slate-400">Birim</Label>
                    <select
                      value={form.unit}
                      onChange={(e) => update({ unit: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      <option value="PIECE">Adet</option>
                      <option value="GRAM">Gram</option>
                      <option value="OUNCE">Ons</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 dark:text-slate-400">Metal *</Label>
                    <select
                      value={form.metalType ?? 'XAU'}
                      onChange={(e) => {
                        const m = METAL_OPTIONS.find((x) => x.code === e.target.value);
                        update({
                          metalType: e.target.value,
                          currency: e.target.value,
                          purity: m?.defaultPurity ?? form.purity,
                        });
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      {METAL_OPTIONS.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name} ({m.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 dark:text-slate-400">Ağırlık (gram)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={form.weightGrams ?? ''}
                      onChange={(e) => update({ weightGrams: Number(e.target.value) || undefined })}
                      placeholder="100.50"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 dark:text-slate-400">Ayar (Saflık)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      value={form.purity ?? ''}
                      onChange={(e) => update({ purity: Number(e.target.value) || undefined })}
                      placeholder="0.9167 (22K)"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Tutar + Kur */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-gray-600 dark:text-slate-400">
                    Tutar ({form.kind === 'PRECIOUS_METAL' ? 'gram' : form.currency}) *
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.initialAmount || ''}
                    onChange={(e) => update({ initialAmount: Number(e.target.value) || 0 })}
                    placeholder="5000"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 dark:text-slate-400">
                    {form.kind === 'PRECIOUS_METAL' ? 'TRY / gram' : 'Kur (TRY)'} *
                  </Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={form.entryRate || ''}
                    onChange={(e) => update({ entryRate: Number(e.target.value) || 0 })}
                    placeholder="32.10"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                  />
                </div>
              </div>

              {/* Saklama */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Saklama Yeri
                  </Label>
                  <Input
                    value={form.storageLocation ?? ''}
                    onChange={(e) => update({ storageLocation: e.target.value })}
                    placeholder="Kasa K-2 / Banka Cell / Vault Room"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Kasa/Vault No
                  </Label>
                  <Input
                    value={form.vaultNumber ?? ''}
                    onChange={(e) => update({ vaultNumber: e.target.value })}
                    placeholder="V-001"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                  />
                </div>
              </div>

              {/* Tarih ve açıklama */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 dark:text-slate-400">Vade (opsiyonel)</Label>
                  <Input
                    type="date"
                    value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
                    onChange={(e) => update({ expiresAt: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 dark:text-slate-400">Açıklama</Label>
                  <Input
                    value={form.description ?? ''}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Müşteri talebi, özel not..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link to="/cari/emanet">
                  <Button variant="outline" type="button" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">
                    İptal
                  </Button>
                </Link>
                <Button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Emanet Aç
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ özet paneli */}
        <div className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                <Coins className="h-5 w-5 text-green-600" />
                Önizleme
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Müşteri</span>
                <span className="font-medium text-gray-900 dark:text-slate-50">
                  {selectedCustomer?.fullName ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tür</span>
                <Badge variant="outline">
                  {form.kind === 'PRECIOUS_METAL' ? `Maden (${form.metalType ?? 'XAU'})` : `Döviz (${form.currency})`}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tutar</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-slate-50">
                  {formatNumber(form.initialAmount || 0, "tr", 4)} {form.kind === 'PRECIOUS_METAL' ? 'gr' : form.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kur</span>
                <span className="font-mono text-gray-700 dark:text-slate-300">
                  1 {form.currency} = {formatNumber(form.entryRate || 0, "tr", 4)} ₺
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-slate-800 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">TRY Karşılığı</span>
                  <span className="font-mono text-base font-bold text-green-700 dark:text-green-400">
                    {formatNumber(tryValue, "tr", 2)} ₺
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg">
            <CardContent className="p-4 text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <p className="font-semibold">📌 Not</p>
              <p>
                Emanet açıldığında referans no otomatik üretilir (EMT-YYYY-NNNNN).
              </p>
              <p>
                Aynı müşteri için birden fazla emanet açılabilir; her biri ayrı kayıt olarak takip edilir.
              </p>
              <p>
                Müşteri istediği zaman kısmi veya tam iade yapabilir.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export default EmanetNewPage;
