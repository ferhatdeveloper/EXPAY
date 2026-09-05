import { PrismaClient, RateType } from '@prisma/client';
import { CurrencyCode } from '@doviz/shared';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Dashboard
  { code: 'dashboard.view', module: 'dashboard' },
  // Vezne
  { code: 'vezne.view', module: 'vezne' },
  { code: 'vezne.receipt.create', module: 'vezne' },
  { code: 'vezne.receipt.correct', module: 'vezne' },
  { code: 'vezne.transfer.create', module: 'vezne' },
  { code: 'vezne.transfer.correct', module: 'vezne' },
  { code: 'vezne.bulkTransfer', module: 'vezne' },
  { code: 'vezne.rateControl', module: 'vezne' },
  { code: 'vezne.monitor', module: 'vezne' },
  { code: 'vezne.banknoteCount', module: 'vezne' },
  { code: 'vezne.list', module: 'vezne' },
  { code: 'vezne.balanceReport', module: 'vezne' },
  { code: 'vezne.receiptTransfer', module: 'vezne' },
  { code: 'vezne.receiptPost', module: 'vezne' },
  // Rate
  { code: 'rate.rawFree', module: 'rate' },
  { code: 'rate.free', module: 'rate' },
  { code: 'rate.old', module: 'rate' },
  { code: 'rate.closing', module: 'rate' },
  { code: 'rate.definition', module: 'rate' },
  { code: 'rate.update', module: 'rate' },
  { code: 'rate.view', module: 'rate' },
  // Manager
  { code: 'manager.rateFree', module: 'manager' },
  { code: 'manager.receipt', module: 'manager' },
  { code: 'manager.transfer', module: 'manager' },
  { code: 'manager.cashMovement', module: 'manager' },
  { code: 'manager.customerMovement', module: 'manager' },
  { code: 'manager.bulkTransfer', module: 'manager' },
  { code: 'manager.monitor', module: 'manager' },
  { code: 'manager.banknote', module: 'manager' },
  { code: 'manager.reports', module: 'manager' },
  { code: 'manager.dayEnd', module: 'manager' },
  // Reports
  { code: 'report.receiptList', module: 'report' },
  { code: 'report.dailyDetail', module: 'report' },
  { code: 'report.profitability', module: 'report' },
  { code: 'report.personnel', module: 'report' },
  // Cash
  { code: 'cash.account.create', module: 'cash' },
  { code: 'cash.account.correct', module: 'cash' },
  { code: 'cash.movement.create', module: 'cash' },
  { code: 'cash.movement.correct', module: 'cash' },
  { code: 'cash.ledger', module: 'cash' },
  { code: 'cash.list', module: 'cash' },
  { code: 'cash.detail', module: 'cash' },
  { code: 'cash.balance', module: 'cash' },
  { code: 'cash.accountNames', module: 'cash' },
  // Customer
  { code: 'customer.create', module: 'customer' },
  { code: 'customer.correct', module: 'customer' },
  { code: 'customer.movement.create', module: 'customer' },
  { code: 'customer.movement.correct', module: 'customer' },
  { code: 'customer.list', module: 'customer' },
  { code: 'customer.detail', module: 'customer' },
  { code: 'customer.balance', module: 'customer' },
  // Emanet (Trust / Custody)
  { code: 'customer.emanetView', module: 'customer' },
  { code: 'customer.emanetCreate', module: 'customer' },
  { code: 'customer.emanetRelease', module: 'customer' },
  { code: 'customer.emanetAdjust', module: 'customer' },
  // Deviations
  { code: 'rateDeviation.monitor', module: 'rateDeviation' },
  { code: 'rateDeviation.report', module: 'rateDeviation' },
  { code: 'change.monitor', module: 'change' },
  { code: 'change.report', module: 'change' },
  // Accounting
  { code: 'accounting.account.create', module: 'accounting' },
  { code: 'accounting.account.correct', module: 'accounting' },
  { code: 'accounting.voucher.create', module: 'accounting' },
  { code: 'accounting.voucher.correct', module: 'accounting' },
  { code: 'accounting.openingVoucher', module: 'accounting' },
  { code: 'accounting.closingVoucher', module: 'accounting' },
  { code: 'accounting.fiscalYear', module: 'accounting' },
  { code: 'accounting.ledger', module: 'accounting' },
  // Technical
  { code: 'tech.jobDefinition', module: 'tech' },
  { code: 'tech.permission', module: 'tech' },
  { code: 'tech.general', module: 'tech' },
  { code: 'tech.phone', module: 'tech' },
  { code: 'tech.backup', module: 'tech' },
  { code: 'tech.format', module: 'tech' },
  { code: 'tech.files', module: 'tech' },
  // Admin
  { code: 'admin.users', module: 'admin' },
  { code: 'admin.roles', module: 'admin' },
  { code: 'admin.branches', module: 'admin' },
  { code: 'admin.systemSettings', module: 'admin' },
  { code: 'settings.view', module: 'settings' },
  { code: 'settings.update', module: 'settings' },
  // Queue (Müşteri Bilgi Ekranı + Sıra Sistemi)
  { code: 'customerDisplay.view', module: 'queue' },
  { code: 'queue.create', module: 'queue' },
  { code: 'queue.call', module: 'queue' },
  { code: 'queue.complete', module: 'queue' },
];

const CURRENCIES: Array<{
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimalDigits: number;
}> = [
  { code: CurrencyCode.TRY, name: 'Turk Lirasi', symbol: 'TL', decimalDigits: 2 },
  { code: CurrencyCode.USD, name: 'US Dollar', symbol: '$', decimalDigits: 2 },
  { code: CurrencyCode.EUR, name: 'Euro', symbol: 'EUR', decimalDigits: 2 },
  { code: CurrencyCode.GBP, name: 'British Pound', symbol: 'GBP', decimalDigits: 2 },
  { code: CurrencyCode.CHF, name: 'Swiss Franc', symbol: 'CHF', decimalDigits: 2 },
  { code: CurrencyCode.JPY, name: 'Japanese Yen', symbol: 'JPY', decimalDigits: 0 },
  { code: CurrencyCode.AUD, name: 'Australian Dollar', symbol: 'AUD', decimalDigits: 2 },
  { code: CurrencyCode.CAD, name: 'Canadian Dollar', symbol: 'CAD', decimalDigits: 2 },
  { code: CurrencyCode.SAR, name: 'Saudi Riyal', symbol: 'SAR', decimalDigits: 2 },
  { code: CurrencyCode.AED, name: 'UAE Dirham', symbol: 'AED', decimalDigits: 2 },
  { code: CurrencyCode.KWD, name: 'Kuwaiti Dinar', symbol: 'KWD', decimalDigits: 3 },
  { code: CurrencyCode.RUB, name: 'Russian Ruble', symbol: 'RUB', decimalDigits: 2 },
  { code: CurrencyCode.CNY, name: 'Chinese Yuan', symbol: 'CNY', decimalDigits: 2 },
  { code: CurrencyCode.IRR, name: 'Iranian Rial', symbol: 'IRR', decimalDigits: 0 },
  { code: CurrencyCode.IQD, name: 'Iraqi Dinar', symbol: 'IQD', decimalDigits: 0 },
  { code: CurrencyCode.SEK, name: 'Swedish Krona', symbol: 'SEK', decimalDigits: 2 },
  { code: CurrencyCode.NOK, name: 'Norwegian Krone', symbol: 'NOK', decimalDigits: 2 },
  { code: CurrencyCode.DKK, name: 'Danish Krone', symbol: 'DKK', decimalDigits: 2 },
  { code: CurrencyCode.PLN, name: 'Polish Zloty', symbol: 'PLN', decimalDigits: 2 },
  { code: CurrencyCode.ZAR, name: 'South African Rand', symbol: 'ZAR', decimalDigits: 2 },
  { code: CurrencyCode.MXN, name: 'Mexican Peso', symbol: 'MXN', decimalDigits: 2 },
  { code: CurrencyCode.BRL, name: 'Brazilian Real', symbol: 'BRL', decimalDigits: 2 },
  { code: CurrencyCode.INR, name: 'Indian Rupee', symbol: 'INR', decimalDigits: 2 },
  { code: CurrencyCode.PKR, name: 'Pakistani Rupee', symbol: 'PKR', decimalDigits: 2 },
  { code: CurrencyCode.EGP, name: 'Egyptian Pound', symbol: 'EGP', decimalDigits: 2 },
  { code: CurrencyCode.JOD, name: 'Jordanian Dinar', symbol: 'JOD', decimalDigits: 3 },
  { code: CurrencyCode.LBP, name: 'Lebanese Pound', symbol: 'LBP', decimalDigits: 0 },
  { code: CurrencyCode.SYP, name: 'Syrian Pound', symbol: 'SYP', decimalDigits: 0 },
  { code: CurrencyCode.AZN, name: 'Azerbaijani Manat', symbol: 'AZN', decimalDigits: 2 },
  { code: CurrencyCode.GEL, name: 'Georgian Lari', symbol: 'GEL', decimalDigits: 2 },
  { code: CurrencyCode.BAM, name: 'Bosnia Mark', symbol: 'BAM', decimalDigits: 2 },
  { code: CurrencyCode.QAR, name: 'Qatari Riyal', symbol: 'QAR', decimalDigits: 2 },
  { code: CurrencyCode.OMR, name: 'Omani Rial', symbol: 'OMR', decimalDigits: 3 },
  { code: CurrencyCode.BHD, name: 'Bahraini Dinar', symbol: 'BHD', decimalDigits: 3 },
];

async function main() {
  // Permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { module: p.module },
      create: p,
    });
  }

  // Currencies
  for (const c of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol, decimalDigits: c.decimalDigits },
      create: c,
    });
  }

  // Branches — TR merkez + IQ Erbil şubesi (R-07)
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'MAIN' },
    update: { country: 'TR', timezone: 'Europe/Istanbul' },
    create: {
      code: 'MAIN',
      name: 'Merkez Sube (Istanbul)',
      address: 'Merkez Mah.',
      phone: '+90 000 000 00 00',
      country: 'TR',
      timezone: 'Europe/Istanbul',
    },
  });
  const iqBranch = await prisma.branch.upsert({
    where: { code: 'IQ-ERB' },
    update: { country: 'IQ', timezone: 'Asia/Baghdad' },
    create: {
      code: 'IQ-ERB',
      name: 'Erbil Sube (Iraq)',
      address: '60m St., Erbil',
      phone: '+964 000 000 00 00',
      country: 'IQ',
      timezone: 'Asia/Baghdad',
    },
  });

  // Roles
  const allPermissions = await prisma.permission.findMany();
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: { code: 'ADMIN', name: 'Administrator', isSystem: true },
  });
  const cashierRole = await prisma.role.upsert({
    where: { code: 'CASHIER' },
    update: {},
    create: { code: 'CASHIER', name: 'Veznedar', isSystem: true },
  });
  const managerRole = await prisma.role.upsert({
    where: { code: 'MANAGER' },
    update: {},
    create: { code: 'MANAGER', name: 'Yonetici', isSystem: true },
  });

  // Assign all permissions to admin
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  });

  // Cashier permissions
  const cashierPerms = allPermissions.filter((p) =>
    p.code.startsWith('dashboard') || p.code.startsWith('vezne') || p.code.startsWith('rate') || p.code.startsWith('report'),
  );
  await prisma.rolePermission.deleteMany({ where: { roleId: cashierRole.id } });
  await prisma.rolePermission.createMany({
    data: cashierPerms.map((p) => ({ roleId: cashierRole.id, permissionId: p.id })),
  });

  // Manager permissions
  const managerPerms = allPermissions.filter((p) => !p.code.startsWith('tech') && !p.code.startsWith('admin'));
  await prisma.rolePermission.deleteMany({ where: { roleId: managerRole.id } });
  await prisma.rolePermission.createMany({
    data: managerPerms.map((p) => ({ roleId: managerRole.id, permissionId: p.id })),
  });

  // Admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'System Administrator',
      email: 'admin@doviz.local',
      passwordHash,
      roleId: adminRole.id,
      language: 'tr',
    },
  });

  await prisma.userBranchAssignment.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: mainBranch.id } },
    update: { isDefault: true },
    create: { userId: adminUser.id, branchId: mainBranch.id, isDefault: true },
  });

  // Cashier user
  const cashierHash = await bcrypt.hash('vezne123', 10);
  const cashierUser = await prisma.user.upsert({
    where: { username: 'vezne' },
    update: {},
    create: {
      username: 'vezne',
      fullName: 'Demo Veznedar',
      passwordHash: cashierHash,
      roleId: cashierRole.id,
    },
  });
  await prisma.userBranchAssignment.upsert({
    where: { userId_branchId: { userId: cashierUser.id, branchId: mainBranch.id } },
    update: {},
    create: { userId: cashierUser.id, branchId: mainBranch.id, isDefault: true },
  });

  // Cash drawer
  await prisma.cashDrawer.upsert({
    where: { branchId_code: { branchId: mainBranch.id, code: 'V01' } },
    update: {},
    create: { branchId: mainBranch.id, code: 'V01', name: 'Ana Vezne' },
  });

  // Cash account (TRY)
  await prisma.cashAccount.upsert({
    where: { branchId_code: { branchId: mainBranch.id, code: 'K01' } },
    update: {},
    create: { branchId: mainBranch.id, code: 'K01', name: 'Ana Kasa TRY', currencyCode: 'TRY' },
  });

  // Seed a default exchange rate
  await prisma.exchangeRate.upsert({
    where: { id: 'seed-rate-usd-free' },
    update: {},
    create: {
      id: 'seed-rate-usd-free',
      branchId: mainBranch.id,
      currencyCode: 'USD',
      rateType: RateType.FREE,
      buyRate: 32.0,
      sellRate: 32.5,
      createdById: adminUser.id,
    },
  });

  // Fiscal year
  const year = new Date().getFullYear();
  await prisma.fiscalYear.upsert({
    where: { year },
    update: {},
    create: {
      year,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
      active: true,
    },
  });
  const fy = await prisma.fiscalYear.findUnique({ where: { year } });
  if (fy) {
    await prisma.branchFiscalYear.upsert({
      where: { branchId_fiscalYearId: { branchId: mainBranch.id, fiscalYearId: fy.id } },
      update: { isCurrent: true },
      create: { branchId: mainBranch.id, fiscalYearId: fy.id, isCurrent: true },
    });
    // IQ şubesi için de ayni mali yıl
    await prisma.branchFiscalYear.upsert({
      where: { branchId_fiscalYearId: { branchId: iqBranch.id, fiscalYearId: fy.id } },
      update: { isCurrent: true },
      create: { branchId: iqBranch.id, fiscalYearId: fy.id, isCurrent: true },
    });
  }

  // Seed tax profiles (R-07)
  // TR: BSMV binde 1, kambiyo KDV muaf (0), TRY tabanı 100 TL üzeri
  // IQ: CBK yüzde 1, IQD tabanı 1000 IQD üzeri
  const taxProfiles = [
    { country: 'TR', currencyCode: 'TRY', bsmvRate: 0, kdvRate: 0, cbkRate: 0, minAmount: 0, exempted: true, active: false, description: 'TRY muaf' },
    { country: 'TR', currencyCode: 'USD', bsmvRate: 1, kdvRate: 0, cbkRate: 0, minAmount: 0, exempted: false, active: true, description: 'TR USD BSMV %0.1' },
    { country: 'TR', currencyCode: 'EUR', bsmvRate: 1, kdvRate: 0, cbkRate: 0, minAmount: 0, exempted: false, active: true, description: 'TR EUR BSMV %0.1' },
    { country: 'TR', currencyCode: 'GBP', bsmvRate: 1, kdvRate: 0, cbkRate: 0, minAmount: 0, exempted: false, active: true, description: 'TR GBP BSMV %0.1' },
    { country: 'IQ', currencyCode: 'IQD', bsmvRate: 0, kdvRate: 0, cbkRate: 1, minAmount: 1000, exempted: false, active: true, description: 'IQ IQD CBK %1' },
    { country: 'IQ', currencyCode: 'USD', bsmvRate: 0, kdvRate: 0, cbkRate: 1, minAmount: 100, exempted: false, active: true, description: 'IQ USD CBK %1' },
  ];
  for (const p of taxProfiles) {
    const profileInput = {
      country: p.country as 'TR' | 'IQ',
      currencyCode: p.currencyCode,
      bsmvRate: p.bsmvRate,
      kdvRate: p.kdvRate,
      cbkRate: p.cbkRate,
      minAmount: p.minAmount,
      exempted: p.exempted,
      active: p.active,
      description: p.description,
    };
    await prisma.taxProfile.upsert({
      where: { country_currencyCode: { country: profileInput.country, currencyCode: profileInput.currencyCode } },
      update: {
        bsmvRate: profileInput.bsmvRate,
        kdvRate: profileInput.kdvRate,
        cbkRate: profileInput.cbkRate,
        minAmount: profileInput.minAmount,
        exempted: profileInput.exempted,
        active: profileInput.active,
        description: profileInput.description,
      },
      create: profileInput,
    });
  }

  // IQ şubesi için kasa/drawer
  await prisma.cashDrawer.upsert({
    where: { branchId_code: { branchId: iqBranch.id, code: 'V01' } },
    update: {},
    create: { branchId: iqBranch.id, code: 'V01', name: 'Ana Vezne (IQ)' },
  });
  await prisma.cashAccount.upsert({
    where: { branchId_code: { branchId: iqBranch.id, code: 'K01' } },
    update: {},
    create: { branchId: iqBranch.id, code: 'K01', name: 'Ana Kasa IQD', currencyCode: 'IQD' },
  });

  // IQ admin
  const iqAdminHash = await bcrypt.hash('admin123', 10);
  const iqAdminUser = await prisma.user.upsert({
    where: { username: 'admin_iq' },
    update: {},
    create: {
      username: 'admin_iq',
      fullName: 'IQ Branch Admin',
      passwordHash: iqAdminHash,
      roleId: adminRole.id,
      language: 'tr',
    },
  });
  await prisma.userBranchAssignment.upsert({
    where: { userId_branchId: { userId: iqAdminUser.id, branchId: iqBranch.id } },
    update: { isDefault: true },
    create: { userId: iqAdminUser.id, branchId: iqBranch.id, isDefault: true },
  });

  // Seed default accounting accounts
  const accounts = [
    { code: '100', name: 'Kasa', type: 'ASSET' },
    { code: '102', name: 'Bankalar', type: 'ASSET' },
    { code: '120', name: 'Alicilar', type: 'ASSET' },
    { code: '121', name: 'Alacak Senetleri', type: 'ASSET' },
    { code: '320', name: 'Saticilar', type: 'LIABILITY' },
    { code: '335', name: 'Personele Borclar', type: 'LIABILITY' },
    { code: '360', name: 'Odenecek Vergi', type: 'LIABILITY' },
    { code: '361', name: 'Odenecek Diger Yukl', type: 'LIABILITY' },
    { code: '397', name: 'Sayim Farki', type: 'EXPENSE' },
    { code: '500', name: 'Sermaye', type: 'EQUITY' },
    { code: '600', name: 'Yurtici Satislar', type: 'INCOME' },
    { code: '601', name: 'Yurtdisi Satislar', type: 'INCOME' },
    { code: '646', name: 'Kur Farki Gelir', type: 'INCOME' },
    { code: '656', name: 'Kur Farki Gider', type: 'EXPENSE' },
    { code: '760', name: 'Genel Yonetimi Giderleri', type: 'EXPENSE' },
    { code: '780', name: 'Genel Yonetim Giderleri', type: 'EXPENSE' },
  ];
  for (const a of accounts) {
    await prisma.accountingAccount.upsert({
      where: { code: a.code },
      update: {},
      create: { ...a, currencyCode: 'TRY' },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed tamamlandi. Admin: admin/admin123 | Vezne: vezne/vezne123');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });