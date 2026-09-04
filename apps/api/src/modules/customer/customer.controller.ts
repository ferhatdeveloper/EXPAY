import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateCustomerMovementSchema, CreateCustomerSchema } from '@doviz/shared';
import { CustomerService } from './customer.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from "@doviz/shared";

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get()
  @RequirePermission('customer.list')
  list(@Query('branchId') branchId?: string, @Query('q') q?: string) {
    return this.service.list(branchId, q);
  }

  @Get(':id')
  @RequirePermission('customer.detail')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get(':id/detail')
  @RequirePermission('customer.detail')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  @RequirePermission('customer.create')
  create(@Body(new ZodValidationPipe(CreateCustomerSchema)) input: any) {
    return this.service.create(input as never);
  }

  @Patch(':id')
  @RequirePermission('customer.correct')
  update(@Param('id') id: string, @Body() input: any) {
    return this.service.update(id, input as never);
  }

  @Delete(':id')
  @RequirePermission('customer.correct')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @Post('movements')
  @RequirePermission('customer.movement.create')
  createMovement(@Body(new ZodValidationPipe(CreateCustomerMovementSchema)) input: any, @CurrentUser() user: AuthUser) {
    return this.service.createMovement(input as never, user);
  }

  @Post('movements/:id/correct')
  @RequirePermission('customer.movement.correct')
  correct(@Param('id') id: string, @Body('reason') reason: string) {
    return this.service.correctMovement(id, reason);
  }

  @Get('movements/list')
  @RequirePermission('customer.list')
  listMovements(@Query('branchId') branchId: string, @Query('customerId') customerId?: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.movements(branchId, customerId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }

  @Get('balances/all')
  @RequirePermission('customer.balance')
  balances(@Query('branchId') branchId: string) {
    return this.service.balances(branchId);
  }
}