import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { login, getMe } from '../controllers/authController';
import { getDashboardStats } from '../controllers/dashboardController';
import {
  autoScanInspection,
  confirmAndEvaluateInspection,
  createInspection,
  uploadImage,
  analyzeInspection,
  getInspectionById,
  correctField,
  recalculateInspection,
  listInspections,
  generateReport,
} from '../controllers/inspectionController';
import {
  listRules,
  getRuleById,
  createRule,
  updateRule,
  approveRule,
  rejectRule,
} from '../controllers/ruleController';
import {
  listLegalSources,
  uploadLegalSource,
  processLegalSource,
} from '../controllers/legalSourceController';
import {
  listRuleUpdates,
  checkRuleUpdates,
  approveRuleUpdate,
  getRuleDiff,
} from '../controllers/ruleUpdateController';
import { listAuditLogs } from '../controllers/auditLogController';
import { listProducts, createProduct } from '../controllers/productController';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

const storageDir = path.join(process.cwd(), 'storage', 'uploads');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const upload = multer({
  dest: storageDir,
  limits: { fileSize: 15 * 1024 * 1024 },
});

// PUBLIC AUTH
router.post('/auth/login', login);

// PROTECTED
router.use(authenticateJWT);

router.get('/auth/me', getMe);
router.get('/dashboard', getDashboardStats);

// INSPECTIONS WORKFLOW
router.post('/inspections/auto-scan', upload.array('images', 10), autoScanInspection);
router.post('/inspections/:id/confirm-and-evaluate', confirmAndEvaluateInspection);
router.post('/inspections', createInspection);
router.get('/inspections', listInspections);
router.get('/inspections/:id', getInspectionById);
router.post('/inspections/:id/images', upload.single('image'), uploadImage);
router.post('/inspections/:id/analyze', analyzeInspection);
router.post('/inspections/:id/correct-field', correctField);
router.post('/inspections/:id/recalculate', recalculateInspection);
router.get('/inspections/:id/report', generateReport);

// PRODUCTS
router.get('/products', listProducts);
router.post('/products', createProduct);

// LEGAL RULES
router.get('/rules', listRules);
router.get('/rules/:id', getRuleById);
router.post('/rules', requireRole(['ADMIN', 'LEGAL_REVIEWER']), createRule);
router.put('/rules/:id', requireRole(['ADMIN', 'LEGAL_REVIEWER']), updateRule);
router.post('/rules/:id/approve', requireRole(['ADMIN', 'LEGAL_REVIEWER']), approveRule);
router.post('/rules/:id/reject', requireRole(['ADMIN', 'LEGAL_REVIEWER']), rejectRule);

// LEGAL SOURCES
router.get('/legal-sources', listLegalSources);
router.post('/legal-sources', requireRole(['ADMIN', 'LEGAL_REVIEWER']), upload.single('pdf'), uploadLegalSource);
router.post('/legal-sources/:id/process', requireRole(['ADMIN', 'LEGAL_REVIEWER']), processLegalSource);

// RULE UPDATES & MONITORING
router.get('/rule-updates', listRuleUpdates);
router.post('/rule-updates/check', requireRole(['ADMIN', 'LEGAL_REVIEWER']), checkRuleUpdates);
router.post('/rule-updates/:id/approve', requireRole(['ADMIN', 'LEGAL_REVIEWER']), approveRuleUpdate);
router.get('/rule-updates/:id/diff', getRuleDiff);

// AUDIT LOGS
router.get('/audit-logs', requireRole(['ADMIN']), listAuditLogs);

export default router;
