import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateBranchSchema } from '@doviz/shared';
import { BranchesService } from './branches.service';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermission('admin.branches')
  list() {
    return this.branches.list();
  }

  @Get(':id')
  @RequirePermission('admin.branches')
  get(@Param('id') id: string) {
    return this.branches.get(id);
  }

  @Post()
  @RequirePermission('admin.branches')
  create(@Body(new ZodValidationPipe(CreateBranchSchema)) input: any) {
    return this.branches.create(input as never);
  }

  @Patch(':id')
  @RequirePermission('admin.branches')
  update(@Param('id') id: string, @Body() input: { name?: string; address?: string; phone?: string; active?: boolean }) {
    return this.branches.update(id, input);
  }

  @Delete(':id')
  @RequirePermission('admin.branches')
  remove(@Param('id') id: string) {
    return this.branches.softDelete(id);
  }
}