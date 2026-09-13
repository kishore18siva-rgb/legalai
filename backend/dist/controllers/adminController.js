"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatus = exports.listUsers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const listUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                employeeNumber: true,
                role: true,
                status: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ users });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to list users' });
    }
};
exports.listUsers = listUsers;
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        const oldStatus = targetUser.status;
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { status },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
            },
        });
        // Action name determination
        let action = 'ACCOUNT_STATUS_CHANGED';
        if (status === 'SUSPENDED')
            action = 'ACCOUNT_SUSPENDED';
        else if (status === 'ACTIVE')
            action = 'ACCOUNT_ACTIVATED';
        else if (status === 'INACTIVE')
            action = 'ACCOUNT_DEACTIVATED';
        await prisma.auditLog.create({
            data: {
                userId: req.user?.id,
                userEmail: req.user?.email,
                action,
                entity: 'User',
                entityId: targetUser.id,
                oldValueJson: JSON.stringify({ status: oldStatus }),
                newValueJson: JSON.stringify({ status: updatedUser.status }),
            },
        });
        return res.json({
            message: `User account status updated to ${status}.`,
            user: updatedUser,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to update user status' });
    }
};
exports.updateUserStatus = updateUserStatus;
