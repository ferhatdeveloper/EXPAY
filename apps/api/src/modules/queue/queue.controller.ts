import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CallTicketInput,
  CallTicketSchema,
  CancelTicketSchema,
  CompleteTicketSchema,
  SkipTicketSchema,
  TicketCreateSchema,
} from './queue.schema';
import { QueueService } from './queue.service';

/**
 * - `GET /queue/board/:branchId`            → PUBLIC (TV/kiosk + vezne paneli)
 * - `POST /queue/ticket/:branchId?`        → public + opsiyonel auth (kiosk için)
 * - `POST /queue/call/:branchId?`          → auth (vezne personeli)
 * - `POST /queue/complete`                 → auth
 * - `POST /queue/skip`                     → auth
 * - `POST /queue/cancel/:branchId?`        → public (kullanıcı kendi sırasını iptal edebilir)
 */
@Controller('queue')
export class QueueController {
  constructor(private readonly service: QueueService) {}

  @Get('board/:branchId?')
  board(@Param('branchId') branchId?: string) {
    return this.service.board(branchId);
  }

  @Post('ticket/:branchId?')
  create(
    @Param('branchId') branchId: string | undefined,
    @Body(new ZodValidationPipe(TicketCreateSchema)) input: any,
  ) {
    return this.service.createTicket(branchId, input);
  }

  @Post('call/:branchId?')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('queue.call')
  call(
    @Param('branchId') branchId: string | undefined,
    @Body(new ZodValidationPipe(CallTicketSchema)) body: CallTicketInput,
  ) {
    // ticketId boşsa service kendi seçsin (priority bazlı)
    return this.service.callTicket(branchId, body);
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('queue.complete')
  complete(@Body(new ZodValidationPipe(CompleteTicketSchema)) body: any) {
    return this.service.complete(body);
  }

  @Post('skip/:branchId?')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('queue.call')
  skip(
    @Param('branchId') branchId: string | undefined,
    @Body(new ZodValidationPipe(SkipTicketSchema)) body: any,
  ) {
    return this.service.skipTicket(branchId, body);
  }

  @Post('cancel/:branchId?')
  cancel(
    @Param('branchId') branchId: string | undefined,
    @Body(new ZodValidationPipe(CancelTicketSchema)) body: any,
  ) {
    return this.service.cancelTicket(branchId, body);
  }
}
