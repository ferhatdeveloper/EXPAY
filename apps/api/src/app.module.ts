import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditContextMiddleware } from './common/guards/audit-context.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesPermissionsModule } from './modules/roles-permissions/roles-permissions.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { VezneModule } from './modules/vezne/vezne.module';
import { CashModule } from './modules/cash/cash.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TechnicalModule } from './modules/technical/technical.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        redact: ['req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RolesPermissionsModule,
    BranchesModule,
    CurrenciesModule,
    ExchangeRatesModule,
    VezneModule,
    CashModule,
    CustomerModule,
    AccountingModule,
    ReportsModule,
    TechnicalModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}