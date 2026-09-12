import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listRules = async (req: any, res: Response) => {
  try {
    const { status, search } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (search) {
      where.OR = [
        { ruleNumber: { contains: String(search) } },
        { ruleCode: { contains: String(search) } },
        { title: { contains: String(search) } },
        { requirementText: { contains: String(search) } },
      ];
    }

    const rules = await prisma.legalRule.findMany({
      where,
      orderBy: { ruleNumber: 'asc' },
    });

    return res.json(rules);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getRuleById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await prisma.legalRule.findUnique({
      where: { id },
      include: { sourceDocument: true },
    });
    if (!rule) return res.status(404).json({ error: 'Legal rule not found.' });
    return res.json(rule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createRule = async (req: any, res: Response) => {
  try {
    const {
      ruleCode,
      ruleNumber,
      subRule,
      clause,
      schedule,
      title,
      requirementText,
      applicabilityCondition,
      validationType,
      parameters,
      capabilityClass,
      sourcePage,
      sourceText,
    } = req.body;

    const rule = await prisma.legalRule.create({
      data: {
        ruleCode,
        ruleNumber,
        subRule,
        clause,
        schedule,
        title,
        requirementText,
        applicabilityCondition: applicabilityCondition || '{}',
        validationType,
        parameters: parameters || null,
        capabilityClass: capabilityClass || 'STRUCTURED_DATA_CHECKABLE',
        sourcePage: sourcePage ? parseInt(sourcePage) : 1,
        sourceText: sourceText || requirementText,
        status: 'UNDER_REVIEW',
        version: 1,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'RULE_CREATED',
        entity: 'LegalRule',
        entityId: rule.id,
        newValueJson: JSON.stringify(rule),
      },
    });

    return res.status(201).json(rule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateRule = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.legalRule.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Legal rule not found.' });

    // Versioning rule superseding: mark existing SUPERSEDED and create new version
    const newVersion = existing.version + 1;
    
    // Supersede old rule
    await prisma.legalRule.update({
      where: { id },
      data: { status: 'SUPERSEDED' },
    });

    // Create new active version
    const newRule = await prisma.legalRule.create({
      data: {
        ...existing,
        id: undefined,
        ...req.body,
        version: newVersion,
        status: 'APPROVED',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'RULE_SUPERSEDED',
        entity: 'LegalRule',
        entityId: id,
        oldValueJson: JSON.stringify({ version: existing.version, status: 'SUPERSEDED' }),
        newValueJson: JSON.stringify({ version: newVersion, status: 'APPROVED' }),
      },
    });

    return res.json(newRule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const approveRule = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await prisma.legalRule.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'RULE_APPROVED',
        entity: 'LegalRule',
        entityId: id,
      },
    });

    return res.json(rule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const rejectRule = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await prisma.legalRule.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'RULE_REJECTED',
        entity: 'LegalRule',
        entityId: id,
      },
    });

    return res.json(rule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
