"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'legallens_super_secret_jwt_key_2011_legal_metrology';
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userEmail: user.email,
                action: 'LOGIN',
                entity: 'User',
                entityId: user.id,
            },
        });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Login server error' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Not authenticated' });
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        return res.json({ user });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getMe = getMe;
