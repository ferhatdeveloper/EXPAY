import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RolesPermissionsService } from './roles-permissions.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesPermissionsController {
  constructor(private readonly service: RolesPermissionsService) {}

  @Get('permissions')
  @RequirePermission('admin.roles')
  listPermissions() {
    return this.service.listPermissions();
  }

  @Get('roles')
  @RequirePermission('admin.roles')
  listRoles() {
    return this.service.listRoles();
  }

  @Get('roles/:id')
  @RequirePermission('admin.roles')
  getRole(@Param('id') id: string) {
    return this.service.getRole(id);
  }

  @Post('roles')
  @RequirePermission('admin.roles')
  createRole(@Body() input: { code: string; name: string; description?: string; permissionIds?: string[] }) {
    return this.service.createRole(input);
  }

  @Patch('roles/:id')
  @RequirePermission('admin.roles')
  updateRole(@Param('id') id: string, @Body() input: { name?: string; description?: string; active?: boolean; permissionIds?: string[] }) {
    return this.service.updateRole(id, input);
  }
}