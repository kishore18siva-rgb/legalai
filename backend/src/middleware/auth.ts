import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    status?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'legallens_super_secret_jwt_key_2011_legal_metrology';

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verify against database to check user status and real role
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Authenticated user no longer exists.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'Your account is inactive.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Role mapping fallback for legacy keys if any
    const normalizedRole = req.user.role === 'ADMIN' 
      ? 'SYSTEM_ADMINISTRATOR' 
      : req.user.role === 'LEGAL_REVIEWER' 
      ? 'SENIOR_LEGAL_OFFICER' 
      : req.user.role === 'INSPECTOR' 
      ? 'COMPLIANCE_OFFICER' 
      : req.user.role;

    if (!roles.includes(req.user.role) && !roles.includes(normalizedRole)) {
      return res.status(403).json({ error: `Access denied. Insufficient permissions. Required role: ${roles.join(' or ')}.` });
    }

    next();
  };
};
