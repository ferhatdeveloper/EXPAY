import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserInput } from '@doviz/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { branchId?: string; q?: string; page?: number; pageSize?: number }) {
    const { branchId, q, page = 1, pageSize = 50 } = params;
    const where = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' as const } },
              { fullName: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(branchId
        ? { branches: { some: { branchId } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: {
          role: { select: { id: true, code: true, name: true } },
          branches: { include: { branch: { select: { id: true, code: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        branches: { include: { branch: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: {
        username: input.username,
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        roleId: input.roleId,
        status: input.active ? 'ACTIVE' : 'DISABLED',
        branches: { create: input.branchIds.map((branchId) => ({ branchId })) },
      },
    });
  }

  async update(id: string, input: { fullName?: string; email?: string; roleId?: string; active?: boolean; language?: string }) {
    await this.get(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName,
        email: input.email,
        roleId: input.roleId,
        language: input.language,
        status: input.active === undefined ? undefined : input.active ? 'ACTIVE' : 'DISABLED',
      },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    await this.get(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }

  async softDelete(id: string) {
    await this.get(id);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'DISABLED' } });
    return { ok: true };
  }
}