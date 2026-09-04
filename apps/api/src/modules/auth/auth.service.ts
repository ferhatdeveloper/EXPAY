import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from "@doviz/shared";
import { CreateUserInput, LoginInput } from '@doviz/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        branches: { include: { branch: true } },
      },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const branchIds = user.branches.map((b) => b.branchId);
    if (input.branchId && !branchIds.includes(input.branchId)) {
      throw new UnauthorizedException('Branch not allowed');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code);
    const defaultBranchId = input.branchId ?? user.branches.find((b) => b.isDefault)?.branchId ?? branchIds[0];

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleCode: user.role.code,
      permissions,
      branchIds,
      defaultBranchId,
      language: user.language,
    };

    const tokens = await this.issueTokens(authUser);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { user: authUser, ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
            branches: true,
          },
        },
      },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const permissions = stored.user.role.permissions.map((rp) => rp.permission.code);
    const branchIds = stored.user.branches.map((b) => b.branchId);
    const authUser: AuthUser = {
      id: stored.user.id,
      username: stored.user.username,
      roleId: stored.user.roleId,
      roleCode: stored.user.role.code,
      permissions,
      branchIds,
      defaultBranchId: branchIds[0],
      language: stored.user.language,
    };
    return this.issueTokens(authUser);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async register(input: CreateUserInput) {
    const exists = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new ConflictException('Username already exists');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        roleId: input.roleId,
        branches: { create: input.branchIds.map((branchId) => ({ branchId })) },
      },
    });
    return { id: user.id, username: user.username, fullName: user.fullName };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is wrong');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private async issueTokens(user: AuthUser) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, username: user.username, roleCode: user.roleCode, permissions: user.permissions, branchIds: user.branchIds, defaultBranchId: user.defaultBranchId },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m' },
    );
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }
}