"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuleDiff = exports.approveRuleUpdate = exports.checkRuleUpdates = exports.listRuleUpdates = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const listRuleUpdates = async (req, res) => {
    try {
        const updates = await prisma.ruleUpdate.findMany({
            orderBy: { detectedAt: 'desc' },
            include: { diffs: true, approvedByUser: { select: { name: true, email: true } } },
        });
        return res.json(updates);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listRuleUpdates = listRuleUpdates;
const checkRuleUpdates = async (req, res) => {
    try {
        // Simulate monitoring official government legal gazette source
        const mockGazetteText = 'Legal Metrology (Packaged Commodities) Amendment Rules, 2026. Rule 6(1)(e) updated to mandate QR code for digital compliance.';
        const hash = crypto_1.default.createHash('sha256').update(mockGazetteText).digest('hex');
        const updateRecord = await prisma.ruleUpdate.create({
            data: {
                sourceUrl: 'https://consumeraffairs.nic.in/gazette/amendment-2026.pdf',
                documentHash: hash,
                documentVersion: '2026-AMEND-V1',
                effectiveDate: '2026-10-01',
                previousVersion: '2011-V1',
                newVersion: '2026-V1',
                changeSummary: 'Notification GSR 102(E): Amendment introducing digital QR code declaration mandate on retail packages under Rule 6(1)(h).',
                approvalStatus: 'PENDING',
                diffs: {
                    create: [
                        {
                            ruleCode: 'R6_1_H_QR_CODE',
                            changeType: 'ADDED',
                            oldRuleText: 'No QR code requirement in 2011 Rules',
                            newRuleText: 'Rule 6(1)(h): Every retail package shall bear a QR code linking to digital verification portal.',
                            aiSummary: 'Added new mandatory field: Digital QR Code for consumer information.',
                        },
                    ],
                },
            },
            include: { diffs: true },
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userEmail: req.user.email,
                action: 'LEGAL_UPDATE_DETECTED',
                entity: 'RuleUpdate',
                entityId: updateRecord.id,
            },
        });
        return res.status(201).json(updateRecord);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.checkRuleUpdates = checkRuleUpdates;
const approveRuleUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const update = await prisma.ruleUpdate.update({
            where: { id },
            data: {
                approvalStatus: 'APPROVED',
                approvedByUserId: req.user.id,
                approvedAt: new Date(),
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userEmail: req.user.email,
                action: 'RULE_UPDATE_APPROVED',
                entity: 'RuleUpdate',
                entityId: id,
            },
        });
        return res.json(update);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.approveRuleUpdate = approveRuleUpdate;
const getRuleDiff = async (req, res) => {
    try {
        const { id } = req.params;
        const update = await prisma.ruleUpdate.findUnique({
            where: { id },
            include: { diffs: true },
        });
        if (!update)
            return res.status(404).json({ error: 'Rule update not found.' });
        return res.json(update);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getRuleDiff = getRuleDiff;
