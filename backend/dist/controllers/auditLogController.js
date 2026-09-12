"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const listAuditLogs = async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
        return res.json(logs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listAuditLogs = listAuditLogs;
