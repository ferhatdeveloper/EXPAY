import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';

export function DashboardPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId);

  const { data: rates = [] } = useQuery({
    queryKey: ['dashboard-rates', branchId],
    queryFn: () => api.get('/exchange-rates/current', { params: { branchId } }).then((r) => r.data),
    enabled: !!branchId,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['dashboard-balances', branchId],
    queryFn: () => api.get('/vezne/balances', { params: { branchId } }).then((r) => r.data),
    enabled: !!branchId,
  });

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Aktif Kurlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            {rates.map((r: { code: string; buyRate: number; sellRate: number }) => (
              <div key={r.code} className="flex justify-between text-sm border-b pb-1">
                <span className="font-semibold">{r.code}</span>
                <span>
                  Alis: {formatCurrency(r.buyRate, CurrencyCode.TRY, 'tr')} - Satis:{' '}
                  {formatCurrency(r.sellRate, CurrencyCode.TRY, 'tr')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vezne Bakiyeleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            {balances.map((b: { currencyCode: string; totalForeign: number; totalTry: number }) => (
              <div key={b.currencyCode} className="flex justify-between text-sm border-b pb-1">
                <span className="font-semibold">{b.currencyCode}</span>
                <span>
                  Yabanci: {b.totalForeign.toFixed(2)} - TL:{' '}
                  {formatCurrency(b.totalTry, CurrencyCode.TRY, 'tr')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hizli Erisim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <a href="/vezne/receipts/create" className="block text-primary hover:underline">
              {t('vezne.receiptCreate')}
            </a>
            <a href="/rate/raw-free" className="block text-primary hover:underline">
              {t('rate.rawFree')}
            </a>
            <a href="/reports/daily-detail" className="block text-primary hover:underline">
              {t('raporlar.dailyDetail')}
            </a>
            <a href="/rate/deviation" className="block text-primary hover:underline">
              {t('sapma.rateReport')}
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}