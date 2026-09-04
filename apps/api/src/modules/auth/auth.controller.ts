import { Body, Controller, Post, UseGuards, Body as Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginSchema, CreateUserSchema, LoginInput, CreateUserInput } from '@doviz/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from "@doviz/shared";

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body(new ZodValidationPipe(LoginSchema)) input: LoginInput) {
    return this.auth.login(input as never);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  logout(@Body('refreshToken') refreshToken: string) {
    return this.auth.logout(refreshToken);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(@Body(new ZodValidationPipe(CreateUserSchema)) input: CreateUserInput, @CurrentUser() _user: AuthUser) {
    return this.auth.register(input as never);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req('currentPassword') currentPassword: string,
    @Req('newPassword') newPassword: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auth.changePassword(user.id, currentPassword, newPassword);
  }
}