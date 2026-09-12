import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: any, res: Response) => {
  try {
    const totalInspections = await prisma.inspection.count();
    const compliantCount = await prisma.inspection.count({ where: { overallResult: 'PASS' } });
    const nonCompliantCount = await prisma.inspection.count({ where: { overallResult: 'FAIL' } });
    const reviewCount = await prisma.inspection.count({ where: { overallResult: 'REVIEW' } });
    const naCount = await prisma.inspection.count({ where: { overallResult: 'NOT_APPLICABLE' } });

    const avgScoreResult = await prisma.inspection.aggregate({
      _avg: { complianceScore: true },
    });
    const avgComplianceScore = avgScoreResult._avg.complianceScore || 0;

    const recentInspections = await prisma.inspection.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        inspector: { select: { name: true, email: true } },
      },
    });

    const failedRuleGroups = await prisma.ruleResult.groupBy({
      by: ['ruleNumber', 'requirementText'],
      where: { result: 'FAIL' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const categoryBreakdown = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return res.json({
      stats: {
        totalInspections,
        compliantCount,
        nonCompliantCount,
        reviewCount,
        naCount,
        avgComplianceScore: parseFloat(avgComplianceScore.toFixed(1)),
      },
      failedRuleGroups: failedRuleGroups.map((g) => ({
        ruleNumber: g.ruleNumber,
        requirementText: g.requirementText,
        failCount: g._count.id,
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      recentInspections,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching dashboard stats' });
  }
};
