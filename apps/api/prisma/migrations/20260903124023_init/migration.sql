-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "Country" AS ENUM ('TR', 'IQ');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('RAW_FREE', 'FREE', 'CLOSING');

-- CreateEnum
CREATE TYPE "RateSource" AS ENUM ('RAW_FREE', 'FREE', 'CLOSING', 'MARKET', 'MANUAL');

-- CreateEnum
CREATE TYPE "CashDrawerStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('BUY', 'SELL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashMovementDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CustomerMovementDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('OPENING', 'CLOSING', 'NORMAL', 'CORRECTION');

-- CreateEnum
CREATE TYPE "DayEndStatus" AS ENUM ('OPEN', 'CLOSING', 'CLOSED');

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255),
    "phone" VARCHAR(30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "country" "Country" NOT NULL DEFAULT 'TR',
    "timezone" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "module" VARCHAR(40) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "roleId" TEXT NOT NULL,
    "language" VARCHAR(8) NOT NULL DEFAULT 'tr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBranchAssignment" (
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserBranchAssignment_pkey" PRIMARY KEY ("userId","branchId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(45),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" VARCHAR(8) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "symbol" VARCHAR(8) NOT NULL,
    "decimalDigits" INTEGER NOT NULL DEFAULT 2,
    "buySpread" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "sellSpread" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" TEXT NOT NULL,
    "country" "Country" NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "bsmvRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "kdvRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "cbkRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "minAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "exempted" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "rateType" "RateType" NOT NULL,
    "buyRate" DECIMAL(20,8) NOT NULL,
    "sellRate" DECIMAL(20,8) NOT NULL,
    "rawBuyRate" DECIMAL(20,8),
    "rawSellRate" DECIMAL(20,8),
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(255),
    "createdById" TEXT,
    "enteredBy" TEXT,
    "enteredAt" TIMESTAMP(3),
    "source" "RateSource" NOT NULL DEFAULT 'MANUAL',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateDeviationLog" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "rateType" "RateType" NOT NULL,
    "previousRate" DECIMAL(20,8) NOT NULL,
    "newRate" DECIMAL(20,8) NOT NULL,
    "deviation" DECIMAL(20,8) NOT NULL,
    "deviationPct" DECIMAL(10,4) NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" VARCHAR(45),
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateDeviationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrawer" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "CashDrawerStatus" NOT NULL DEFAULT 'CLOSED',
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "openingBalance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashDrawer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VezneReceiptSequence" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VezneReceiptSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VezneReceipt" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashDrawerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receiptNo" VARCHAR(40) NOT NULL,
    "receiptType" "ReceiptType" NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "foreignAmount" DECIMAL(20,4) NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "tryAmount" DECIMAL(20,4) NOT NULL,
    "customerId" TEXT,
    "customerName" VARCHAR(150),
    "description" VARCHAR(255),
    "status" "ReceiptStatus" NOT NULL DEFAULT 'POSTED',
    "originalId" TEXT,
    "correctionReason" VARCHAR(255),
    "voidReason" VARCHAR(255),
    "postedAt" TIMESTAMP(3),
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VezneReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VezneTransfer" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "fromDrawerId" TEXT NOT NULL,
    "toDrawerId" TEXT,
    "currencyCode" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" VARCHAR(255),
    "userId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VezneTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VezneBanknoteCount" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashDrawerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "totalAmount" DECIMAL(20,4) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "note" VARCHAR(255),
    "countDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VezneBanknoteCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "debit" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "description" VARCHAR(255),
    "refType" VARCHAR(40),
    "refId" TEXT,
    "txnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "direction" "CashMovementDirection" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "description" VARCHAR(255),
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(20),
    "fullName" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(150),
    "taxNumber" VARCHAR(30),
    "address" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMovement" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "direction" "CustomerMovementDirection" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "foreignAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "foreignCurrency" VARCHAR(8),
    "rate" DECIMAL(20,8),
    "refType" VARCHAR(40),
    "refId" TEXT,
    "description" VARCHAR(255),
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAccount" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "parentCode" VARCHAR(20),
    "type" VARCHAR(20) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingVoucher" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "voucherNo" VARCHAR(40) NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "voucherDate" TIMESTAMP(3) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "totalDebit" DECIMAL(20,4) NOT NULL,
    "totalCredit" DECIMAL(20,4) NOT NULL,
    "userId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccountingVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingVoucherLine" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "debit" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "description" VARCHAR(255),

    CONSTRAINT "AccountingVoucherLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchFiscalYear" (
    "branchId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BranchFiscalYear_pkey" PRIMARY KEY ("branchId","fiscalYearId")
);

-- CreateTable
CREATE TABLE "DayEnd" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "status" "DayEndStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeAuditLog" (
    "id" TEXT NOT NULL,
    "entity" VARCHAR(80) NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" VARCHAR(500),
    "userId" TEXT,
    "branchId" TEXT,
    "ip" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "size" BIGINT NOT NULL,
    "storagePath" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "note" VARCHAR(255),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneDefinition" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "number" VARCHAR(40) NOT NULL,
    "branchId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "JobDefinition" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "cron" VARCHAR(40),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TaxProfile_country_currencyCode_active_idx" ON "TaxProfile"("country", "currencyCode", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_country_currencyCode_key" ON "TaxProfile"("country", "currencyCode");

-- CreateIndex
CREATE INDEX "ExchangeRate_branchId_currencyCode_rateType_effectiveAt_idx" ON "ExchangeRate"("branchId", "currencyCode", "rateType", "effectiveAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_branchId_isLocked_idx" ON "ExchangeRate"("branchId", "isLocked");

-- CreateIndex
CREATE INDEX "RateDeviationLog_branchId_currencyCode_createdAt_idx" ON "RateDeviationLog"("branchId", "currencyCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashDrawer_branchId_code_key" ON "CashDrawer"("branchId", "code");

-- CreateIndex
CREATE INDEX "VezneReceiptSequence_branchId_date_idx" ON "VezneReceiptSequence"("branchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VezneReceiptSequence_branchId_date_key" ON "VezneReceiptSequence"("branchId", "date");

-- CreateIndex
CREATE INDEX "VezneReceipt_branchId_receiptDate_idx" ON "VezneReceipt"("branchId", "receiptDate");

-- CreateIndex
CREATE INDEX "VezneReceipt_userId_receiptDate_idx" ON "VezneReceipt"("userId", "receiptDate");

-- CreateIndex
CREATE INDEX "VezneReceipt_branchId_receiptNo_idx" ON "VezneReceipt"("branchId", "receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "CashAccount_branchId_code_key" ON "CashAccount"("branchId", "code");

-- CreateIndex
CREATE INDEX "CashTransaction_branchId_cashAccountId_txnDate_idx" ON "CashTransaction"("branchId", "cashAccountId", "txnDate");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_branchId_code_key" ON "Customer"("branchId", "code");

-- CreateIndex
CREATE INDEX "CustomerMovement_branchId_customerId_movementDate_idx" ON "CustomerMovement"("branchId", "customerId", "movementDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccount_code_key" ON "AccountingAccount"("code");

-- CreateIndex
CREATE INDEX "AccountingAccount_code_idx" ON "AccountingAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingVoucher_branchId_voucherNo_key" ON "AccountingVoucher"("branchId", "voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYear_year_key" ON "FiscalYear"("year");

-- CreateIndex
CREATE UNIQUE INDEX "DayEnd_branchId_businessDate_key" ON "DayEnd"("branchId", "businessDate");

-- CreateIndex
CREATE INDEX "ChangeAuditLog_entity_entityId_idx" ON "ChangeAuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "ChangeAuditLog_userId_createdAt_idx" ON "ChangeAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeAuditLog_branchId_entity_createdAt_idx" ON "ChangeAuditLog"("branchId", "entity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobDefinition_code_key" ON "JobDefinition"("code");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchAssignment" ADD CONSTRAINT "UserBranchAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchAssignment" ADD CONSTRAINT "UserBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxProfile" ADD CONSTRAINT "TaxProfile_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDeviationLog" ADD CONSTRAINT "RateDeviationLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDeviationLog" ADD CONSTRAINT "RateDeviationLog_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDeviationLog" ADD CONSTRAINT "RateDeviationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawer" ADD CONSTRAINT "CashDrawer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneReceipt" ADD CONSTRAINT "VezneReceipt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneReceipt" ADD CONSTRAINT "VezneReceipt_cashDrawerId_fkey" FOREIGN KEY ("cashDrawerId") REFERENCES "CashDrawer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneReceipt" ADD CONSTRAINT "VezneReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneReceipt" ADD CONSTRAINT "VezneReceipt_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneReceipt" ADD CONSTRAINT "VezneReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneReceipt" ADD CONSTRAINT "VezneReceipt_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "VezneReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneTransfer" ADD CONSTRAINT "VezneTransfer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneTransfer" ADD CONSTRAINT "VezneTransfer_fromDrawerId_fkey" FOREIGN KEY ("fromDrawerId") REFERENCES "CashDrawer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneTransfer" ADD CONSTRAINT "VezneTransfer_toDrawerId_fkey" FOREIGN KEY ("toDrawerId") REFERENCES "CashDrawer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneTransfer" ADD CONSTRAINT "VezneTransfer_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneTransfer" ADD CONSTRAINT "VezneTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneBanknoteCount" ADD CONSTRAINT "VezneBanknoteCount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneBanknoteCount" ADD CONSTRAINT "VezneBanknoteCount_cashDrawerId_fkey" FOREIGN KEY ("cashDrawerId") REFERENCES "CashDrawer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneBanknoteCount" ADD CONSTRAINT "VezneBanknoteCount_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VezneBanknoteCount" ADD CONSTRAINT "VezneBanknoteCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMovement" ADD CONSTRAINT "CustomerMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMovement" ADD CONSTRAINT "CustomerMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMovement" ADD CONSTRAINT "CustomerMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMovement" ADD CONSTRAINT "CustomerMovement_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingVoucher" ADD CONSTRAINT "AccountingVoucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingVoucher" ADD CONSTRAINT "AccountingVoucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingVoucherLine" ADD CONSTRAINT "AccountingVoucherLine_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "AccountingVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingVoucherLine" ADD CONSTRAINT "AccountingVoucherLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingVoucherLine" ADD CONSTRAINT "AccountingVoucherLine_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchFiscalYear" ADD CONSTRAINT "BranchFiscalYear_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchFiscalYear" ADD CONSTRAINT "BranchFiscalYear_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayEnd" ADD CONSTRAINT "DayEnd_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayEnd" ADD CONSTRAINT "DayEnd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeAuditLog" ADD CONSTRAINT "ChangeAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeAuditLog" ADD CONSTRAINT "ChangeAuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
