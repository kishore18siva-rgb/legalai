"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authController_1 = require("../controllers/authController");
const dashboardController_1 = require("../controllers/dashboardController");
const inspectionController_1 = require("../controllers/inspectionController");
const ruleController_1 = require("../controllers/ruleController");
const legalSourceController_1 = require("../controllers/legalSourceController");
const ruleUpdateController_1 = require("../controllers/ruleUpdateController");
const auditLogController_1 = require("../controllers/auditLogController");
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const storageDir = path_1.default.join(process.cwd(), 'storage', 'uploads');
if (!fs_1.default.existsSync(storageDir))
    fs_1.default.mkdirSync(storageDir, { recursive: true });
const upload = (0, multer_1.default)({
    dest: storageDir,
    limits: { fileSize: 15 * 1024 * 1024 },
});
// PUBLIC AUTH
router.post('/auth/login', authController_1.login);
// PROTECTED
router.use(auth_1.authenticateJWT);
router.get('/auth/me', authController_1.getMe);
router.get('/dashboard', dashboardController_1.getDashboardStats);
// INSPECTIONS WORKFLOW
router.post('/inspections/auto-scan', upload.array('images', 10), inspectionController_1.autoScanInspection);
router.post('/inspections/:id/confirm-and-evaluate', inspectionController_1.confirmAndEvaluateInspection);
router.post('/inspections/:id/update-pdp', inspectionController_1.updatePdpFace);
router.post('/inspections', inspectionController_1.createInspection);
router.get('/inspections', inspectionController_1.listInspections);
router.get('/inspections/:id', inspectionController_1.getInspectionById);
router.post('/inspections/:id/images', upload.single('image'), inspectionController_1.uploadImage);
router.post('/inspections/:id/analyze', inspectionController_1.analyzeInspection);
router.post('/inspections/:id/correct-field', inspectionController_1.correctField);
router.post('/inspections/:id/recalculate', inspectionController_1.recalculateInspection);
router.get('/inspections/:id/report', inspectionController_1.generateReport);
// PRODUCTS
router.get('/products', productController_1.listProducts);
router.post('/products', productController_1.createProduct);
// LEGAL RULES
router.get('/rules', ruleController_1.listRules);
router.get('/rules/:id', ruleController_1.getRuleById);
router.post('/rules', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), ruleController_1.createRule);
router.put('/rules/:id', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), ruleController_1.updateRule);
router.post('/rules/:id/approve', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), ruleController_1.approveRule);
router.post('/rules/:id/reject', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), ruleController_1.rejectRule);
// LEGAL SOURCES
router.get('/legal-sources', legalSourceController_1.listLegalSources);
router.post('/legal-sources', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), upload.single('pdf'), legalSourceController_1.uploadLegalSource);
router.post('/legal-sources/:id/process', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), legalSourceController_1.processLegalSource);
// RULE UPDATES & MONITORING
router.get('/rule-updates', ruleUpdateController_1.listRuleUpdates);
router.post('/rule-updates/check', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), ruleUpdateController_1.checkRuleUpdates);
router.post('/rule-updates/:id/approve', (0, auth_1.requireRole)(['ADMIN', 'LEGAL_REVIEWER']), ruleUpdateController_1.approveRuleUpdate);
router.get('/rule-updates/:id/diff', ruleUpdateController_1.getRuleDiff);
// AUDIT LOGS
router.get('/audit-logs', (0, auth_1.requireRole)(['ADMIN']), auditLogController_1.listAuditLogs);
exports.default = router;
