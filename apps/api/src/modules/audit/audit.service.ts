import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditContext,
  registerAuditMiddleware,
} from '../../prisma/audit-middleware';

const REASON_MIN_LENGTH = 3;
const ACTIONS_REQUIRING_REASON = ['DELETE', 'UPDATE'];

@Injectable()
export class AuditService {
  private context: AuditContext = {};
  // R-12: request-scoped reason — middleware/interceptor'dan set edilir
  private currentReason: string | null = null;

  constructor(private readonly prisma: PrismaService) {
    registerAuditMiddleware(prisma, () => ({
      ...this.context,
      reason: this.currentReason ?? undefined,
    }));
  }

  setContext(ctx: AuditContext): void {
    this.context = ctx;
  }

  clearContext(): void {
    this.context = {};
    this.currentReason = null;
  }

  /**
   * R-12: per-request olarak audit reason set et. Middleware/interceptor
   * tarafından çağrılır; DELETE/UPDATE mutasyonları için bu zorunlu.
   */
  setReason(reason: string | null | undefined): void {
    if (reason === null || reason === undefined) {
      this.currentReason = null;
      return;
    }
    this.currentReason = reason;
  }

  /**
   * R-12: Belirli bir model/action için reason var mı kontrol et.
   * Yoksa BadRequest fırlatır (HTTP 400 → istemci "x-audit-reason" eksik).
   */
  requireReason(model: string, action: string): void {
    if (!ACTIONS_REQUIRING_REASON.includes(action.toUpperCase())) {
      return;
    }
    const r = (this.currentReason ?? '').trim();
    if (r.length < REASON_MIN_LENGTH) {
      throw new BadRequestException(
        `x-audit-reason header (or body.auditReason) is required for ${action.toUpperCase()} on ${model} (min ${REASON_MIN_LENGTH} chars)`,
      );
    }
  }

  /**
   * Endpoint bazlı zorunlu model+action listesi. İstemci tarafı için.
   */
  listReasonRequirements() {
    return {
      actions: ACTIONS_REQUIRING_REASON,
      models: 'all',
      headerName: 'x-audit-reason',
      bodyField: 'auditReason',
      minLength: REASON_MIN_LENGTH,
    };
  }

  async list(params: {
    entity?: string;
    userId?: string;
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 50, entity, userId, branchId, startDate, endDate } = params;
    const where = {
      ...(entity ? { entity } : {}),
      ...(userId ? { userId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.changeAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, fullName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.changeAuditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
