import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { Button } from '@/components/ui/button';
import { Menu, Moon, Sun, LogOut, ChevronRight, ChevronDown, Coins } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type Language } from '@doviz/shared';
import {
  BarChart3,
  Wallet,
  DollarSign,
  FileText,
  CreditCard,
  Users,
  Calculator,
  Settings as SettingsIcon,
  Wrench,
  Building2,
  Globe,
  UsersRound,
  Box,
} from 'lucide-react';

const NAV_GROUPS: Array<{
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  labelKey?: string;
  items?: Array<{ key: string; to: string; permission?: string; labelKey?: string }>;
}> = [
  { key: 'dashboard', icon: BarChart3, to: '/', labelKey: 'nav.dashboard' },
  {
    key: 'vezne',
    icon: Wallet,
    labelKey: 'nav.vezne',
    items: [
      { key: 'receiptCreate', labelKey: 'vezne.receiptCreate', to: '/vezne/receipts/create', permission: 'vezne.receipt.create' },
      { key: 'receiptList', labelKey: 'vezne.receiptList', to: '/vezne/receipts', permission: 'vezne.list' },
      { key: 'transferCreate', labelKey: 'vezne.transfer', to: '/vezne/transfer', permission: 'vezne.transfer.create' },
      { key: 'monitor', labelKey: 'vezne.monitor', to: '/vezne/monitor', permission: 'vezne.monitor' },
      { key: 'banknoteCount', labelKey: 'vezne.banknoteCount', to: '/vezne/banknote', permission: 'vezne.banknoteCount' },
      { key: 'balanceReport', labelKey: 'vezne.balanceReport', to: '/vezne/balance', permission: 'vezne.balanceReport' },
    ],
  },
  {
    key: 'rate',
    icon: DollarSign,
    labelKey: 'nav.rate',
    items: [
      { key: 'dailyInput', labelKey: 'rate.dailyInput', to: '/rate/daily-input', permission: 'rate.update' },
      { key: 'rawFree', labelKey: 'rate.rawFree', to: '/rate/raw-free', permission: 'rate.rawFree' },
      { key: 'free', labelKey: 'rate.free', to: '/rate/free', permission: 'rate.free' },
      { key: 'old', labelKey: 'rate.old', to: '/rate/old', permission: 'rate.old' },
      { key: 'closing', labelKey: 'rate.closing', to: '/rate/closing', permission: 'rate.closing' },
      { key: 'definition', labelKey: 'rate.definition', to: '/rate/definition', permission: 'rate.definition' },
      { key: 'deviation', labelKey: 'rate.deviation', to: '/rate/deviation', permission: 'rateDeviation.report' },
    ],
  },
  {
    key: 'reports',
    icon: FileText,
    labelKey: 'nav.reports',
    items: [
      { key: 'receiptList', labelKey: 'reports.receiptList', to: '/reports/receipt-list', permission: 'report.receiptList' },
      { key: 'dailyDetail', labelKey: 'reports.dailyDetail', to: '/reports/daily-detail', permission: 'report.dailyDetail' },
      { key: 'profitability', labelKey: 'reports.profitability', to: '/reports/profitability', permission: 'report.profitability' },
      { key: 'personnel', labelKey: 'reports.personnel', to: '/reports/personnel', permission: 'report.personnel' },
      { key: 'cashLedger', labelKey: 'reports.cashLedger', to: '/reports/cash-ledger', permission: 'cash.ledger' },
      { key: 'changes', labelKey: 'reports.changes', to: '/reports/changes', permission: 'change.report' },
    ],
  },
  {
    key: 'cash',
    icon: CreditCard,
    labelKey: 'nav.cash',
    items: [
      { key: 'accounts', labelKey: 'kasa.accounts', to: '/cash/accounts', permission: 'cash.accountNames' },
      { key: 'movements', labelKey: 'kasa.movements', to: '/cash/movements', permission: 'cash.list' },
      { key: 'balances', labelKey: 'kasa.balances', to: '/cash/balances', permission: 'cash.balance' },
    ],
  },
  {
    key: 'customers',
    icon: Users,
    labelKey: 'nav.customers',
    items: [
      { key: 'customersList', labelKey: 'cari.customers', to: '/cari/customers', permission: 'customer.list' },
      { key: 'movements', labelKey: 'cari.movements', to: '/cari/movements', permission: 'customer.list' },
      { key: 'balances', labelKey: 'cari.balances', to: '/cari/balances', permission: 'customer.balance' },
      { key: 'emanet', labelKey: 'cari.emanet', to: '/cari/emanet', permission: 'customer.emanetView' },
    ],
  },
  {
    key: 'accounting',
    icon: Calculator,
    labelKey: 'nav.accounting',
    items: [
      { key: 'accounts', labelKey: 'muhasebe.accounts', to: '/accounting/accounts', permission: 'accounting.account.correct' },
      { key: 'vouchers', labelKey: 'muhasebe.vouchers', to: '/accounting/vouchers', permission: 'accounting.voucher.correct' },
      { key: 'fiscalYears', labelKey: 'muhasebe.fiscalYears', to: '/accounting/fiscal-years', permission: 'accounting.fiscalYear' },
      { key: 'dayEnd', labelKey: 'muhasebe.dayEnd', to: '/accounting/day-end', permission: 'manager.dayEnd' },
    ],
  },
  {
    key: 'queue',
    icon: UsersRound,
    labelKey: 'nav.queue',
    items: [
      { key: 'take', labelKey: 'queue.take', to: '/queue' },
      { key: 'counter', labelKey: 'queue.counter', to: '/counter', permission: 'queue.call' },
      { key: 'display', labelKey: 'queue.display', to: '/display' },
    ],
  },
  { key: 'technical', icon: Wrench, to: '/teknik', labelKey: 'nav.technical' },
  { key: 'settings', icon: SettingsIcon, to: '/settings', labelKey: 'nav.settings' },
  {
    key: 'admin',
    icon: SettingsIcon,
    labelKey: 'nav.admin',
    items: [
      { key: 'users', labelKey: 'admin.users', to: '/admin/users', permission: 'admin.users' },
      { key: 'roles', labelKey: 'admin.roles', to: '/admin/roles', permission: 'admin.roles' },
      { key: 'branches', labelKey: 'admin.branches', to: '/admin/branches', permission: 'admin.branches' },
    ],
  },
];

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUiStore();
  const settingsBase = useSettingsStore((s) => s.baseCurrency);
  const settingsPairBase = useSettingsStore((s) => s.defaultPairBase);
  const settingsPairQuote = useSettingsStore((s) => s.defaultPairQuote);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.filter((g) => g.items).map((g) => [g.key, true])),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        document.documentElement.classList.toggle('dark', stored === 'dark');
        if (stored !== theme) {
          (useUiStore as any).setState({ theme: stored });
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-slate-950">
      <aside
        className={cn(
          'flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900',
          sidebarOpen ? 'w-64' : 'w-16',
        )}
      >
        {/* Logo header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-slate-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-premium">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-base font-bold text-gray-900 dark:text-slate-50">{t('common.appName')}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-gray-600 hover:bg-gray-100">
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_GROUPS.map((group) => {
            const Icon = group.icon;
            if (group.to) {
              return (
                <NavLink
                  key={group.key}
                  to={group.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    )
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span>{t(group.labelKey ?? `nav.${group.key}`)}</span>}
                </NavLink>
              );
            }
            const items = (group.items ?? []).filter(
              (i) => user.roleCode === 'ADMIN' || !i.permission || user.permissions.includes(i.permission),
            );
            if (items.length === 0) return null;
            const isOpen = openGroups[group.key];
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => setOpenGroups((s) => ({ ...s, [group.key]: !s[group.key] }))}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left">{t(group.labelKey ?? `nav.${group.key}`, { defaultValue: group.key })}</span>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </button>
                {sidebarOpen && isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2 dark:border-slate-800">
                    {items.map((it) => (
                      <NavLink
                        key={it.key}
                        to={it.to}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors',
                            isActive
                              ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                          )
                        }
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                        {t(it.labelKey ?? `${group.key}.${it.key}`, { defaultValue: it.key })}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer: user */}
        {sidebarOpen && (
          <div className="border-t border-gray-200 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-900 dark:text-slate-100">{user.username}</p>
                <p className="truncate text-[10px] text-gray-500 dark:text-slate-400">{user.roleCode}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar — RetailEX tarzı: breadcrumb + saat + kullanıcı */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-slate-100">{t('common.appName')}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span>{t('nav.dashboard')}</span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/settings"
              className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
              title="Proje Ayarları"
            >
              <Coins className="h-3.5 w-3.5" />
              {settingsBase} · {settingsPairBase}/{settingsPairQuote}
            </NavLink>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t('common.online')}
            </div>
            <select
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((l: Language) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-gray-600 dark:text-slate-400">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="text-gray-600 dark:text-slate-400">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-slate-950">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
