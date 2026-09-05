import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { CustomerDisplayPage } from '@/pages/customer/CustomerDisplayPage';
import { QueueTakePage } from '@/pages/customer/QueueTakePage';
import { CounterCallPage } from '@/pages/customer/CounterCallPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { VezneReceiptCreatePage } from '@/pages/vezne/VezneReceiptCreatePage';
import { VezneReceiptListPage } from '@/pages/vezne/VezneReceiptListPage';
import { VezneMonitorPage } from '@/pages/vezne/VezneMonitorPage';
import { VezneBanknoteCountPage } from '@/pages/vezne/VezneBanknoteCountPage';
import { VezneTransferPage } from '@/pages/vezne/VezneTransferPage';
import { VezneBalancePage } from '@/pages/vezne/VezneBalancePage';
import { RateFreePage } from '@/pages/rate/RateFreePage';
import { RateRawFreePage } from '@/pages/rate/RateRawFreePage';
import { RateDailyInputPage } from '@/pages/rate/RateDailyInputPage';
import { RateOldPage } from '@/pages/rate/RateOldPage';
import { RateClosingPage } from '@/pages/rate/RateClosingPage';
import { RateDefinitionPage } from '@/pages/rate/RateDefinitionPage';
import { RateDeviationPage } from '@/pages/rate/RateDeviationPage';
import { ReceiptListReportPage } from '@/pages/reports/ReceiptListReportPage';
import { DailyDetailReportPage } from '@/pages/reports/DailyDetailReportPage';
import { ProfitabilityReportPage } from '@/pages/reports/ProfitabilityReportPage';
import { PersonnelReportPage } from '@/pages/reports/PersonnelReportPage';
import { CashLedgerPage } from '@/pages/reports/CashLedgerPage';
import { ChangeReportPage } from '@/pages/reports/ChangeReportPage';
import { CashAccountsPage } from '@/pages/cash/CashAccountsPage';
import { CashMovementsPage } from '@/pages/cash/CashMovementsPage';
import { CashBalancesPage } from '@/pages/cash/CashBalancesPage';
import { CustomersPage } from '@/pages/cari/CustomersPage';
import { CustomerMovementsPage } from '@/pages/cari/CustomerMovementsPage';
import { CustomerBalancesPage } from '@/pages/cari/CustomerBalancesPage';
import { EmanetPage } from '@/pages/cari/EmanetPage';
import { EmanetNewPage } from '@/pages/cari/EmanetNewPage';
import { EmanetDetailPage } from '@/pages/cari/EmanetDetailPage';
import { AccountingAccountsPage } from '@/pages/accounting/AccountingAccountsPage';
import { VouchersPage } from '@/pages/accounting/VouchersPage';
import { FiscalYearsPage } from '@/pages/accounting/FiscalYearsPage';
import { DayEndPage } from '@/pages/accounting/DayEndPage';
import { TechnicalPage } from '@/pages/teknik/TechnicalPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { RolesPage } from '@/pages/admin/RolesPage';
import { BranchesPage } from '@/pages/admin/BranchesPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Public — Kiosk & TV ekranı (auth'sız) */}
      <Route path="/display" element={<CustomerDisplayPage />} />
      <Route path="/queue" element={<QueueTakePage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />

        {/* Queue (Müşteri Sıra Sistemi) */}
        <Route path="/counter" element={<CounterCallPage />} />

        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/roles" element={<RolesPage />} />
        <Route path="/admin/branches" element={<BranchesPage />} />

        <Route path="/vezne/receipts/create" element={<VezneReceiptCreatePage />} />
        <Route path="/vezne/receipts" element={<VezneReceiptListPage />} />
        <Route path="/vezne/transfer" element={<VezneTransferPage />} />
        <Route path="/vezne/monitor" element={<VezneMonitorPage />} />
        <Route path="/vezne/banknote" element={<VezneBanknoteCountPage />} />
        <Route path="/vezne/balance" element={<VezneBalancePage />} />

        <Route path="/rate/raw-free" element={<RateRawFreePage />} />
        <Route path="/rate/free" element={<RateFreePage />} />
        <Route path="/rate/daily-input" element={<RateDailyInputPage />} />
        <Route path="/rate/old" element={<RateOldPage />} />
        <Route path="/rate/closing" element={<RateClosingPage />} />
        <Route path="/rate/definition" element={<RateDefinitionPage />} />
        <Route path="/rate/deviation" element={<RateDeviationPage />} />

        <Route path="/reports/receipt-list" element={<ReceiptListReportPage />} />
        <Route path="/reports/daily-detail" element={<DailyDetailReportPage />} />
        <Route path="/reports/profitability" element={<ProfitabilityReportPage />} />
        <Route path="/reports/personnel" element={<PersonnelReportPage />} />
        <Route path="/reports/cash-ledger" element={<CashLedgerPage />} />
        <Route path="/reports/changes" element={<ChangeReportPage />} />

        <Route path="/cash/accounts" element={<CashAccountsPage />} />
        <Route path="/cash/movements" element={<CashMovementsPage />} />
        <Route path="/cash/balances" element={<CashBalancesPage />} />

        <Route path="/cari/customers" element={<CustomersPage />} />
        <Route path="/cari/movements" element={<CustomerMovementsPage />} />
        <Route path="/cari/balances" element={<CustomerBalancesPage />} />
        <Route path="/cari/emanet" element={<EmanetPage />} />
        <Route path="/cari/emanet/new" element={<EmanetNewPage />} />
        <Route path="/cari/emanet/:id" element={<EmanetDetailPage />} />

        <Route path="/accounting/accounts" element={<AccountingAccountsPage />} />
        <Route path="/accounting/vouchers" element={<VouchersPage />} />
        <Route path="/accounting/fiscal-years" element={<FiscalYearsPage />} />
        <Route path="/accounting/day-end" element={<DayEndPage />} />

        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/teknik" element={<TechnicalPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}