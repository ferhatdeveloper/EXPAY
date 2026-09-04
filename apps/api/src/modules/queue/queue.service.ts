import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CallTicketInput,
  CancelTicketInput,
  CompleteTicketInput,
  SkipTicketInput,
  TicketCreateInput,
} from './queue.schema';

const PRIORITY_RANK: Record<string, number> = {
  VIP: 0,
  ELDERLY: 1,
  NORMAL: 2,
};

/**
 * Müşteri Sıra Sistemi (Queue / Customer Display).
 * - Bir şubede günlük BRANCH_PREFIX-001 formatında kod üretir.
 * - Çağrı sırası: önce VIP/ELDERLY, sonra createdAt.
 * - Board endpoint'i hem TV (display) hem vezne paneli tarafından 3 sn polling ile okunur.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni bilet oluşturur. Bugün oluşan en son koda göre +1 ile numara verir.
   * branchId isteğe bağlı: gelmezse tenant'ın ilk aktif şubesi kullanılır.
   */
  async createTicket(branchId: string | undefined, input: TicketCreateInput) {
    const targetBranchId = await this.resolveBranchId(branchId);
    const prefix = await this.branchPrefix(targetBranchId);
    const startOfToday = this.startOfTodayUtc();
    const todayCount = await this.prisma.queueTicket.count({
      where: {
        branchId: targetBranchId,
        createdAt: { gte: startOfToday },
      },
    });
    const code = `${prefix}-${String(todayCount + 1).padStart(3, '0')}`;
    const ticket = await this.prisma.queueTicket.create({
      data: {
        branchId: targetBranchId,
        code,
        serviceType: input.serviceType ?? 'BUY',
        priority: input.priority ?? 'NORMAL',
        customerName: input.customerName,
        phone: input.phone,
      },
    });
    this.logger.log(
      `Ticket created code=${ticket.code} branchId=${targetBranchId} service=${ticket.serviceType} priority=${ticket.priority}`,
    );
    return ticket;
  }

  /**
   * Sıradaki (öncelik + sıra) müşteriyi ilgili gişeye çağırır.
   * Boşsa NotFound döner.
   */
  async callTicket(branchId: string | undefined, input: CallTicketInput) {
    const targetBranchId = await this.resolveBranchId(branchId);

    let ticket;
    if (input.ticketId) {
      // Belirli bir bilet çağrılırsa (manuel seçim)
      ticket = await this.prisma.queueTicket.findFirst({
        where: {
          id: input.ticketId,
          branchId: targetBranchId,
          status: 'WAITING',
        },
      });
      if (!ticket) {
        throw new NotFoundException('Belirtilen bilet kuyrukta bulunamadı');
      }
    } else {
      // Sıradaki: WAITING → önce priority desc (VIP/ELDERLY), sonra createdAt asc
      const waiting = await this.prisma.queueTicket.findMany({
        where: { branchId: targetBranchId, status: 'WAITING' },
        orderBy: { createdAt: 'asc' },
      });
      if (waiting.length === 0) {
        throw new NotFoundException('Bekleyen müşteri yok');
      }
      ticket = waiting.sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99),
      )[0];
    }

    const updated = await this.prisma.queueTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'CALLED',
        counterId: input.counterId,
        calledAt: new Date(),
      },
    });
    this.logger.log(
      `Ticket called id=${updated.id} code=${updated.code} counter=${input.counterId}`,
    );
    return updated;
  }

  /** Çağrılan bileti SERVING'e çekmez; sadece "no-show / skip" durumlarında kullanılır. */
  async skipTicket(branchId: string | undefined, input: SkipTicketInput) {
    const targetBranchId = await this.resolveBranchId(branchId);
    const existing = await this.prisma.queueTicket.findFirst({
      where: { id: input.ticketId, branchId: targetBranchId },
    });
    if (!existing) throw new NotFoundException('Bilet bulunamadı');
    return this.prisma.queueTicket.update({
      where: { id: existing.id },
      data: {
        status: 'NO_SHOW',
        completedAt: new Date(),
      },
    });
  }

  /** Müşteri vazgeçti (bekleme sırasından çıkar). */
  async cancelTicket(branchId: string | undefined, input: CancelTicketInput) {
    const targetBranchId = await this.resolveBranchId(branchId);
    const existing = await this.prisma.queueTicket.findFirst({
      where: { id: input.ticketId, branchId: targetBranchId, status: 'WAITING' },
    });
    if (!existing) throw new NotFoundException('İptal edilecek bekleyen bilet yok');
    return this.prisma.queueTicket.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  /** İşlem tamamlandı → COMPLETED. */
  async complete(input: CompleteTicketInput) {
    const ticket = await this.prisma.queueTicket.findUnique({ where: { id: input.ticketId } });
    if (!ticket) throw new NotFoundException('Bilet bulunamadı');
    if (ticket.status === 'COMPLETED') return ticket;
    return this.prisma.queueTicket.update({
      where: { id: ticket.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  /**
   * Display + Vezne paneli için board datası.
   * - recent: son çağrılan / servis verilen / tamamlanan 6 kayıt (büyük kart)
   * - waiting: bekleyen ilk 20 (sıra)
   * - stats: günlük sayımlar
   */
  async board(branchId: string | undefined) {
    const targetBranchId = await this.resolveBranchId(branchId);
    const startOfToday = this.startOfTodayUtc();

    const [recent, waiting, todayAll] = await Promise.all([
      this.prisma.queueTicket.findMany({
        where: {
          branchId: targetBranchId,
          status: { in: ['CALLED', 'SERVING', 'COMPLETED'] },
          calledAt: { gte: startOfToday },
        },
        orderBy: { calledAt: 'desc' },
        take: 12,
      }),
      this.prisma.queueTicket.findMany({
        where: { branchId: targetBranchId, status: 'WAITING' },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      this.prisma.queueTicket.findMany({
        where: {
          branchId: targetBranchId,
          createdAt: { gte: startOfToday },
        },
        select: { status: true, serviceType: true, priority: true, counterId: true },
      }),
    ]);

    // Priority'yi JS tarafında yeniden sırala (string desc güvenilmez)
    waiting.sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const stats = {
      total: todayAll.length,
      waiting: todayAll.filter((t) => t.status === 'WAITING').length,
      called: todayAll.filter((t) => t.status === 'CALLED').length,
      completed: todayAll.filter((t) => t.status === 'COMPLETED').length,
      cancelled: todayAll.filter((t) => t.status === 'CANCELLED').length,
      noShow: todayAll.filter((t) => t.status === 'NO_SHOW').length,
      vipServed: todayAll.filter(
        (t) => t.priority !== 'NORMAL' && t.status === 'COMPLETED',
      ).length,
    };

    const counters = Array.from(
      new Set(
        todayAll
          .filter((t) => t.counterId && t.status !== 'CANCELLED')
          .map((t) => t.counterId!),
      ),
    );

    return {
      branchId: targetBranchId,
      recent: recent.slice(0, 6),
      waiting,
      stats,
      counters,
      now: new Date().toISOString(),
    };
  }

  /** Şubedeki kuyruk ID'si için default branch çözümleme. */
  private async resolveBranchId(branchId: string | undefined): Promise<string> {
    if (branchId && branchId.trim().length > 0) {
      const exists = await this.prisma.branch.findFirst({
        where: { id: branchId, deletedAt: null },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('Şube bulunamadı');
      return exists.id;
    }
    const first = await this.prisma.branch.findFirst({
      where: { deletedAt: null, active: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true },
    });
    if (!first) throw new BadRequestException('Aktif şube bulunamadı');
    return first.id;
  }

  /** Branch code'unun ilk 2-3 harfini prefix olarak kullan (MAIN → MN, IQ-ERB → IQ). */
  private async branchPrefix(branchId: string): Promise<string> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { code: true },
    });
    const raw = branch?.code ?? 'A';
    // Alfanumerik olmayan karakterleri at, ilk 2 karakter uppercase
    const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length === 0) return 'A';
    return cleaned.slice(0, 3);
  }

  private startOfTodayUtc(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
