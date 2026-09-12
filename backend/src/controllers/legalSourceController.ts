import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { LegalPdfIngestionService } from '../services/pdf/legalPdfIngestionService';

const prisma = new PrismaClient();
const pdfIngestionService = new LegalPdfIngestionService();

export const listLegalSources = async (req: any, res: Response) => {
  try {
    const sources = await prisma.legalSource.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: { rules: true },
    });
    return res.json(sources);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const uploadLegalSource = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const relPath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const source = await prisma.legalSource.create({
      data: {
        name: req.file.originalname,
        version: `2011-V${Date.now().toString().slice(-4)}`,
        effectiveDate: new Date().toISOString().split('T')[0],
        filePath: relPath,
        fileHash: hash,
        status: 'DRAFT',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'LEGAL_SOURCE_UPLOADED',
        entity: 'LegalSource',
        entityId: source.id,
      },
    });

    return res.status(201).json(source);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const processLegalSource = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const source = await prisma.legalSource.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ error: 'Legal source not found.' });

    const fullPath = path.join(process.cwd(), source.filePath);
    const result = await pdfIngestionService.processLegalPdf(fullPath);

    const updated = await prisma.legalSource.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        ruleCount: result.extractedRuleCount,
      },
    });

    return res.json({ message: 'PDF processed successfully', source: updated, result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
