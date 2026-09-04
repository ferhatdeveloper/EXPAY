import { z } from 'zod';

export const TicketCreateSchema = z.object({
  branchId: z.string().uuid().optional(),
  serviceType: z.enum(['BUY', 'SELL', 'TRANSFER', 'OTHER']).default('BUY'),
  priority: z.enum(['NORMAL', 'VIP', 'ELDERLY']).default('NORMAL'),
  customerName: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
});

export const CallTicketSchema = z.object({
  ticketId: z.string().uuid().optional(),
  counterId: z.string().min(1).max(20),
});

export const CompleteTicketSchema = z.object({
  ticketId: z.string().uuid(),
});

export const SkipTicketSchema = z.object({
  ticketId: z.string().uuid(),
  reason: z.string().max(120).optional(),
});

export const CancelTicketSchema = z.object({
  ticketId: z.string().uuid(),
});

export type TicketCreateInput = z.infer<typeof TicketCreateSchema>;
export type CallTicketInput = z.infer<typeof CallTicketSchema>;
export type CompleteTicketInput = z.infer<typeof CompleteTicketSchema>;
export type SkipTicketInput = z.infer<typeof SkipTicketSchema>;
export type CancelTicketInput = z.infer<typeof CancelTicketSchema>;

export const QUEUE_SERVICE_TYPES = ['BUY', 'SELL', 'TRANSFER', 'OTHER'] as const;
export const QUEUE_PRIORITIES = ['NORMAL', 'VIP', 'ELDERLY'] as const;
export const QUEUE_STATUSES = [
  'WAITING',
  'CALLED',
  'SERVING',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;
