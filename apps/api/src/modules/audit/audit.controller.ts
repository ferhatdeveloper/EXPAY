import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from "@doviz/shared";

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /**
   * R-12: Hangi mutasyonlar için reason zorunlu? İstemci tarafı UI için.
   */
  @Get('reasons')
  @RequirePermission('change.report')
  reasons() {
    return this.audit.listReasonRequirements();
  }

  @Get('changes')
  @RequirePermission('change.report')
  list(
    @CurrentUser() _user: AuthUser,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.audit.list({
      entity,
      userId,
      branchId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }
}