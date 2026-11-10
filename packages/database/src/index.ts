import { PrismaClient, Prisma } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Atomically generates sequential human-readable public IDs inside MySQL:
 * - USR-000001 (includeDate = false)
 * - DEP-20261101-000001 (includeDate = true)
 * - INV-20261101-000001
 * - WDR-20261101-000001
 * - LED-20261101-000001
 * - INT-20261101-000001
 */
export async function nextReadableUid(
  tx: PrismaTransactionClient | PrismaClient,
  entityCode: 'USR' | 'DEP' | 'INV' | 'WDR' | 'LED' | 'INT' | 'COM' | 'REF',
  includeDate = true,
  now: Date = new Date(),
): Promise<string> {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;
  const prefix = includeDate ? `${entityCode}-${datePart}` : entityCode;

  const seq = await tx.uidSequence.upsert({
    where: { prefix },
    create: { prefix, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  const padded = String(seq.lastValue).padStart(6, '0');
  return `${prefix}-${padded}`;
}
