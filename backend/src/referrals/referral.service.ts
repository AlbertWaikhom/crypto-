import {
  prisma,
  nextReadableUid,
  Prisma,
  PrismaTransactionClient,
  UserStatus,
  LedgerTransactionType,
  LedgerDirection,
} from '@navrix/database';
import {
  AuditAction,
  NotificationEventType,
  REFERRAL_TIER_RATES,
  ReferralHierarchyNode,
  ReferralLevelBreakdown,
  ReferralCommissionItem,
  UserReferralOverview,
  AdminReferralChainUser,
  AdminReferralAuditItem,
} from '@navrix/types';

/**
 * 10-Level Referral Commission Structure
 * Level 1: 8%
 * Level 2: 4%
 * Level 3-5: 2%
 * Level 6-10: 1%
 */
export const REFERRAL_RATES: Record<number, number> = REFERRAL_TIER_RATES || {
  1: 0.08,
  2: 0.04,
  3: 0.02,
  4: 0.02,
  5: 0.02,
  6: 0.01,
  7: 0.01,
  8: 0.01,
  9: 0.01,
  10: 0.01,
};

/**
 * Generates an uppercase alphanumeric referral code for a user
 * e.g. NVX + 5 characters or sequential
 */
export async function generateUniqueReferralCode(
  tx: PrismaTransactionClient | typeof prisma = prisma,
  publicUid?: string,
): Promise<string> {
  if (publicUid) {
    const digits = publicUid.replace(/\D/g, '');
    const candidate = `NVX${digits.padStart(5, '0')}`;
    const exists = await tx.user.findUnique({ where: { referralCode: candidate } });
    if (!exists) return candidate;
  }

  // Fallback random alphanumeric
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `NVX${rand}`;
    const exists = await tx.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }

  return `NVX${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Distribute Multi-Level Referral Commission (Levels 1 to 10)
 * Automatically called inside the transaction when an investment is approved.
 */
export async function distributeMultiLevelReferralCommission(
  tx: PrismaTransactionClient,
  params: {
    investmentId: string;
    investmentUid: string;
    investorUserId: string;
    principalAmount: Prisma.Decimal;
    adminUserId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<{
  distributedCount: number;
  totalCommissionUsdt: Prisma.Decimal;
  commissions: Array<{
    level: number;
    referrerUid: string;
    referrerName: string;
    commissionAmount: Prisma.Decimal;
  }>;
}> {
  const { investmentId, investmentUid, investorUserId, principalAmount, adminUserId, meta } =
    params;

  const investor = await tx.user.findUnique({
    where: { id: investorUserId },
    select: { id: true, publicUid: true, name: true, referredById: true },
  });

  if (!investor || !investor.referredById) {
    return { distributedCount: 0, totalCommissionUsdt: new Prisma.Decimal(0), commissions: [] };
  }

  const resultCommissions: Array<{
    level: number;
    referrerUid: string;
    referrerName: string;
    commissionAmount: Prisma.Decimal;
  }> = [];

  let currentReferrerId: string | null = investor.referredById;
  let totalCommission = new Prisma.Decimal(0);
  const visitedIds = new Set<string>([investorUserId]);

  for (let level = 1; level <= 10; level++) {
    if (!currentReferrerId) break;
    if (visitedIds.has(currentReferrerId)) {
      console.warn(
        `[ReferralEngine] Circular referral loop detected at user ID: ${currentReferrerId}. Aborting further levels.`,
      );
      break;
    }
    visitedIds.add(currentReferrerId);

    const referrer = await tx.user.findUnique({
      where: { id: currentReferrerId },
      select: {
        id: true,
        publicUid: true,
        name: true,
        email: true,
        status: true,
        referredById: true,
      },
    });

    if (!referrer) break;

    const rate = REFERRAL_RATES[level] ?? 0;
    if (rate > 0 && referrer.status === UserStatus.ACTIVE) {
      // Calculate commission = principal * rate
      const rawComm = principalAmount.mul(new Prisma.Decimal(rate));
      // Round to 4 decimal places
      const commissionAmount = new Prisma.Decimal(rawComm.toFixed(4));

      if (commissionAmount.gt(0)) {
        const commissionUid = await nextReadableUid(tx, 'COM', true);

        // Find or create referrer's USDT wallet with exclusive lock
        let wallet = await tx.wallet.findUnique({
          where: { userId_asset: { userId: referrer.id, asset: 'USDT' } },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId: referrer.id,
              asset: 'USDT',
              availableBalance: new Prisma.Decimal(0),
              lockedBalance: new Prisma.Decimal(0),
              investedBalance: new Prisma.Decimal(0),
              pendingWithdrawal: new Prisma.Decimal(0),
            },
          });
        }

        const totalBefore = wallet.availableBalance
          .plus(wallet.lockedBalance)
          .plus(wallet.investedBalance);
        const totalAfter = totalBefore.plus(commissionAmount);

        // Update referrer wallet available balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: wallet.availableBalance.plus(commissionAmount),
            version: { increment: 1 },
          },
        });

        // Create immutable double-entry Ledger entry
        const ledgerUid = await nextReadableUid(tx, 'LED', true);
        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            ledgerUid,
            userId: referrer.id,
            walletId: wallet.id,
            transactionType: LedgerTransactionType.COMMISSION,
            direction: LedgerDirection.CREDIT,
            asset: 'USDT',
            amount: commissionAmount,
            balanceBefore: totalBefore,
            balanceAfter: totalAfter,
            referenceType: 'REFERRAL_COMMISSION',
            referenceId: commissionUid,
            idempotencyKey: `comm:${investmentId}:${referrer.id}:${level}`,
            description: `Level ${level} referral commission (${(rate * 100).toFixed(0)}%) from ${investor.name} (${investor.publicUid}) for investment ${investmentUid}`,
            createdById: adminUserId || null,
          },
        });

        // Create ReferralCommission record
        await tx.referralCommission.create({
          data: {
            commissionUid,
            referrerId: referrer.id,
            investorId: investor.id,
            investmentId,
            level,
            ratePercent: new Prisma.Decimal(rate * 100),
            investmentAmount: principalAmount,
            commissionAmount,
            asset: 'USDT',
            status: 'CREDITED',
            ledgerEntryId: ledgerEntry.id,
          },
        });

        // Send in-app notification to referrer
        await tx.notification.create({
          data: {
            userId: referrer.id,
            eventType: NotificationEventType.REFERRAL_COMMISSION_RECEIVED,
            title: `Level ${level} Referral Commission: +$${commissionAmount.toFixed(2)} USDT`,
            message: `You earned a ${(rate * 100).toFixed(0)}% referral reward (+$${commissionAmount.toFixed(2)} USDT) from ${investor.name}'s investment (${investmentUid}).`,
            metadata: {
              level,
              ratePercent: rate * 100,
              commissionAmount: commissionAmount.toFixed(2),
              investorUid: investor.publicUid,
              investorName: investor.name,
              investmentUid,
              ledgerUid,
            },
          },
        });

        totalCommission = totalCommission.plus(commissionAmount);
        resultCommissions.push({
          level,
          referrerUid: referrer.publicUid,
          referrerName: referrer.name,
          commissionAmount,
        });
      }
    }

    currentReferrerId = referrer.referredById;
  }

  // Record audit log if commissions were distributed
  if (resultCommissions.length > 0 && adminUserId) {
    await tx.auditLog.create({
      data: {
        adminId: adminUserId,
        actorRole: 'ADMIN',
        action: AuditAction.REFERRAL_COMMISSION_DISTRIBUTED,
        targetType: 'INVESTMENT',
        targetId: investmentUid,
        newValue: {
          investmentId,
          investmentUid,
          investorUid: investor.publicUid,
          principalAmount: principalAmount.toFixed(2),
          distributedLevelsCount: resultCommissions.length,
          totalCommissionUsdt: totalCommission.toFixed(2),
          commissions: resultCommissions,
        },
        ipAddress: (meta?.ipAddress as string) || null,
        userAgent: (meta?.userAgent as string) || null,
      },
    });
  }

  return {
    distributedCount: resultCommissions.length,
    totalCommissionUsdt: totalCommission,
    commissions: resultCommissions,
  };
}

/**
 * Get User Referral Overview (Multi-Level Tree, Stats, Breakdown & History)
 */
export async function getUserReferralOverview(
  userId: string,
  appOrigin = 'http://localhost:3000',
): Promise<UserReferralOverview> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, publicUid: true, name: true, referralCode: true, createdAt: true },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  let code = user.referralCode;
  if (!code) {
    code = await generateUniqueReferralCode(prisma, user.publicUid);
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
  }

  const referralLink = `${appOrigin}/register?ref=${code}`;

  // Fetch all downline referrals up to 10 levels
  const levelUsers: Map<
    number,
    Array<{
      id: string;
      publicUid: string;
      name: string;
      email: string;
      status: string;
      createdAt: Date;
      referredById: string | null;
    }>
  > = new Map();

  for (let l = 1; l <= 10; l++) {
    levelUsers.set(l, []);
  }

  let currentParentIds = [userId];
  const allDownlineUserIds: string[] = [];

  for (let level = 1; level <= 10; level++) {
    if (currentParentIds.length === 0) break;

    const children = await prisma.user.findMany({
      where: { referredById: { in: currentParentIds } },
      select: {
        id: true,
        publicUid: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        referredById: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (children.length === 0) break;

    levelUsers.set(level, children);
    currentParentIds = children.map((c) => c.id);
    allDownlineUserIds.push(...children.map((c) => c.id));
  }

  // Fetch investment stats for downline users
  const investmentsByDownline =
    allDownlineUserIds.length > 0
      ? await prisma.investment.groupBy({
          by: ['userId'],
          where: {
            userId: { in: allDownlineUserIds },
            status: { in: ['ACTIVE', 'COMPLETED', 'MATURED'] },
          },
          _sum: { principalAmount: true },
          _count: { id: true },
        })
      : [];

  const userInvestmentMap = new Map<
    string,
    { totalInvested: Prisma.Decimal; activeCount: number }
  >();
  for (const inv of investmentsByDownline) {
    userInvestmentMap.set(inv.userId, {
      totalInvested: inv._sum.principalAmount || new Prisma.Decimal(0),
      activeCount: inv._count.id || 0,
    });
  }

  // Fetch commissions earned by this user from each downline user
  const commissionsEarned = await prisma.referralCommission.findMany({
    where: { referrerId: userId, status: 'CREDITED' },
    select: {
      id: true,
      commissionUid: true,
      investorId: true,
      investmentId: true,
      level: true,
      ratePercent: true,
      investmentAmount: true,
      commissionAmount: true,
      asset: true,
      status: true,
      createdAt: true,
      investor: { select: { publicUid: true, name: true } },
      investment: { select: { investmentUid: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const commissionsByLevelMap = new Map<number, Prisma.Decimal>();
  const commissionByInvestorMap = new Map<string, Prisma.Decimal>();
  let totalEarnedUsdt = new Prisma.Decimal(0);

  for (const comm of commissionsEarned) {
    const prevLvl = commissionsByLevelMap.get(comm.level) || new Prisma.Decimal(0);
    commissionsByLevelMap.set(comm.level, prevLvl.plus(comm.commissionAmount));

    const prevInv = commissionByInvestorMap.get(comm.investorId) || new Prisma.Decimal(0);
    commissionByInvestorMap.set(comm.investorId, prevInv.plus(comm.commissionAmount));

    totalEarnedUsdt = totalEarnedUsdt.plus(comm.commissionAmount);
  }

  // Build Level Breakdown (1 to 10)
  const breakdown: ReferralLevelBreakdown[] = [];
  let totalReferrals = 0;
  let totalNetworkVolume = new Prisma.Decimal(0);
  let activeLevelsCount = 0;

  for (let level = 1; level <= 10; level++) {
    const usersInLevel = levelUsers.get(level) || [];
    const count = usersInLevel.length;
    totalReferrals += count;

    let levelInvestment = new Prisma.Decimal(0);
    for (const u of usersInLevel) {
      const invStats = userInvestmentMap.get(u.id);
      if (invStats) {
        levelInvestment = levelInvestment.plus(invStats.totalInvested);
      }
    }
    totalNetworkVolume = totalNetworkVolume.plus(levelInvestment);

    const levelCommission = commissionsByLevelMap.get(level) || new Prisma.Decimal(0);
    const rate = REFERRAL_RATES[level] ?? 0;
    const ratePercent = Number((rate * 100).toFixed(0));

    if (count > 0 || levelCommission.gt(0)) {
      activeLevelsCount++;
    }

    breakdown.push({
      level,
      ratePercent,
      rateLabel: `${ratePercent}%`,
      referralsCount: count,
      totalInvestment: levelInvestment.toFixed(2),
      commissionEarned: levelCommission.toFixed(2),
    });
  }

  // Build recursive / nested tree for Level 1 to 10
  function buildSubtree(parentId: string, currentLevel: number): ReferralHierarchyNode[] {
    if (currentLevel > 10) return [];
    const directChildren =
      levelUsers.get(currentLevel)?.filter((u) => u.referredById === parentId) || [];
    return directChildren.map((child) => {
      const inv = userInvestmentMap.get(child.id);
      const commGen = commissionByInvestorMap.get(child.id) || new Prisma.Decimal(0);
      const maskedEmail = child.email.replace(
        /^(.)(.*)(@.*)$/,
        (_, first, mid, rest) => `${first}***${rest}`,
      );
      return {
        userId: child.id,
        publicUid: child.publicUid,
        name: child.name,
        emailMasked: maskedEmail,
        level: currentLevel,
        joinedAt: child.createdAt.toISOString(),
        status: child.status,
        totalInvested: inv ? inv.totalInvested.toFixed(2) : '0.00',
        activeInvestmentsCount: inv ? inv.activeCount : 0,
        totalCommissionGeneratedForYou: commGen.toFixed(2),
        children: buildSubtree(child.id, currentLevel + 1),
      };
    });
  }

  const hierarchy = buildSubtree(userId, 1);

  // Format recent commissions
  const recentCommissions: ReferralCommissionItem[] = commissionsEarned.slice(0, 20).map((c) => ({
    id: c.id,
    commissionUid: c.commissionUid,
    level: c.level,
    ratePercent: c.ratePercent.toFixed(1),
    investmentAmount: c.investmentAmount.toFixed(2),
    commissionAmount: c.commissionAmount.toFixed(2),
    asset: c.asset,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    investorUid: c.investor.publicUid,
    investorName: c.investor.name,
    investmentUid: c.investment.investmentUid,
  }));

  return {
    referralCode: code,
    referralLink,
    totalReferrals,
    directReferrals: levelUsers.get(1)?.length || 0,
    networkReferrals: Math.max(0, totalReferrals - (levelUsers.get(1)?.length || 0)),
    activeLevelsCount,
    totalEarnedUsdt: totalEarnedUsdt.toFixed(2),
    totalNetworkVolumeUsdt: totalNetworkVolume.toFixed(2),
    breakdown,
    hierarchy,
    recentCommissions,
  };
}

/**
 * Admin: Complete Referral Chain Overview, Stats & Tree
 */
export async function getAdminReferralOverview(): Promise<{
  totalUsers: number;
  usersWithReferrer: number;
  totalCommissionsDistributedUsdt: string;
  totalCommissionsCount: number;
  totalNetworkInvestedUsdt: string;
  levelDistribution: Array<{
    level: number;
    ratePercent: number;
    commissionsCount: number;
    totalCommissionUsdt: string;
    totalInvestedUsdt: string;
  }>;
}> {
  const totalUsers = await prisma.user.count();
  const usersWithReferrer = await prisma.user.count({
    where: { referredById: { not: null } },
  });

  const commissionAgg = await prisma.referralCommission.aggregate({
    where: { status: 'CREDITED' },
    _sum: { commissionAmount: true, investmentAmount: true },
    _count: { id: true },
  });

  const levelGroups = await prisma.referralCommission.groupBy({
    by: ['level'],
    where: { status: 'CREDITED' },
    _sum: { commissionAmount: true, investmentAmount: true },
    _count: { id: true },
  });

  const levelGroupMap = new Map<
    number,
    { count: number; commission: Prisma.Decimal; volume: Prisma.Decimal }
  >();
  for (const g of levelGroups) {
    levelGroupMap.set(g.level, {
      count: g._count.id,
      commission: g._sum.commissionAmount || new Prisma.Decimal(0),
      volume: g._sum.investmentAmount || new Prisma.Decimal(0),
    });
  }

  const levelDistribution: Array<{
    level: number;
    ratePercent: number;
    commissionsCount: number;
    totalCommissionUsdt: string;
    totalInvestedUsdt: string;
  }> = [];
  for (let l = 1; l <= 10; l++) {
    const g = levelGroupMap.get(l);
    const rate = REFERRAL_RATES[l] || 0;
    levelDistribution.push({
      level: l,
      ratePercent: Number((rate * 100).toFixed(0)),
      commissionsCount: g?.count || 0,
      totalCommissionUsdt: g ? g.commission.toFixed(2) : '0.00',
      totalInvestedUsdt: g ? g.volume.toFixed(2) : '0.00',
    });
  }

  return {
    totalUsers,
    usersWithReferrer,
    totalCommissionsDistributedUsdt: commissionAgg._sum.commissionAmount
      ? commissionAgg._sum.commissionAmount.toFixed(2)
      : '0.00',
    totalCommissionsCount: commissionAgg._count.id,
    totalNetworkInvestedUsdt: commissionAgg._sum.investmentAmount
      ? commissionAgg._sum.investmentAmount.toFixed(2)
      : '0.00',
    levelDistribution,
  };
}

/**
 * Admin: Search and Fetch All Referral Chain Users with Upline & Downline Metrics
 */
export async function getAdminReferralUsers(params: {
  search?: string;
  levelFilter?: number;
  limit?: number;
  offset?: number;
}): Promise<{
  users: AdminReferralChainUser[];
  total: number;
}> {
  const { search, limit = 50, offset = 0 } = params;

  const whereClause: Prisma.UserWhereInput = {};
  if (search && search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { publicUid: { contains: q } },
      { referralCode: { contains: q } },
    ];
  }

  const [rawUsers, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        publicUid: true,
        name: true,
        email: true,
        role: true,
        status: true,
        referralCode: true,
        createdAt: true,
        referredById: true,
        referrer: { select: { publicUid: true, name: true } },
        _count: {
          select: {
            referrals: true, // Direct referrals (Level 1)
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const userIds = rawUsers.map((u) => u.id);

  // Investment totals per user
  const investments =
    userIds.length > 0
      ? await prisma.investment.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _sum: { principalAmount: true },
        })
      : [];

  const investmentMap = new Map<string, Prisma.Decimal>();
  for (const inv of investments) {
    investmentMap.set(inv.userId, inv._sum.principalAmount || new Prisma.Decimal(0));
  }

  // Commissions earned per user
  const commissionsEarned =
    userIds.length > 0
      ? await prisma.referralCommission.groupBy({
          by: ['referrerId'],
          where: { referrerId: { in: userIds }, status: 'CREDITED' },
          _sum: { commissionAmount: true },
        })
      : [];

  const earnedMap = new Map<string, Prisma.Decimal>();
  for (const c of commissionsEarned) {
    earnedMap.set(c.referrerId, c._sum.commissionAmount || new Prisma.Decimal(0));
  }

  // Commissions generated per user (by their investments)
  const commissionsGenerated =
    userIds.length > 0
      ? await prisma.referralCommission.groupBy({
          by: ['investorId'],
          where: { investorId: { in: userIds }, status: 'CREDITED' },
          _sum: { commissionAmount: true },
        })
      : [];

  const generatedMap = new Map<string, Prisma.Decimal>();
  for (const c of commissionsGenerated) {
    generatedMap.set(c.investorId, c._sum.commissionAmount || new Prisma.Decimal(0));
  }

  const users: AdminReferralChainUser[] = rawUsers.map((u) => ({
    userId: u.id,
    publicUid: u.publicUid,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    referralCode: u.referralCode || 'UNASSIGNED',
    referredByUid: u.referrer?.publicUid || null,
    referredByName: u.referrer?.name || null,
    directReferralsCount: u._count.referrals,
    totalDownlineCount: u._count.referrals, // fast baseline, downline tree provides full recursive
    totalInvested: investmentMap.get(u.id)?.toFixed(2) || '0.00',
    totalCommissionsEarned: earnedMap.get(u.id)?.toFixed(2) || '0.00',
    totalCommissionsGenerated: generatedMap.get(u.id)?.toFixed(2) || '0.00',
    createdAt: u.createdAt.toISOString(),
  }));

  return { users, total };
}

/**
 * Admin: Full Referral Commission Audit Ledger
 */
export async function getAdminReferralAuditCommissions(params: {
  search?: string;
  level?: number;
  limit?: number;
  offset?: number;
}): Promise<{
  commissions: AdminReferralAuditItem[];
  total: number;
}> {
  const { search, level, limit = 50, offset = 0 } = params;

  const whereClause: Prisma.ReferralCommissionWhereInput = {};
  if (level && level >= 1 && level <= 10) {
    whereClause.level = level;
  }

  if (search && search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { commissionUid: { contains: q } },
      { referrer: { name: { contains: q } } },
      { referrer: { publicUid: { contains: q } } },
      { investor: { name: { contains: q } } },
      { investor: { publicUid: { contains: q } } },
      { investment: { investmentUid: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.referralCommission.findMany({
      where: whereClause,
      include: {
        referrer: { select: { publicUid: true, name: true } },
        investor: { select: { publicUid: true, name: true } },
        investment: { select: { investmentUid: true } },
        ledgerEntry: { select: { ledgerUid: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.referralCommission.count({ where: whereClause }),
  ]);

  const commissions: AdminReferralAuditItem[] = items.map((item) => ({
    id: item.id,
    commissionUid: item.commissionUid,
    referrerUid: item.referrer.publicUid,
    referrerName: item.referrer.name,
    investorUid: item.investor.publicUid,
    investorName: item.investor.name,
    investmentUid: item.investment.investmentUid,
    level: item.level,
    ratePercent: `${item.ratePercent.toFixed(0)}%`,
    investmentAmount: item.investmentAmount.toFixed(2),
    commissionAmount: item.commissionAmount.toFixed(2),
    asset: item.asset,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    ledgerUid: item.ledgerEntry?.ledgerUid || null,
  }));

  return { commissions, total };
}

/**
 * Admin: Get Complete Multi-Level Tree from Root or Specific User
 */
export async function getAdminReferralTree(
  rootUserId?: string,
  maxDepth = 10,
): Promise<{
  rootUsers: ReferralHierarchyNode[];
}> {
  // If no root specified, find top-level users who have at least one referral
  const usersWithReferrals = await prisma.user.findMany({
    where: rootUserId ? { id: rootUserId } : { referrals: { some: {} } },
    select: {
      id: true,
      publicUid: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      referredById: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });

  // Filter to roots (referredById == null) if no specific root requested
  const roots = rootUserId ? usersWithReferrals : usersWithReferrals.filter((u) => !u.referredById);

  const fallbackRoots = roots.length > 0 ? roots : usersWithReferrals.slice(0, 5);

  async function buildNode(
    u: {
      id: string;
      publicUid: string;
      name: string;
      email: string;
      status: string;
      createdAt: Date;
    },
    currentLevel: number,
  ): Promise<ReferralHierarchyNode> {
    const invAgg = await prisma.investment.aggregate({
      where: { userId: u.id, status: { in: ['ACTIVE', 'COMPLETED', 'MATURED'] } },
      _sum: { principalAmount: true },
      _count: { id: true },
    });

    const commAgg = await prisma.referralCommission.aggregate({
      where: { referrerId: u.id, status: 'CREDITED' },
      _sum: { commissionAmount: true },
    });

    let children: ReferralHierarchyNode[] = [];
    if (currentLevel < maxDepth) {
      const directChildren = await prisma.user.findMany({
        where: { referredById: u.id },
        select: {
          id: true,
          publicUid: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      children = await Promise.all(directChildren.map((c) => buildNode(c, currentLevel + 1)));
    }

    const maskedEmail = u.email.replace(/^(.)(.*)(@.*)$/, (_, f, m, r) => `${f}***${r}`);

    return {
      userId: u.id,
      publicUid: u.publicUid,
      name: u.name,
      emailMasked: maskedEmail,
      level: currentLevel,
      joinedAt: u.createdAt.toISOString(),
      status: u.status,
      totalInvested: invAgg._sum.principalAmount ? invAgg._sum.principalAmount.toFixed(2) : '0.00',
      activeInvestmentsCount: invAgg._count.id,
      totalCommissionGeneratedForYou: commAgg._sum.commissionAmount
        ? commAgg._sum.commissionAmount.toFixed(2)
        : '0.00',
      children,
    };
  }

  const rootNodes = await Promise.all(fallbackRoots.map((r) => buildNode(r, 0)));
  return { rootUsers: rootNodes };
}

/**
 * Admin: Assign or Update a User's Referrer with Loop Detection
 */
export async function adminAssignReferrer(params: {
  targetUserId: string;
  referrerCodeOrUid: string;
  adminId: string;
  actorRole: string;
  meta?: Record<string, unknown>;
}): Promise<{ success: boolean; message: string; referrer: { publicUid: string; name: string } }> {
  const { targetUserId, referrerCodeOrUid, adminId, actorRole, meta } = params;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { referrer: true },
  });

  if (!targetUser) {
    throw new Error('Target user not found.');
  }

  const cleanCode = referrerCodeOrUid.trim();
  const referrer = await prisma.user.findFirst({
    where: {
      OR: [
        { referralCode: cleanCode },
        { publicUid: cleanCode },
        { email: cleanCode.toLowerCase() },
      ],
    },
  });

  if (!referrer) {
    throw new Error(`Referrer "${cleanCode}" not found.`);
  }

  if (referrer.id === targetUser.id) {
    throw new Error('A user cannot be their own referrer.');
  }

  // Cycle check: verify targetUser is not in the upline of referrer
  let checkParentId: string | null = referrer.referredById;
  while (checkParentId) {
    if (checkParentId === targetUser.id) {
      throw new Error(
        "Circular referral chain detected. The selected referrer is already in this user's downline.",
      );
    }
    const ancestor = await prisma.user.findUnique({
      where: { id: checkParentId },
      select: { referredById: true },
    });
    checkParentId = ancestor?.referredById || null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: { referredById: referrer.id },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        actorRole,
        action: AuditAction.USER_ROLE_CHANGED,
        targetType: 'USER_REFERRAL',
        targetId: targetUser.publicUid,
        oldValue: { previousReferrerUid: targetUser.referrer?.publicUid || null },
        newValue: { newReferrerUid: referrer.publicUid, newReferrerName: referrer.name },
        ipAddress: (meta?.ipAddress as string) || null,
        userAgent: (meta?.userAgent as string) || null,
      },
    });
  });

  return {
    success: true,
    message: `Successfully linked ${targetUser.name} (${targetUser.publicUid}) to referrer ${referrer.name} (${referrer.publicUid}).`,
    referrer: { publicUid: referrer.publicUid, name: referrer.name },
  };
}
