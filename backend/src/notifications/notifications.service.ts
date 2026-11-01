import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaTransactionClient } from '@navrix/database';
import { NotificationEventType } from '@navrix/types';
import { PrismaService } from '../common/prisma.service';

export interface NotificationChannelAdapter {
  readonly channelName: 'EMAIL' | 'SMS' | 'PUSH';
  dispatch(payload: {
    userId: string;
    title: string;
    message: string;
    eventType: NotificationEventType | string;
  }): Promise<void>;
}

/**
 * Console/No-Op External Delivery Adapter ready for SMTP/SES/Twilio/FCM plug-in.
 */
class StructuredExternalNotificationAdapter implements NotificationChannelAdapter {
  private readonly logger = new Logger('NotificationAdapter');
  constructor(public readonly channelName: 'EMAIL' | 'SMS' | 'PUSH') {}

  async dispatch(payload: {
    userId: string;
    title: string;
    message: string;
    eventType: string;
  }): Promise<void> {
    if (process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER !== 'NONE') {
      this.logger.debug(
        `[${this.channelName}] Queued ${payload.eventType} notification for userId=${payload.userId}`,
      );
    }
  }
}

@Injectable()
export class NotificationsService {
  private readonly adapters: NotificationChannelAdapter[] = [
    new StructuredExternalNotificationAdapter('EMAIL'),
    new StructuredExternalNotificationAdapter('SMS'),
    new StructuredExternalNotificationAdapter('PUSH'),
  ];

  constructor(private readonly prisma: PrismaService) {}

  async notifyUser(
    params: {
      userId: string;
      eventType: NotificationEventType | string;
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
    },
    tx?: PrismaTransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const created = await client.notification.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        channel: 'IN_APP',
        title: params.title,
        message: params.message,
        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    // Fire-and-forget external channel abstractions without blocking DB transaction
    for (const adapter of this.adapters) {
      adapter
        .dispatch({
          userId: params.userId,
          title: params.title,
          message: params.message,
          eventType: params.eventType,
        })
        .catch(() => undefined);
    }

    return created;
  }

  async listForUser(userId: string, limit = 40) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(100, limit),
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { items, unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { marked: true };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updatedCount: res.count };
  }
}

