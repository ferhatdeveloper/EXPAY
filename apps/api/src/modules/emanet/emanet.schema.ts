import { z } from 'zod';

export const EmanetCreateSchema = z.object({
  customerId: z.string().uuid(),
  branchId: z.string().uuid(),
  currency: z.string().min(2).max(10),
  kind: z.enum(['CURRENCY', 'PRECIOUS_METAL']).default('CURRENCY'),
  metalType: z.string().max(20).optional(),
  weightGrams: z.number().positive().optional(),
  purity: z.number().min(0).max(1).optional(),
  initialAmount: z.number().positive(),
  unit: z.enum(['PIECE', 'GRAM', 'OUNCE']).default('PIECE'),
  entryRate: z.number().positive(),
  storageLocation: z.string().max(80).optional(),
  vaultNumber: z.string().max(40).optional(),
  description: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const EmanetReleaseSchema = z.object({
  emanetId: z.string().uuid(),
  amount: z.number().positive(),
  rateTRY: z.number().positive(),
  receiptId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export const EmanetCloseSchema = z.object({
  emanetId: z.string().uuid(),
  rateTRY: z.number().positive(),
  receiptId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  reason: z.string().max(120).optional(),
});

export const EmanetAdjustSchema = z.object({
  emanetId: z.string().uuid(),
  amount: z.number().refine((v) => v !== 0, { message: 'Amount sıfır olamaz' }),
  rateTRY: z.number().positive(),
  reason: z.string().min(3).max(500),
});

export type EmanetCreateInput = z.infer<typeof EmanetCreateSchema>;
export type EmanetReleaseInput = z.infer<typeof EmanetReleaseSchema>;
export type EmanetCloseInput = z.infer<typeof EmanetCloseSchema>;
export type EmanetAdjustInput = z.infer<typeof EmanetAdjustSchema>;
