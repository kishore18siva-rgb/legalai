"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.registerInspector = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'legallens_super_secret_jwt_key_2011_legal_metrology';
// Standardized role display names & backend role keys
// 1. SYSTEM_ADMINISTRATOR -> System Administrator
// 2. SENIOR_LEGAL_OFFICER -> Senior Legal Officer / Reviewer
// 3. COMPLIANCE_OFFICER -> Compliance Officer / Inspector
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};
const validatePhone = (phone) => {
    // Accepts standard Indian mobile format e.g. +91 9876543210, 09876543210, 9876543210
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned);
};
const validatePasswordComplexity = (password) => {
    if (password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number.';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Password must contain at least one special character.';
    }
    return null;
};
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            // Audit log failed attempt without exposing email existence
            await prisma.auditLog.create({
                data: {
                    action: 'LOGIN_FAILED',
                    entity: 'User',
                    userEmail: normalizedEmail,
                    newValueJson: JSON.stringify({ reason: 'User not found' }),
                },
            });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        // Verify account status
        if (user.status === 'SUSPENDED') {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    userEmail: user.email,
                    action: 'LOGIN_FAILED',
                    entity: 'User',
                    entityId: user.id,
                    newValueJson: JSON.stringify({ reason: 'Account suspended' }),
                },
            });
            return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
        }
        if (user.status === 'INACTIVE') {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    userEmail: user.email,
                    action: 'LOGIN_FAILED',
                    entity: 'User',
                    entityId: user.id,
                    newValueJson: JSON.stringify({ reason: 'Account inactive' }),
                },
            });
            return res.status(403).json({ error: 'Your account is currently inactive. Please contact the administrator.' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    userEmail: user.email,
                    action: 'LOGIN_FAILED',
                    entity: 'User',
                    entityId: user.id,
                    newValueJson: JSON.stringify({ reason: 'Incorrect password' }),
                },
            });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        // Update lastLoginAt timestamp
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '7d' });
        // Audit log success
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS',
                entity: 'User',
                entityId: user.id,
            },
        });
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                employeeNumber: user.employeeNumber,
                role: user.role,
                status: user.status,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Login server error' });
    }
};
exports.login = login;
const registerInspector = async (req, res) => {
    try {
        const { name, email, phoneNumber, employeeNumber, password, confirmPassword } = req.body;
        // 1. Mandatory Field Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Full Name is required.' });
        }
        if (name.trim().length < 2) {
            return res.status(400).json({ error: 'Please enter a valid full name.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Official Email Address is required.' });
        }
        const normalizedEmail = email.trim().toLowerCase();
        if (!validateEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email address format.' });
        }
        if (!phoneNumber || !phoneNumber.trim()) {
            return res.status(400).json({ error: 'Phone Number is required.' });
        }
        const trimmedPhone = phoneNumber.trim();
        if (!validatePhone(trimmedPhone)) {
            return res.status(400).json({ error: 'Invalid phone number format. Please provide a valid 10-digit Indian phone number.' });
        }
        if (!employeeNumber || !employeeNumber.trim()) {
            return res.status(400).json({ error: 'Employee Number is required.' });
        }
        const trimmedEmpNum = employeeNumber.trim();
        if (!password) {
            return res.status(400).json({ error: 'Password is required.' });
        }
        const passwordError = validatePasswordComplexity(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }
        if (!confirmPassword) {
            return res.status(400).json({ error: 'Confirm Password is required.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
        }
        // 2. Uniqueness Checks
        const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingEmail) {
            return res.status(409).json({ error: 'An account with this email address already exists.' });
        }
        const existingEmp = await prisma.user.findUnique({ where: { employeeNumber: trimmedEmpNum } });
        if (existingEmp) {
            return res.status(409).json({ error: 'An account with this Employee Number already exists.' });
        }
        const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: trimmedPhone } });
        if (existingPhone) {
            return res.status(409).json({ error: 'An account with this Phone Number already exists.' });
        }
        // 3. Force Role to COMPLIANCE_OFFICER (Strict server-side enforcement)
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                phoneNumber: trimmedPhone,
                employeeNumber: trimmedEmpNum,
                passwordHash,
                role: 'COMPLIANCE_OFFICER', // FORCED: Cannot be overridden by client body
                status: 'ACTIVE',
            },
        });
        // 4. Audit Log Registration Event
        await prisma.auditLog.create({
            data: {
                userId: newUser.id,
                userEmail: newUser.email,
                action: 'INSPECTOR_REGISTERED',
                entity: 'User',
                entityId: newUser.id,
                newValueJson: JSON.stringify({ role: newUser.role, employeeNumber: newUser.employeeNumber }),
            },
        });
        return res.status(201).json({
            message: 'Inspector account created successfully.',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phoneNumber: newUser.phoneNumber,
                employeeNumber: newUser.employeeNumber,
                role: newUser.role,
                status: newUser.status,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Inspector registration server error' });
    }
};
exports.registerInspector = registerInspector;
const getMe = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Not authenticated' });
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
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
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getMe = getMe;
