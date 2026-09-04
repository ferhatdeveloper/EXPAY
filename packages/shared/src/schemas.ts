import { z } from 'zod';
import {
  CurrencyCode,
  RateType,
  ReceiptType,
  TransferStatus,
  VoucherType,
} from './enums';

export const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  branchId: z.string().uuid().optional(),
});

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  fullName: z.string().min(2).max(150),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100),
  roleId: z.string().uuid(),
  branchIds: z.array(z.string().uuid()).min(1),
  active: z.boolean().default(true),
});

export const CreateBranchSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(150),
  address: z.string().optional(),
  phone: z.string().optional(),
  active: z.boolean().default(true),
});

export const CreateCurrencySchema = z.object({
  code: z.nativeEnum(CurrencyCode),
  name: z.string().min(2).max(80),
  symbol: z.string().min(1).max(8),
  decimalDigits: z.number().int().min(0).max(6).default(2),
  active: z.boolean().default(true),
  buySpread: z.number().min(0).max(100).default(0),
  sellSpread: z.number().min(0).max(100).default(0),
});

export const UpsertExchangeRateSchema = z.object({
  branchId: z.string().uuid(),
  currencyCode: z.nativeEnum(CurrencyCode),
  rateType: z.nativeEnum(RateType),
  buyRate: z.number().positive(),
  sellRate: z.number().positive(),
  rawBuyRate: z.number().positive().optional(),
  rawSellRate: z.number().positive().optional(),
  effectiveAt: z.coerce.date().optional(),
  note: z.string().max(255).optional(),
});

export const CreateVezneReceiptSchema = z.object({
  branchId: z.string().uuid(),
  currencyCode: z.nativeEnum(CurrencyCode),
  receiptType: z.nativeEnum(ReceiptType),
  foreignAmount: z.number().positive(),
  rate: z.number().positive(),
  tryAmount: z.number().positive(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().max(150).optional(),
  description: z.string().max(255).optional(),
  taxCountry: z.enum(['TR', 'IQ']).optional(),
  taxExempted: z.boolean().optional(),
});

export const DraftVezneReceiptSchema = z.object({
  branchId: z.string().uuid(),
  currencyCode: z.nativeEnum(CurrencyCode),
  receiptType: z.nativeEnum(ReceiptType),
  foreignAmount: z.number().positive(),
  rate: z.number().positive(),
  tryAmount: z.number().positive(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().max(150).optional(),
  description: z.string().max(255).optional(),
  taxCountry: z.enum(['TR', 'IQ']).optional(),
  taxExempted: z.boolean().optional(),
});

export const PostVezneReceiptSchema = z.object({
  receiptId: z.string().uuid(),
});

export const VoidVezneReceiptSchema = z.object({
  receiptId: z.string().uuid(),
  reason: z.string().min(3).max(255),
});

export const CorrectVezneReceiptSchema = z.object({
  receiptId: z.string().uuid(),
  reason: z.string().min(3).max(255),
  foreignAmount: z.number().positive().optional(),
  rate: z.number().positive().optional(),
  tryAmount: z.number().positive().optional(),
});

export const CreateVezneTransferSchema = z.object({
  branchId: z.string().uuid(),
  fromCashDrawerId: z.string().uuid(),
  toCashDrawerId: z.string().uuid().optional(),
  currencyCode: z.nativeEnum(CurrencyCode),
  amount: z.number().positive(),
  description: z.string().max(255).optional(),
});

export const BulkTransferToMainSchema = z.object({
  branchId: z.string().uuid(),
  fromCashDrawerId: z.string().uuid(),
  toCashAccountId: z.string().uuid(),
  items: z
    .array(
      z.object({
        currencyCode: z.nativeEnum(CurrencyCode),
        amount: z.number().positive(),
      }),
    )
    .min(1),
  description: z.string().max(255).optional(),
});

export const BanknoteCountSchema = z.object({
  cashDrawerId: z.string().uuid(),
  currencyCode: z.nativeEnum(CurrencyCode),
  denominations: z.array(
    z.object({
      denomValue: z.number().positive(),
      count: z.number().int().nonnegative(),
    }),
  ),
  note: z.string().max(255).optional(),
});

export const CreateCashAccountSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(150),
  currencyCode: z.nativeEnum(CurrencyCode).default(CurrencyCode.TRY),
  active: z.boolean().default(true),
});

export const CreateCashMovementSchema = z.object({
  branchId: z.string().uuid(),
  cashAccountId: z.string().uuid(),
  currencyCode: z.nativeEnum(CurrencyCode),
  direction: z.enum(['IN', 'OUT']),
  amount: z.number().positive(),
  description: z.string().max(255).optional(),
});

export const CreateCustomerSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().min(2).max(20).optional(),
  fullName: z.string().min(2).max(150),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  taxNumber: z.string().max(30).optional(),
  address: z.string().max(255).optional(),
  active: z.boolean().default(true),
});

export const CreateCustomerMovementSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  currencyCode: z.nativeEnum(CurrencyCode),
  direction: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive(),
  description: z.string().max(255).optional(),
});

export const CreateAccountingAccountSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(150),
  parentCode: z.string().max(20).optional(),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  currencyCode: z.nativeEnum(CurrencyCode).default(CurrencyCode.TRY),
  active: z.boolean().default(true),
});

export const CreateAccountingVoucherSchema = z.object({
  branchId: z.string().uuid(),
  voucherType: z.nativeEnum(VoucherType),
  date: z.coerce.date(),
  description: z.string().min(2).max(255),
  lines: z
    .array(
      z.object({
        accountCode: z.string().min(2).max(20),
        currencyCode: z.nativeEnum(CurrencyCode).default(CurrencyCode.TRY),
        debit: z.number().nonnegative().default(0),
        credit: z.number().nonnegative().default(0),
        description: z.string().max(255).optional(),
      }),
    )
    .min(2),
});

export const CreateFiscalYearSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  active: z.boolean().default(true),
});

export const ReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  userId: z.string().uuid().optional(),
  currencyCode: z.nativeEnum(CurrencyCode).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).default(50),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
export type CreateCurrencyInput = z.infer<typeof CreateCurrencySchema>;
export type UpsertExchangeRateInput = z.infer<typeof UpsertExchangeRateSchema>;
export type CreateVezneReceiptInput = z.infer<typeof CreateVezneReceiptSchema>;
export type DraftVezneReceiptInput = z.infer<typeof DraftVezneReceiptSchema>;

/** Ülke kodu (R-07 vergi profili için). */
export type TaxCountry = 'TR' | 'IQ';
export type PostVezneReceiptInput = z.infer<typeof PostVezneReceiptSchema>;
export type VoidVezneReceiptInput = z.infer<typeof VoidVezneReceiptSchema>;
export type CorrectVezneReceiptInput = z.infer<typeof CorrectVezneReceiptSchema>;
export type CreateVezneTransferInput = z.infer<typeof CreateVezneTransferSchema>;
export type BulkTransferToMainInput = z.infer<typeof BulkTransferToMainSchema>;
export type BanknoteCountInput = z.infer<typeof BanknoteCountSchema>;
export type CreateCashAccountInput = z.infer<typeof CreateCashAccountSchema>;
export type CreateCashMovementInput = z.infer<typeof CreateCashMovementSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type CreateCustomerMovementInput = z.infer<typeof CreateCustomerMovementSchema>;
export type CreateAccountingAccountInput = z.infer<typeof CreateAccountingAccountSchema>;
export type CreateAccountingVoucherInput = z.infer<typeof CreateAccountingVoucherSchema>;
export type CreateFiscalYearInput = z.infer<typeof CreateFiscalYearSchema>;
export type ReportQuery = z.infer<typeof ReportQuerySchema>;