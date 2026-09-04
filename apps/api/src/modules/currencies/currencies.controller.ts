import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateCurrencySchema } from '@doviz/shared';
import { CurrenciesService } from './currencies.service';

@Controller('currencies')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CurrenciesController {
  constructor(private readonly currencies: CurrenciesService) {}

  @Get()
  @RequirePermission('rate.definition')
  list(@Query('active') active?: string) {
    return this.currencies.list(active === undefined ? undefined : active === 'true');
  }

  @Get(':code')
  @RequirePermission('rate.definition')
  get(@Param('code') code: string) {
    return this.currencies.get(code);
  }

  @Post()
  @RequirePermission('rate.definition')
  create(@Body(new ZodValidationPipe(CreateCurrencySchema)) input: any) {
    return this.currencies.create(input as never);
  }

  @Patch(':code')
  @RequirePermission('rate.definition')
  update(@Param('code') code: string, @Body(new ZodValidationPipe(CreateCurrencySchema.partial())) input: any) {
    return this.currencies.update(code, input as never);
  }
}