import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export interface AuditContext {
  userId?: string;
  branchId?: string;
  ip?: string;
  reason?: string;
}

/**
 * R-12: Prisma middleware — UPDATE / DELETE / CREATE için ChangeAuditLog yazar.
 * `reason` opsiyonel olur, ama R-12 sayesinde DELETE/UPDATE için middleware
 * çağrılmadan önce AuditService.requireReason() ile zorunlu kılınır.
 */
export function registerAuditMiddleware(
  prisma: PrismaService,
  getContext: () => AuditContext,
): void {
  const TRACKED: string[] = [
    'User',
    'Branch',
    'Role',
    'Permission',
    'Currency',
    'ExchangeRate',
    'CashDrawer',
    'VezneReceipt',
    'VezneTransfer',
    'CashAccount',
    'CashTransaction',
    'CashMovement',
    'Customer',
    'CustomerMovement',
    'AccountingAccount',
    'AccountingVoucher',
    'AccountingVoucherLine',
    'FiscalYear',
  ];

  prisma.$use(async (params, next) => {
    if (!TRACKED.includes(params.model ?? '')) return next(params);
    const ctx = getContext();

    if (
      params.action === 'update' ||
      params.action === 'updateMany' ||
      params.action === 'delete' ||
      params.action === 'deleteMany'
    ) {
      let before: unknown = null;
      if (params.action === 'update' || params.action === 'updateMany') {
        try {
          before = await (prisma as unknown as Record<string, { findUnique: (q: unknown) => Promise<unknown> }>)[
            (params.model ?? '').toLowerCase()
          ].findUnique({ where: params.args.where });
        } catch {
          before = null;
        }
      }

      const result = await next(params);

      const action = params.action.startsWith('delete') ? 'DELETE' : 'UPDATE';
      const entityId =
        (params.args?.where as { id?: string } | undefined)?.id ??
        ((result as { id?: string } | undefined)?.id ?? 'unknown');

      try {
        await prisma.changeAuditLog.create({
          data: {
            entity: params.model ?? 'Unknown',
            entityId: String(entityId),
            action,
            changes: before ? { before, after: result } : { args: params.args } as any,
            // R-12: reason forward
            reason: ctx.reason ?? null,
            userId: ctx.userId,
            branchId: ctx.branchId,
            ip: ctx.ip,
          },
        });
      } catch (err) {
        // Don't fail the operation if audit fails
        // eslint-disable-next-line no-console
        console.warn('Audit log write failed', err);
      }
      return result;
    }

    if (params.action === 'create') {
      const result = await next(params);
      try {
        await prisma.changeAuditLog.create({
          data: {
            entity: params.model ?? 'Unknown',
            entityId: (result as { id?: string }).id ?? 'unknown',
            action: 'CREATE',
            changes: { after: result } as any,
            reason: ctx.reason ?? null,
            userId: ctx.userId,
            branchId: ctx.branchId,
            ip: ctx.ip,
          },
        });
      } catch {
        // ignore
      }
      return result;
    }

    return next(params);
  });
}

void Prisma;
