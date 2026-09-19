"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePdpFace = exports.generateReport = exports.listInspections = exports.recalculateInspection = exports.correctField = exports.getInspectionById = exports.analyzeInspection = exports.uploadImage = exports.createInspection = exports.confirmAndEvaluateInspection = exports.autoScanInspection = void 0;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const ocrService_1 = require("../services/ocr/ocrService");
const aiExtractionService_1 = require("../services/ai/aiExtractionService");
const engine_1 = require("../services/rule_engine/engine");
const pdfReportService_1 = require("../services/pdf/pdfReportService");
const prisma = new client_1.PrismaClient();
const ocrService = new ocrService_1.OcrService();
const aiExtractionService = new aiExtractionService_1.AiExtractionService();
const ruleEngine = new engine_1.DeterministicRuleEngine();
const pdfReportService = new pdfReportService_1.PdfReportService();
/**
 * Image-First Auto-Scan: Accepts uploaded images, performs OCR & AI extraction,
 * infers product category, checks panel coverage, and returns candidate metadata for user review.
 */
const autoScanInspection = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'Please upload at least one product label image.' });
        }
        const inspectorId = req.user.id;
        const count = (await prisma.inspection.count()) + 1;
        const inspectionNumber = `LL-INSP-2026-${String(count).padStart(5, '0')}`;
        // 1. Create Initial Product Container
        const product = await prisma.product.create({
            data: {
                name: 'Auto-Detected Packaged Product',
                category: 'Food',
            },
        });
        // 2. Create Draft Inspection Record
        const inspection = await prisma.inspection.create({
            data: {
                inspectionNumber,
                productId: product.id,
                inspectorId,
                status: 'READY_FOR_REVIEW',
                overallResult: 'REVIEW',
            },
        });
        const imageTypes = req.body.imageTypes ? (Array.isArray(req.body.imageTypes) ? req.body.imageTypes : [req.body.imageTypes]) : [];
        let fullOcrText = '';
        let totalConfidence = 0;
        const savedImages = [];
        const faceOcrInputs = [];
        // 3. Process Uploaded Images & Perform Face-Specific OCR
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relPath = path_1.default.relative(process.cwd(), file.path).replace(/\\/g, '/');
            const imageType = imageTypes[i] || (i === 0 ? 'FRONT' : i === 1 ? 'BACK' : i === 2 ? 'LEFT_SIDE' : i === 3 ? 'RIGHT_SIDE' : i === 4 ? 'TOP' : 'BOTTOM');
            const quality = await ocrService.checkImageQuality(file.path);
            const imgRecord = await prisma.inspectionImage.create({
                data: {
                    inspectionId: inspection.id,
                    imageType,
                    originalPath: relPath,
                    processedPath: relPath,
                    qualityStatus: quality,
                    fileSize: file.size,
                },
            });
            savedImages.push(imgRecord);
            const ocrResult = await ocrService.processImage(file.path, imageType, file.originalname);
            await prisma.ocrResult.create({
                data: {
                    inspectionImageId: imgRecord.id,
                    fullText: ocrResult.fullText,
                    confidence: ocrResult.confidence,
                    boundingBoxesJson: JSON.stringify(ocrResult.boundingBoxes),
                    provider: 'tesseract',
                },
            });
            faceOcrInputs.push({
                face: imageType,
                imageId: imgRecord.id,
                fullText: ocrResult.fullText,
                boundingBoxes: ocrResult.boundingBoxes,
            });
            fullOcrText += '\n' + ocrResult.fullText;
            totalConfidence += ocrResult.confidence;
        }
        const primaryImageId = savedImages[0]?.id;
        // 4. Perform Multi-Face AI Extraction & Category Inference
        const extractedFields = aiExtractionService.extractDeclarations(faceOcrInputs, primaryImageId);
        const productMeta = aiExtractionService.extractProductMetadata(fullOcrText, faceOcrInputs);
        const categoryInference = aiExtractionService.inferProductCategory(fullOcrText);
        // 5. Perform Image Coverage Analysis
        const panelTypes = savedImages.map((img) => img.imageType);
        const coverageResult = aiExtractionService.analyzeImageCoverage(panelTypes);
        // Auto-fill Product Record strictly from OCR Extracted Declarations or mark as null (Not detected)
        const detectedName = productMeta.name || extractedFields.find((f) => f.fieldKey === 'generic_name')?.rawValue || null;
        const detectedBrand = productMeta.brand || extractedFields.find((f) => f.fieldKey === 'brand_name')?.rawValue || null;
        const detectedMfg = extractedFields.find((f) => f.fieldKey === 'manufacturer_name')?.rawValue || null;
        await prisma.product.update({
            where: { id: product.id },
            data: {
                name: '',
                brand: null,
                category: '',
                manufacturer: null,
            },
        });
        // Save Extracted Fields to Database (Keep OCR extracted fields as evidence reference)
        const savedExtractedFields = [];
        for (const field of extractedFields) {
            const created = await prisma.extractedField.create({
                data: {
                    inspectionId: inspection.id,
                    fieldKey: field.fieldKey,
                    fieldLabel: field.fieldLabel,
                    rawValue: field.rawValue,
                    normalizedValue: field.normalizedValue !== undefined ? String(field.normalizedValue) : null,
                    originalText: field.originalText || null,
                    language: field.language || null,
                    script: field.script || null,
                    languageConfidence: field.languageConfidence || null,
                    unit: field.unit || null,
                    confidence: field.confidence,
                    sourceFace: field.sourceFace || null,
                    detectedFace: field.detectedFace || field.sourceFace || null,
                    placementStatus: field.placementStatus || null,
                    sourceImageId: field.sourceImageId || null,
                    sourceRegionJson: field.sourceRegionJson || null,
                    sourceText: field.sourceText || null,
                    measurementsJson: field.measurements ? JSON.stringify(field.measurements) : null,
                    extractionMethod: 'AI_ASSISTED',
                    reviewRequired: field.reviewRequired || field.confidence < 0.8,
                },
            });
            savedExtractedFields.push(created);
        }
        const rawOcrByFace = faceOcrInputs.map((f) => ({
            face: f.face,
            text: f.fullText,
            confidence: 0.95,
            imageId: f.imageId,
        }));
        // Return Candidate Data for User Review Screen - Empty product metadata for manual inspector entry
        return res.status(200).json({
            inspectionId: inspection.id,
            inspectionNumber,
            metadataStatus: 'DRAFT_INSPECTOR_ENTRY',
            detectedProduct: {
                name: '',
                brand: '',
                variant: '',
                category: '',
                categoryConfidence: 0,
                categoryReason: 'Manual inspector entry required',
            },
            fullOcrText: fullOcrText.trim(),
            rawOcrByFace,
            imageCoverage: coverageResult,
            extractedFields: savedExtractedFields,
            images: savedImages,
        });
    }
    catch (err) {
        console.error('Error during auto-scan inspection:', err);
        return res.status(500).json({ error: err.message || 'Error executing package auto-scan.' });
    }
};
exports.autoScanInspection = autoScanInspection;
/**
 * Confirms user-reviewed field declarations & executes the deterministic Legal Rule Engine
 */
const confirmAndEvaluateInspection = async (req, res) => {
    try {
        const id = req.params.id || req.body.inspectionId;
        const { confirmedProduct, confirmedFields, pdpFace } = req.body;
        const inspection = await prisma.inspection.findUnique({
            where: { id },
            include: { product: true, extractedFields: true },
        });
        if (!inspection)
            return res.status(404).json({ error: 'Inspection not found.' });
        // 1. Update Product Details if User Edited
        if (confirmedProduct && inspection.productId) {
            await prisma.product.update({
                where: { id: inspection.productId },
                data: {
                    name: confirmedProduct.name,
                    brand: confirmedProduct.brand,
                    category: confirmedProduct.category,
                    packageType: confirmedProduct.packageType,
                },
            });
        }
        // Update PDP Face if provided
        const targetPdp = (pdpFace || inspection.pdpFace || 'FRONT').toUpperCase();
        await prisma.inspection.update({
            where: { id },
            data: {
                pdpFace: targetPdp,
                pdpDeterminationMethod: pdpFace ? 'MANUAL' : inspection.pdpDeterminationMethod || 'AI',
            },
        });
        // 2. Audit & Update Confirmed / Corrected Fields
        if (Array.isArray(confirmedFields)) {
            for (const field of confirmedFields) {
                const dbField = inspection.extractedFields.find((f) => f.fieldKey === field.fieldKey);
                if (dbField) {
                    const isValueEdited = dbField.rawValue !== field.rawValue;
                    const srcFace = (field.sourceFace || dbField.sourceFace || 'RIGHT_SIDE').toUpperCase();
                    const isOnPdp = srcFace === targetPdp;
                    const placementStatus = field.rawValue ? (isOnPdp ? 'DETECTED_CORRECT_PDP' : 'DETECTED_WRONG_PDP') : 'NOT_DETECTED';
                    await prisma.extractedField.update({
                        where: { id: dbField.id },
                        data: {
                            rawValue: field.rawValue,
                            normalizedValue: field.normalizedValue || field.rawValue,
                            unit: field.unit || dbField.unit,
                            sourceFace: srcFace,
                            detectedFace: field.detectedFace || dbField.detectedFace || srcFace,
                            placementStatus,
                            isCorrected: isValueEdited,
                            correctedValue: isValueEdited ? field.rawValue : dbField.correctedValue,
                            correctedByUserId: isValueEdited ? req.user.id : dbField.correctedByUserId,
                            correctedAt: isValueEdited ? new Date() : dbField.correctedAt,
                            correctionReason: isValueEdited ? 'Inspector confirmed review edit' : dbField.correctionReason,
                            reviewRequired: false,
                        },
                    });
                    if (isValueEdited) {
                        await prisma.auditLog.create({
                            data: {
                                userId: req.user.id,
                                userEmail: req.user.email,
                                action: 'FIELD_CORRECTED',
                                entity: 'ExtractedField',
                                entityId: dbField.id,
                                oldValueJson: JSON.stringify({ rawValue: dbField.rawValue }),
                                newValueJson: JSON.stringify({ rawValue: field.rawValue }),
                            },
                        });
                    }
                }
            }
        }
        // 3. Fetch Active Legal Rules from DB
        const activeRules = await prisma.legalRule.findMany({ where: { status: 'ACTIVE' } });
        const refreshedInspection = await prisma.inspection.findUnique({
            where: { id },
            include: { product: true, extractedFields: true },
        });
        const netQtyField = refreshedInspection?.extractedFields.find((f) => f.fieldKey === 'net_quantity');
        const context = {
            productName: refreshedInspection?.product?.name,
            category: refreshedInspection?.product?.category,
            packageType: refreshedInspection?.product?.packageType,
            isRetailPackage: true,
            pdpFace: refreshedInspection?.pdpFace || targetPdp,
            pdpDeterminationMethod: refreshedInspection?.pdpDeterminationMethod || 'AI',
            netQuantityValue: netQtyField?.normalizedValue ? parseFloat(String(netQtyField.normalizedValue)) : undefined,
            netQuantityUnit: netQtyField?.unit || undefined,
            hasPhysicalMeasurement: false,
        };
        const fieldsForEngine = (refreshedInspection?.extractedFields || []).map((f) => ({
            fieldKey: f.fieldKey,
            fieldLabel: f.fieldLabel,
            rawValue: f.rawValue,
            normalizedValue: f.normalizedValue,
            originalText: f.originalText,
            language: f.language,
            script: f.script,
            languageConfidence: f.languageConfidence,
            unit: f.unit,
            confidence: f.confidence,
            sourceFace: f.sourceFace,
            placementStatus: f.placementStatus,
            sourceImageId: f.sourceImageId,
            sourceRegionJson: f.sourceRegionJson,
            sourceText: f.sourceText,
            measurements: f.measurementsJson ? JSON.parse(f.measurementsJson) : undefined,
            reviewRequired: f.reviewRequired,
        }));
        // 4. Run Deterministic Rule Engine
        const ruleEvaluations = ruleEngine.evaluateRules(activeRules, fieldsForEngine, context);
        await prisma.ruleResult.deleteMany({ where: { inspectionId: id } });
        let passedCount = 0;
        let failedCount = 0;
        let reviewCount = 0;
        let naCount = 0;
        for (const ev of ruleEvaluations) {
            if (ev.result === 'PASS')
                passedCount++;
            if (ev.result === 'FAIL')
                failedCount++;
            if (ev.result === 'REVIEW')
                reviewCount++;
            if (ev.result === 'NOT_APPLICABLE')
                naCount++;
            await prisma.ruleResult.create({
                data: {
                    inspectionId: id,
                    ruleId: ev.ruleId,
                    ruleCode: ev.ruleCode,
                    ruleNumber: ev.ruleNumber,
                    result: ev.result,
                    requirementText: ev.requirementText,
                    extractedValue: ev.extractedValue || null,
                    originalText: ev.originalText || null,
                    language: ev.language || null,
                    script: ev.script || null,
                    languageConfidence: ev.languageConfidence || null,
                    expectedCondition: ev.expectedCondition || null,
                    reason: ev.reason,
                    confidence: ev.confidence,
                    sourceFace: ev.sourceFace || null,
                    detectedFace: ev.detectedFace || ev.sourceFace || null,
                    placementStatus: ev.placementStatus || null,
                    evidenceImageId: ev.evidenceImageId || null,
                    evidenceRegionJson: ev.evidenceRegionJson || null,
                    measurementsJson: ev.measurements ? JSON.stringify(ev.measurements) : null,
                    sourcePage: ev.sourcePage || null,
                    ruleVersion: ev.ruleVersion,
                },
            });
        }
        const applicableTotal = passedCount + failedCount + reviewCount;
        let complianceScore = applicableTotal > 0 ? (passedCount / applicableTotal) * 100 : 0;
        complianceScore = parseFloat(complianceScore.toFixed(1));
        let overallResult = 'PASS';
        if (failedCount > 0)
            overallResult = 'FAIL';
        else if (reviewCount > 0)
            overallResult = 'REVIEW';
        else if (passedCount === 0 && naCount > 0)
            overallResult = 'NOT_APPLICABLE';
        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                overallResult,
                complianceScore,
                passedCount,
                failedCount,
                reviewCount,
                naCount,
            },
            include: {
                product: true,
                images: true,
                extractedFields: true,
                ruleResults: { include: { rule: true } },
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userEmail: req.user.email,
                action: 'INSPECTION_COMPLETED',
                entity: 'Inspection',
                entityId: id,
                newValueJson: JSON.stringify({ overallResult, complianceScore }),
            },
        });
        return res.json(updatedInspection);
    }
    catch (err) {
        console.error('Error evaluating inspection:', err);
        return res.status(500).json({ error: err.message || 'Error running legal metrology rule engine.' });
    }
};
exports.confirmAndEvaluateInspection = confirmAndEvaluateInspection;
const createInspection = async (req, res) => {
    try {
        const { productName, category, packageType, manufacturer, brand, notes } = req.body;
        const inspectorId = req.user.id;
        let product = await prisma.product.create({
            data: {
                name: productName || 'Unidentified Commodity',
                brand: brand || null,
                category: category || 'Other',
                packageType: packageType || 'Pouch / Wrapper',
                manufacturer: manufacturer || null,
            },
        });
        const count = (await prisma.inspection.count()) + 1;
        const inspectionNumber = `LL-INSP-2026-${String(count).padStart(5, '0')}`;
        const inspection = await prisma.inspection.create({
            data: {
                inspectionNumber,
                productId: product.id,
                inspectorId,
                status: 'DRAFT',
                overallResult: 'REVIEW',
                complianceScore: 0.0,
                notes: notes || null,
            },
            include: {
                product: true,
                images: true,
            },
        });
        return res.status(201).json(inspection);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error creating inspection' });
    }
};
exports.createInspection = createInspection;
const uploadImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { imageType } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded.' });
        }
        const inspection = await prisma.inspection.findUnique({ where: { id } });
        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found.' });
        }
        const relPath = path_1.default.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
        const quality = await ocrService.checkImageQuality(req.file.path);
        const imageRecord = await prisma.inspectionImage.create({
            data: {
                inspectionId: id,
                imageType: imageType || 'FRONT',
                originalPath: relPath,
                processedPath: relPath,
                qualityStatus: quality,
                fileSize: req.file.size,
            },
        });
        return res.status(201).json(imageRecord);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error uploading image' });
    }
};
exports.uploadImage = uploadImage;
const analyzeInspection = async (req, res) => {
    try {
        const { id } = req.params;
        const inspection = await prisma.inspection.findUnique({
            where: { id },
            include: {
                images: true,
                product: true,
            },
        });
        if (!inspection)
            return res.status(404).json({ error: 'Inspection not found.' });
        if (inspection.images.length === 0) {
            return res.status(400).json({ error: 'Cannot analyze inspection without at least one product image.' });
        }
        await prisma.inspection.update({ where: { id }, data: { status: 'PROCESSING' } });
        await prisma.ruleResult.deleteMany({ where: { inspectionId: id } });
        await prisma.extractedField.deleteMany({ where: { inspectionId: id } });
        let fullOcrText = '';
        let totalConfidence = 0;
        let imageCount = 0;
        for (const img of inspection.images) {
            const fullPath = path_1.default.join(process.cwd(), img.originalPath);
            const ocrResult = await ocrService.processImage(fullPath);
            await prisma.ocrResult.create({
                data: {
                    inspectionImageId: img.id,
                    fullText: ocrResult.fullText,
                    confidence: ocrResult.confidence,
                    boundingBoxesJson: JSON.stringify(ocrResult.boundingBoxes),
                    provider: 'tesseract',
                },
            });
            fullOcrText += '\n' + ocrResult.fullText;
            totalConfidence += ocrResult.confidence;
            imageCount++;
        }
        const primaryImageId = inspection.images[0]?.id || undefined;
        const extractedDataList = aiExtractionService.extractDeclarations(fullOcrText, primaryImageId);
        const createdFields = [];
        for (const field of extractedDataList) {
            const created = await prisma.extractedField.create({
                data: {
                    inspectionId: id,
                    fieldKey: field.fieldKey,
                    fieldLabel: field.fieldLabel,
                    rawValue: field.rawValue,
                    normalizedValue: field.normalizedValue !== undefined ? String(field.normalizedValue) : null,
                    unit: field.unit || null,
                    confidence: field.confidence,
                    sourceImageId: field.sourceImageId || null,
                    sourceRegionJson: field.sourceRegionJson || null,
                    sourceText: field.sourceText || null,
                    extractionMethod: 'AI_ASSISTED',
                    reviewRequired: field.reviewRequired || false,
                },
            });
            createdFields.push(created);
        }
        const activeRules = await prisma.legalRule.findMany({ where: { status: 'ACTIVE' } });
        const netQtyField = extractedDataList.find((f) => f.fieldKey === 'net_quantity');
        const inspectionContext = {
            productName: inspection.product?.name,
            category: inspection.product?.category,
            packageType: inspection.product?.packageType,
            isRetailPackage: true,
            pdpFace: inspection.pdpFace || 'FRONT',
            pdpDeterminationMethod: inspection.pdpDeterminationMethod || 'AI',
            netQuantityValue: netQtyField?.normalizedValue ? parseFloat(String(netQtyField.normalizedValue)) : undefined,
            netQuantityUnit: netQtyField?.unit || undefined,
            hasPhysicalMeasurement: false,
        };
        const ruleEvaluations = ruleEngine.evaluateRules(activeRules, extractedDataList, inspectionContext);
        let passedCount = 0;
        let failedCount = 0;
        let reviewCount = 0;
        let naCount = 0;
        for (const ev of ruleEvaluations) {
            if (ev.result === 'PASS')
                passedCount++;
            if (ev.result === 'FAIL')
                failedCount++;
            if (ev.result === 'REVIEW')
                reviewCount++;
            if (ev.result === 'NOT_APPLICABLE')
                naCount++;
            await prisma.ruleResult.create({
                data: {
                    inspectionId: id,
                    ruleId: ev.ruleId,
                    ruleCode: ev.ruleCode,
                    ruleNumber: ev.ruleNumber,
                    result: ev.result,
                    requirementText: ev.requirementText,
                    extractedValue: ev.extractedValue || null,
                    expectedCondition: ev.expectedCondition || null,
                    reason: ev.reason,
                    confidence: ev.confidence,
                    sourceFace: ev.sourceFace || null,
                    detectedFace: ev.detectedFace || ev.sourceFace || null,
                    placementStatus: ev.placementStatus || null,
                    evidenceImageId: ev.evidenceImageId || null,
                    evidenceRegionJson: ev.evidenceRegionJson || null,
                    sourcePage: ev.sourcePage || null,
                    ruleVersion: ev.ruleVersion,
                },
            });
        }
        const applicableTotal = passedCount + failedCount + reviewCount;
        let complianceScore = applicableTotal > 0 ? (passedCount / applicableTotal) * 100 : 0;
        complianceScore = parseFloat(complianceScore.toFixed(1));
        let overallResult = 'PASS';
        if (failedCount > 0)
            overallResult = 'FAIL';
        else if (reviewCount > 0)
            overallResult = 'REVIEW';
        else if (passedCount === 0 && naCount > 0)
            overallResult = 'NOT_APPLICABLE';
        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                overallResult,
                complianceScore,
                scoreConfidence: totalConfidence / (imageCount || 1),
                passedCount,
                failedCount,
                reviewCount,
                naCount,
            },
            include: {
                product: true,
                images: { include: { ocrResults: true } },
                extractedFields: true,
                ruleResults: { include: { rule: true } },
            },
        });
        return res.json(updatedInspection);
    }
    catch (err) {
        await prisma.inspection.update({ where: { id: req.params.id }, data: { status: 'DRAFT' } });
        return res.status(500).json({ error: err.message || 'Error analyzing inspection' });
    }
};
exports.analyzeInspection = analyzeInspection;
const getInspectionById = async (req, res) => {
    try {
        const { id } = req.params;
        const inspection = await prisma.inspection.findUnique({
            where: { id },
            include: {
                product: true,
                inspector: { select: { id: true, name: true, email: true, role: true } },
                images: { include: { ocrResults: true } },
                extractedFields: true,
                ruleResults: { include: { rule: true } },
                reports: true,
            },
        });
        if (!inspection)
            return res.status(404).json({ error: 'Inspection not found.' });
        return res.json(inspection);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getInspectionById = getInspectionById;
const correctField = async (req, res) => {
    try {
        const { id } = req.params;
        const { fieldId, correctedValue, reason } = req.body;
        if (!fieldId || correctedValue === undefined) {
            return res.status(400).json({ error: 'fieldId and correctedValue are required.' });
        }
        const existingField = await prisma.extractedField.findUnique({ where: { id: fieldId } });
        if (!existingField || existingField.inspectionId !== id) {
            return res.status(404).json({ error: 'Extracted field not found for this inspection.' });
        }
        await prisma.extractedField.update({
            where: { id: fieldId },
            data: {
                rawValue: correctedValue,
                normalizedValue: correctedValue,
                isCorrected: true,
                correctedValue,
                correctedByUserId: req.user.id,
                correctedAt: new Date(),
                correctionReason: reason || 'Inspector manual correction',
                reviewRequired: false,
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userEmail: req.user.email,
                action: 'FIELD_CORRECTED',
                entity: 'ExtractedField',
                entityId: fieldId,
                oldValueJson: JSON.stringify({ rawValue: existingField.rawValue }),
                newValueJson: JSON.stringify({ correctedValue, reason }),
            },
        });
        await recalculateInspectionEngine(id);
        const refreshed = await prisma.inspection.findUnique({
            where: { id },
            include: {
                product: true,
                extractedFields: true,
                ruleResults: { include: { rule: true } },
            },
        });
        return res.json({ message: 'Field corrected and rule engine recalculated.', inspection: refreshed });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.correctField = correctField;
const recalculateInspection = async (req, res) => {
    try {
        const { id } = req.params;
        const refreshed = await recalculateInspectionEngine(id);
        return res.json(refreshed);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.recalculateInspection = recalculateInspection;
async function recalculateInspectionEngine(inspectionId) {
    const inspection = await prisma.inspection.findUnique({
        where: { id: inspectionId },
        include: { product: true, extractedFields: true },
    });
    if (!inspection)
        throw new Error('Inspection not found');
    const activeRules = await prisma.legalRule.findMany({ where: { status: 'ACTIVE' } });
    const fieldsForEngine = inspection.extractedFields.map((f) => ({
        fieldKey: f.fieldKey,
        fieldLabel: f.fieldLabel,
        rawValue: f.rawValue,
        normalizedValue: f.normalizedValue,
        unit: f.unit,
        confidence: f.confidence,
        sourceFace: f.sourceFace,
        placementStatus: f.placementStatus,
        sourceImageId: f.sourceImageId,
        sourceRegionJson: f.sourceRegionJson,
        sourceText: f.sourceText,
        reviewRequired: f.reviewRequired,
    }));
    const netQtyField = fieldsForEngine.find((f) => f.fieldKey === 'net_quantity');
    const context = {
        productName: inspection.product?.name,
        category: inspection.product?.category,
        packageType: inspection.product?.packageType,
        isRetailPackage: true,
        pdpFace: inspection.pdpFace || 'FRONT',
        pdpDeterminationMethod: inspection.pdpDeterminationMethod || 'AI',
        netQuantityValue: netQtyField?.normalizedValue ? parseFloat(String(netQtyField.normalizedValue)) : undefined,
        netQuantityUnit: netQtyField?.unit || undefined,
        hasPhysicalMeasurement: false,
    };
    const evaluations = ruleEngine.evaluateRules(activeRules, fieldsForEngine, context);
    await prisma.ruleResult.deleteMany({ where: { inspectionId } });
    let passedCount = 0;
    let failedCount = 0;
    let reviewCount = 0;
    let naCount = 0;
    for (const ev of evaluations) {
        if (ev.result === 'PASS')
            passedCount++;
        if (ev.result === 'FAIL')
            failedCount++;
        if (ev.result === 'REVIEW')
            reviewCount++;
        if (ev.result === 'NOT_APPLICABLE')
            naCount++;
        await prisma.ruleResult.create({
            data: {
                inspectionId,
                ruleId: ev.ruleId,
                ruleCode: ev.ruleCode,
                ruleNumber: ev.ruleNumber,
                result: ev.result,
                requirementText: ev.requirementText,
                extractedValue: ev.extractedValue || null,
                expectedCondition: ev.expectedCondition || null,
                reason: ev.reason,
                confidence: ev.confidence,
                sourceFace: ev.sourceFace || null,
                detectedFace: ev.detectedFace || ev.sourceFace || null,
                placementStatus: ev.placementStatus || null,
                evidenceImageId: ev.evidenceImageId || null,
                evidenceRegionJson: ev.evidenceRegionJson || null,
                sourcePage: ev.sourcePage || null,
                ruleVersion: ev.ruleVersion,
            },
        });
    }
    const applicableTotal = passedCount + failedCount + reviewCount;
    let complianceScore = applicableTotal > 0 ? (passedCount / applicableTotal) * 100 : 0;
    complianceScore = parseFloat(complianceScore.toFixed(1));
    let overallResult = 'PASS';
    if (failedCount > 0)
        overallResult = 'FAIL';
    else if (reviewCount > 0)
        overallResult = 'REVIEW';
    else if (passedCount === 0 && naCount > 0)
        overallResult = 'NOT_APPLICABLE';
    return prisma.inspection.update({
        where: { id: inspectionId },
        data: {
            overallResult,
            complianceScore,
            passedCount,
            failedCount,
            reviewCount,
            naCount,
        },
        include: {
            product: true,
            extractedFields: true,
            ruleResults: { include: { rule: true } },
        },
    });
}
const listInspections = async (req, res) => {
    try {
        const { status, result, search } = req.query;
        const where = {};
        if (status)
            where.status = String(status);
        if (result)
            where.overallResult = String(result);
        if (search) {
            where.OR = [
                { inspectionNumber: { contains: String(search) } },
                { product: { name: { contains: String(search) } } },
                { product: { brand: { contains: String(search) } } },
            ];
        }
        const inspections = await prisma.inspection.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                product: true,
                inspector: { select: { id: true, name: true, email: true } },
                images: true,
            },
        });
        return res.json(inspections);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listInspections = listInspections;
const generateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const inspection = await prisma.inspection.findUnique({
            where: { id },
            include: {
                product: true,
                inspector: true,
                ruleResults: true,
            },
        });
        if (!inspection)
            return res.status(404).json({ error: 'Inspection not found.' });
        const fileName = `Report-${inspection.inspectionNumber}.pdf`;
        const outPath = path_1.default.join(process.cwd(), 'storage', 'reports', fileName);
        await pdfReportService.generateComplianceReport(inspection, outPath);
        const relReportPath = `storage/reports/${fileName}`;
        let reportRecord = await prisma.report.findFirst({ where: { inspectionId: id } });
        if (!reportRecord) {
            reportRecord = await prisma.report.create({
                data: {
                    inspectionId: id,
                    reportPath: relReportPath,
                    generatedByUserId: req.user.id,
                },
            });
        }
        return res.json({ reportUrl: `/${relReportPath}`, report: reportRecord });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error generating PDF report' });
    }
};
exports.generateReport = generateReport;
/**
 * Controller to manually update Principal Display Panel (PDP) designated face
 */
const updatePdpFace = async (req, res) => {
    try {
        const { id } = req.params;
        const { pdpFace } = req.body;
        if (!pdpFace)
            return res.status(400).json({ error: 'pdpFace is required' });
        await prisma.inspection.update({
            where: { id },
            data: {
                pdpFace: pdpFace.toUpperCase(),
                pdpDeterminationMethod: 'MANUAL',
            },
        });
        // Re-evaluate rules with updated PDP
        return (0, exports.confirmAndEvaluateInspection)(req, res);
    }
    catch (err) {
        console.error('Error updating PDP face:', err);
        return res.status(500).json({ error: err.message || 'Error updating Principal Display Panel face.' });
    }
};
exports.updatePdpFace = updatePdpFace;
