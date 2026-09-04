/**
 * Permission codes used across API guards and UI guards.
 * Format: <module>.<action>
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Vezne
  VEZNE_VIEW: 'vezne.view',
  VEZNE_RECEIPT_CREATE: 'vezne.receipt.create',
  VEZNE_RECEIPT_CORRECT: 'vezne.receipt.correct',
  VEZNE_TRANSFER_CREATE: 'vezne.transfer.create',
  VEZNE_TRANSFER_CORRECT: 'vezne.transfer.correct',
  VEZNE_BULK_TRANSFER: 'vezne.bulkTransfer',
  VEZNE_RATE_CONTROL: 'vezne.rateControl',
  VEZNE_MONITOR: 'vezne.monitor',
  VEZNE_BANKNOTE_COUNT: 'vezne.banknoteCount',
  VEZNE_LIST: 'vezne.list',
  VEZNE_BALANCE_REPORT: 'vezne.balanceReport',
  VEZNE_RECEIPT_TRANSFER: 'vezne.receiptTransfer',
  VEZNE_RECEIPT_POST: 'vezne.receiptPost',

  // Kur
  RATE_RAW_FREE: 'rate.rawFree',
  RATE_FREE: 'rate.free',
  RATE_OLD: 'rate.old',
  RATE_CLOSING: 'rate.closing',
  RATE_DEFINITION: 'rate.definition',

  // Yonetici
  MANAGER_RATE_FREE: 'manager.rateFree',
  MANAGER_RECEIPT: 'manager.receipt',
  MANAGER_TRANSFER: 'manager.transfer',
  MANAGER_CASH_MOVEMENT: 'manager.cashMovement',
  MANAGER_CUSTOMER_MOVEMENT: 'manager.customerMovement',
  MANAGER_BULK_TRANSFER: 'manager.bulkTransfer',
  MANAGER_MONITOR: 'manager.monitor',
  MANAGER_BANKNOTE: 'manager.banknote',
  MANAGER_REPORTS: 'manager.reports',
  MANAGER_DAY_END: 'manager.dayEnd',

  // Raporlar
  REPORT_RECEIPT_LIST: 'report.receiptList',
  REPORT_DAILY_DETAIL: 'report.dailyDetail',
  REPORT_PROFITABILITY: 'report.profitability',
  REPORT_PERSONNEL: 'report.personnel',

  // Kasa
  CASH_ACCOUNT_CREATE: 'cash.account.create',
  CASH_ACCOUNT_CORRECT: 'cash.account.correct',
  CASH_MOVEMENT_CREATE: 'cash.movement.create',
  CASH_MOVEMENT_CORRECT: 'cash.movement.correct',
  CASH_LEDGER: 'cash.ledger',
  CASH_LIST: 'cash.list',
  CASH_DETAIL: 'cash.detail',
  CASH_BALANCE: 'cash.balance',
  CASH_ACCOUNT_NAMES: 'cash.accountNames',

  // Cari
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_CORRECT: 'customer.correct',
  CUSTOMER_MOVEMENT_CREATE: 'customer.movement.create',
  CUSTOMER_MOVEMENT_CORRECT: 'customer.movement.correct',
  CUSTOMER_LIST: 'customer.list',
  CUSTOMER_DETAIL: 'customer.detail',
  CUSTOMER_BALANCE: 'customer.balance',

  // Sapma & degisiklik
  RATE_DEVIATION_MONITOR: 'rateDeviation.monitor',
  RATE_DEVIATION_REPORT: 'rateDeviation.report',
  CHANGE_MONITOR: 'change.monitor',
  CHANGE_REPORT: 'change.report',

  // Muhasebe
  ACCOUNTING_ACCOUNT_CREATE: 'accounting.account.create',
  ACCOUNTING_ACCOUNT_CORRECT: 'accounting.account.correct',
  ACCOUNTING_VOUCHER_CREATE: 'accounting.voucher.create',
  ACCOUNTING_VOUCHER_CORRECT: 'accounting.voucher.correct',
  ACCOUNTING_OPENING_VOUCHER: 'accounting.openingVoucher',
  ACCOUNTING_CLOSING_VOUCHER: 'accounting.closingVoucher',
  ACCOUNTING_FISCAL_YEAR: 'accounting.fiscalYear',
  ACCOUNTING_LEDGER: 'accounting.ledger',

  // Teknik
  TECH_JOB_DEFINITION: 'tech.jobDefinition',
  TECH_PERMISSION: 'tech.permission',
  TECH_GENERAL: 'tech.general',
  TECH_PHONE: 'tech.phone',
  TECH_BACKUP: 'tech.backup',
  TECH_FORMAT: 'tech.format',
  TECH_FILES: 'tech.files',

  // Admin
  ADMIN_USERS: 'admin.users',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_BRANCHES: 'admin.branches',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];