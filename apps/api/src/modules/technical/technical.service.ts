import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TechnicalService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Phone Definitions =====
  listPhones() {
    return this.prisma.phoneDefinition.findMany({ orderBy: { label: 'asc' } });
  }

  createPhone(input: { label: string; number: string; branchId?: string; active?: boolean }) {
    return this.prisma.phoneDefinition.create({ data: input });
  }

  updatePhone(id: string, input: { label?: string; number?: string; active?: boolean }) {
    return this.prisma.phoneDefinition.update({ where: { id }, data: input });
  }

  deletePhone(id: string) {
    return this.prisma.phoneDefinition.delete({ where: { id } });
  }

  // ===== Backup Records =====
  listBackups() {
    return this.prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createBackupRecord(input: { filename: string; size: number; storagePath: string; status: string; note?: string; createdById?: string }) {
    return this.prisma.backupRecord.create({ data: input });
  }

  // ===== System Settings =====
  async listSettings() {
    const items = await this.prisma.systemSetting.findMany();
    return items;
  }

  async setSetting(key: string, value: unknown) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });
  }

  // ===== Job Definitions =====
  listJobs() {
    return this.prisma.jobDefinition.findMany({ orderBy: { code: 'asc' } });
  }

  createJob(input: { code: string; name: string; description?: string; cron?: string; active?: boolean }) {
    return this.prisma.jobDefinition.create({ data: input });
  }

  updateJob(id: string, input: { name?: string; description?: string; cron?: string; active?: boolean }) {
    return this.prisma.jobDefinition.update({ where: { id }, data: input });
  }

  deleteJob(id: string) {
    return this.prisma.jobDefinition.delete({ where: { id } });
  }
}