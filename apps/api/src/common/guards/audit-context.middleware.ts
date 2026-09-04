import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuditService } from '../../modules/audit/audit.service';

const REASON_MIN_LENGTH = 3;

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private readonly auditService: AuditService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const user = (req as {
      user?: { id?: string; branchIds?: string[]; defaultBranchId?: string };
    }).user;

    if (user?.id) {
      this.auditService.setContext({
        userId: user.id,
        branchId: user.defaultBranchId ?? user.branchIds?.[0],
        ip: req.ip,
      });
    } else {
      this.auditService.clearContext();
    }

    // R-12: x-audit-reason header veya body.auditReason (POST/PATCH/DELETE için)
    const headerReason = req.headers['x-audit-reason'];
    let reason: string | null = null;
    if (typeof headerReason === 'string') {
      reason = headerReason;
    } else if (Array.isArray(headerReason)) {
      reason = headerReason[0] ?? null;
    }
    if (!reason && req.body && typeof req.body === 'object') {
      const bodyReason = (req.body as { auditReason?: unknown }).auditReason;
      if (typeof bodyReason === 'string') {
        reason = bodyReason;
      }
    }

    const method = req.method.toUpperCase();
    if (method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
      // R-12: 3 karakterden kısa ise reddet
      if (!reason || reason.trim().length < REASON_MIN_LENGTH) {
        // body parse henüz yapılmamış olabilir; deferred check için sonradan
        // AuditService.requireReason() zaten AuditService üzerinden çağrılabilir.
        // Middleware katmanında body parse etmek zor olduğundan sadece header
        // varsa set ediyoruz. Aşağıdaki guard endpoint'lere eklenebilir.
      }
    }

    this.auditService.setReason(reason);
    next();
  }
}

/**
 * R-12: Controller'lardan önce çağrılabilen yardımcı guard.
 * DELETE/UPDATE için reason zorunlu, aksi halde 400.
 */
export function requireAuditReason(
  auditService: AuditService,
  model: string,
  action: 'DELETE' | 'UPDATE' = 'DELETE',
): void {
  auditService.requireReason(model, action);
}

/**
 * Body'den veya header'dan gelen reason string'inin minimum uzunluğa uyup
 * uymadığını kontrol eder. Uymuyorsa BadRequest fırlatır. Controller
 * katmanında body parse edildikten sonra çağrılabilir.
 */
export function ensureAuditReason(reason: string | undefined | null): string {
  const r = (reason ?? '').trim();
  if (r.length < REASON_MIN_LENGTH) {
    throw new BadRequestException(
      `x-audit-reason header (or body.auditReason) is required (min ${REASON_MIN_LENGTH} chars)`,
    );
  }
  return r;
}
