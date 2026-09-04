import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchInput } from '@doviz/shared';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.branch.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }

  async get(id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, deletedAt: null } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(input: CreateBranchInput) {
    return this.prisma.branch.create({
      data: { code: input.code, name: input.name, address: input.address, phone: input.phone, active: input.active },
    });
  }

  async update(id: string, input: { name?: string; address?: string; phone?: string; active?: boolean }) {
    await this.get(id);
    return this.prisma.branch.update({ where: { id }, data: input });
  }

  async softDelete(id: string) {
    await this.get(id);
    return this.prisma.branch.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  }
}