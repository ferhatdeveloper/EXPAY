import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  }

  async listRoles() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      include: { permissions: { include: { permission: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(input: { code: string; name: string; description?: string; permissionIds?: string[] }) {
    return this.prisma.role.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        permissions: input.permissionIds
          ? { create: input.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
    });
  }

  async updateRole(id: string, input: { name?: string; description?: string; active?: boolean; permissionIds?: string[] }) {
    await this.getRole(id);
    if (input.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await this.prisma.rolePermission.createMany({
        data: input.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      });
    }
    return this.prisma.role.update({
      where: { id },
      data: { name: input.name, description: input.description, active: input.active },
      include: { permissions: { include: { permission: true } } },
    });
  }
}