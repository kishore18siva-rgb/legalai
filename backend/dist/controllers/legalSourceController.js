"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processLegalSource = exports.uploadLegalSource = exports.listLegalSources = void 0;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const legalPdfIngestionService_1 = require("../services/pdf/legalPdfIngestionService");
const prisma = new client_1.PrismaClient();
const pdfIngestionService = new legalPdfIngestionService_1.LegalPdfIngestionService();
const listLegalSources = async (req, res) => {
    try {
        const sources = await prisma.legalSource.findMany({
            orderBy: { uploadedAt: 'desc' },
            include: { rules: true },
        });
        return res.json(sources);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listLegalSources = listLegalSources;
const uploadLegalSource = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded.' });
        }
        const relPath = path_1.default.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
        const fileBuffer = fs_1.default.readFileSync(req.file.path);
        const hash = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.uploadLegalSource = uploadLegalSource;
const processLegalSource = async (req, res) => {
    try {
        const { id } = req.params;
        const source = await prisma.legalSource.findUnique({ where: { id } });
        if (!source)
            return res.status(404).json({ error: 'Legal source not found.' });
        const fullPath = path_1.default.join(process.cwd(), source.filePath);
        const result = await pdfIngestionService.processLegalPdf(fullPath);
        const updated = await prisma.legalSource.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                ruleCount: result.extractedRuleCount,
            },
        });
        return res.json({ message: 'PDF processed successfully', source: updated, result });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.processLegalSource = processLegalSource;
