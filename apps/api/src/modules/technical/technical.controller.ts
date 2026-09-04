import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TechnicalService } from './technical.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from "@doviz/shared";

@Controller('technical')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TechnicalController {
  constructor(private readonly service: TechnicalService) {}

  // Phones
  @Get('phones')
  @RequirePermission('tech.phone')
  listPhones() {
    return this.service.listPhones();
  }

  @Post('phones')
  @RequirePermission('tech.phone')
  createPhone(@Body() body: { label: string; number: string; branchId?: string; active?: boolean }) {
    return this.service.createPhone(body);
  }

  @Patch('phones/:id')
  @RequirePermission('tech.phone')
  updatePhone(@Param('id') id: string, @Body() body: { label?: string; number?: string; active?: boolean }) {
    return this.service.updatePhone(id, body);
  }

  @Delete('phones/:id')
  @RequirePermission('tech.phone')
  deletePhone(@Param('id') id: string) {
    return this.service.deletePhone(id);
  }

  // Backups
  @Get('backups')
  @RequirePermission('tech.backup')
  listBackups() {
    return this.service.listBackups();
  }

  @Post('backups')
  @RequirePermission('tech.backup')
  createBackup(@Body() body: { filename: string; size: number; storagePath: string; status: string; note?: string }, @CurrentUser() user: AuthUser) {
    return this.service.createBackupRecord({ ...body, createdById: user.id });
  }

  // Settings
  @Get('settings')
  @RequirePermission('tech.general')
  listSettings() {
    return this.service.listSettings();
  }

  @Put('settings/:key')
  @RequirePermission('tech.general')
  setSetting(@Param('key') key: string, @Body('value') value: unknown) {
    return this.service.setSetting(key, value);
  }

  // Jobs
  @Get('jobs')
  @RequirePermission('tech.jobDefinition')
  listJobs() {
    return this.service.listJobs();
  }

  @Post('jobs')
  @RequirePermission('tech.jobDefinition')
  createJob(@Body() body: { code: string; name: string; description?: string; cron?: string; active?: boolean }) {
    return this.service.createJob(body);
  }

  @Patch('jobs/:id')
  @RequirePermission('tech.jobDefinition')
  updateJob(@Param('id') id: string, @Body() body: { name?: string; description?: string; cron?: string; active?: boolean }) {
    return this.service.updateJob(id, body);
  }

  @Delete('jobs/:id')
  @RequirePermission('tech.jobDefinition')
  deleteJob(@Param('id') id: string) {
    return this.service.deleteJob(id);
  }
}