import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateUserSchema } from '@doviz/shared';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('admin.users')
  list(
    @Query('branchId') branchId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.users.list({
      branchId,
      q,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  @Get(':id')
  @RequirePermission('admin.users')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post()
  @RequirePermission('admin.users')
  create(@Body(new ZodValidationPipe(CreateUserSchema)) input: any) {
    return this.users.create(input as never);
  }

  @Patch(':id')
  @RequirePermission('admin.users')
  update(@Param('id') id: string, @Body() input: { fullName?: string; email?: string; roleId?: string; active?: boolean; language?: string }) {
    return this.users.update(id, input);
  }

  @Post(':id/reset-password')
  @RequirePermission('admin.users')
  reset(@Param('id') id: string, @Body('password') password: string) {
    return this.users.resetPassword(id, password);
  }

  @Delete(':id')
  @RequirePermission('admin.users')
  remove(@Param('id') id: string) {
    return this.users.softDelete(id);
  }
}