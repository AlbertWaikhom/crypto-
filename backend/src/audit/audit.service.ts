import { Global, Injectable } from '@nestjs/common';
import { Prisma, PrismaTransactionClient } from '@navrix/database';
import { AuditAction } from '@navrix/types';
import { PrismaService } from '../common/prisma.service';

export interface RecordAuditParams {
  adminId?: string | null;
  actorRole?: string | null;
  action: AuditAction | string;
  targetType: string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as Prisma.InputJsonValue;
}

/**
 * Immutable Audit Trail Service.
 * Strictly append-only — provides ZERO update or delete methods.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    params: RecordAuditParams,
    tx?: PrismaTransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        adminId: params.adminId ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        oldValue:
          params.oldValue !== undefined
            ? toJsonSafe(params.oldValue)
            : Prisma.JsonNull,
        newValue:
          params.newValue !== undefined
            ? toJsonSafe(params.newValue)
            : Prisma.JsonNull,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
        requestId: params.requestId ?? null,
      },
    });
  }

  async listLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 30));
    const where: Prisma.AuditLogWhereInput = {};
    if (params.action) where.action = params.action;
    if (params.targetType) where.targetType = params.targetType;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          admin: {
            select: {
              publicUid: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

@Global()
@Injectable()
export class AuditModuleMarker {}

