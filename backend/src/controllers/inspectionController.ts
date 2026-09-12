import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { OcrService } from '../services/ocr/ocrService';
import { AiExtractionService } from '../services/ai/aiExtractionService';
import { DeterministicRuleEngine } from '../services/rule_engine/engine';
import { PdfReportService } from '../services/pdf/pdfReportService';

const prisma = new PrismaClient();
const ocrService = new OcrService();
const aiExtractionService = new AiExtractionService();
const ruleEngine = new DeterministicRuleEngine();
const pdfReportService = new PdfReportService();

/**
 * Image-First Auto-Scan: Accepts uploaded images, performs OCR & AI extraction,
 * infers product category, checks panel coverage, and returns candidate metadata for user review.
 */
export const autoScanInspection = async (req: any, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
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

    // 3. Process Uploaded Images & Perform OCR
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      const imageType = imageTypes[i] || (i === 0 ? 'FRONT' : i === 1 ? 'BACK' : 'SIDE');

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

      const ocrResult = await ocrService.processImage(file.path);
      await prisma.ocrResult.create({
        data: {
          inspectionImageId: imgRecord.id,
          fullText: ocrResult.fullText,
          confidence: ocrResult.confidence,
          boundingBoxesJson: JSON.stringify(ocrResult.boundingBoxes),
          provider: 'tesseract',
        },
      });

      fullOcrText += '\n' + ocrResult.fullText;
      totalConfidence += ocrResult.confidence;
    }

    const primaryImageId = savedImages[0]?.id;

    // 4. Perform AI Extraction & Category Inference
    const extractedFields = aiExtractionService.extractDeclarations(fullOcrText, primaryImageId);
    const categoryInference = aiExtractionService.inferProductCategory(fullOcrText);

    // 5. Perform Image Coverage Analysis
    const panelTypes = savedImages.map((img) => img.imageType);
    const coverageResult = aiExtractionService.analyzeImageCoverage(panelTypes);

    // Auto-fill Product Record from Extracted Declarations
    const detectedName = extractedFields.find((f) => f.fieldKey === 'generic_name')?.rawValue || 'Packaged Commodity Item';
    const detectedBrand = extractedFields.find((f) => f.fieldKey === 'brand_name')?.rawValue || 'Generic Brand';
    const detectedMfg = extractedFields.find((f) => f.fieldKey === 'manufacturer_name')?.rawValue || null;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        name: detectedName,
        brand: detectedBrand,
        category: categoryInference.category,
        manufacturer: detectedMfg,
      },
    });

    // Save Extracted Fields to Database
    const savedExtractedFields = [];
    for (const field of extractedFields) {
      const created = await prisma.extractedField.create({
        data: {
          inspectionId: inspection.id,
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
          reviewRequired: field.reviewRequired || field.confidence < 0.8,
        },
      });
      savedExtractedFields.push(created);
    }

    // Return Candidate Data for User Review Screen
    return res.status(200).json({
      inspectionId: inspection.id,
      inspectionNumber,
      detectedProduct: {
        name: detectedName,
        brand: detectedBrand,
        category: categoryInference.category,
        categoryConfidence: categoryInference.confidence,
        categoryReason: categoryInference.reason,
      },
      imageCoverage: coverageResult,
      extractedFields: savedExtractedFields,
      images: savedImages,
    });
  } catch (err: any) {
    console.error('Error during auto-scan inspection:', err);
    return res.status(500).json({ error: err.message || 'Error executing package auto-scan.' });
  }
};

/**
 * Confirms user-reviewed field declarations & executes the deterministic Legal Rule Engine
 */
export const confirmAndEvaluateInspection = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { confirmedProduct, confirmedFields } = req.body;

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: { product: true, extractedFields: true },
    });

    if (!inspection) return res.status(404).json({ error: 'Inspection not found.' });

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

    // 2. Audit & Update Confirmed / Corrected Fields
    if (Array.isArray(confirmedFields)) {
      for (const field of confirmedFields) {
        const dbField = inspection.extractedFields.find((f) => f.fieldKey === field.fieldKey);
        if (dbField) {
          const isValueEdited = dbField.rawValue !== field.rawValue;
          await prisma.extractedField.update({
            where: { id: dbField.id },
            data: {
              rawValue: field.rawValue,
              normalizedValue: field.normalizedValue || field.rawValue,
              unit: field.unit || dbField.unit,
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
    const activeRules: any[] = await prisma.legalRule.findMany({ where: { status: 'ACTIVE' } });

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
      netQuantityValue: netQtyField?.normalizedValue ? parseFloat(String(netQtyField.normalizedValue)) : undefined,
      netQuantityUnit: netQtyField?.unit || undefined,
      hasPhysicalMeasurement: false,
    };

    const fieldsForEngine = (refreshedInspection?.extractedFields || []).map((f) => ({
      fieldKey: f.fieldKey,
      fieldLabel: f.fieldLabel,
      rawValue: f.rawValue,
      normalizedValue: f.normalizedValue,
      unit: f.unit,
      confidence: f.confidence,
      sourceImageId: f.sourceImageId,
      sourceRegionJson: f.sourceRegionJson,
      sourceText: f.sourceText,
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
      if (ev.result === 'PASS') passedCount++;
      if (ev.result === 'FAIL') failedCount++;
      if (ev.result === 'REVIEW') reviewCount++;
      if (ev.result === 'NOT_APPLICABLE') naCount++;

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

    let overallResult: 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE' = 'PASS';
    if (failedCount > 0) overallResult = 'FAIL';
    else if (reviewCount > 0) overallResult = 'REVIEW';
    else if (passedCount === 0 && naCount > 0) overallResult = 'NOT_APPLICABLE';

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
  } catch (err: any) {
    console.error('Error evaluating inspection:', err);
    return res.status(500).json({ error: err.message || 'Error running legal metrology rule engine.' });
  }
};

export const createInspection = async (req: any, res: Response) => {
  try {
    const { productName, category, packageType, manufacturer, brand, notes } = req.body;
    const inspectorId = req.user.id;

    let product = await prisma.product.create({
      data: {
        name: productName || 'Packaged Commodity Item',
        brand: brand || 'Generic Brand',
        category: category || 'Food',
        packageType: packageType || 'Wrapper / Box',
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error creating inspection' });
  }
};

export const uploadImage = async (req: any, res: Response) => {
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

    const relPath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error uploading image' });
  }
};

export const analyzeInspection = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        images: true,
        product: true,
      },
    });

    if (!inspection) return res.status(404).json({ error: 'Inspection not found.' });
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
      const fullPath = path.join(process.cwd(), img.originalPath);
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

    const activeRules: any[] = await prisma.legalRule.findMany({ where: { status: 'ACTIVE' } });

    const netQtyField = extractedDataList.find((f) => f.fieldKey === 'net_quantity');
    const inspectionContext = {
      productName: inspection.product?.name,
      category: inspection.product?.category,
      packageType: inspection.product?.packageType,
      isRetailPackage: true,
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
      if (ev.result === 'PASS') passedCount++;
      if (ev.result === 'FAIL') failedCount++;
      if (ev.result === 'REVIEW') reviewCount++;
      if (ev.result === 'NOT_APPLICABLE') naCount++;

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

    let overallResult: 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE' = 'PASS';
    if (failedCount > 0) overallResult = 'FAIL';
    else if (reviewCount > 0) overallResult = 'REVIEW';
    else if (passedCount === 0 && naCount > 0) overallResult = 'NOT_APPLICABLE';

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
  } catch (err: any) {
    await prisma.inspection.update({ where: { id: req.params.id }, data: { status: 'DRAFT' } });
    return res.status(500).json({ error: err.message || 'Error analyzing inspection' });
  }
};

export const getInspectionById = async (req: any, res: Response) => {
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

    if (!inspection) return res.status(404).json({ error: 'Inspection not found.' });
    return res.json(inspection);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const correctField = async (req: any, res: Response) => {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const recalculateInspection = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const refreshed = await recalculateInspectionEngine(id);
    return res.json(refreshed);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

async function recalculateInspectionEngine(inspectionId: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: { product: true, extractedFields: true },
  });
  if (!inspection) throw new Error('Inspection not found');

  const activeRules: any[] = await prisma.legalRule.findMany({ where: { status: 'ACTIVE' } });

  const fieldsForEngine = inspection.extractedFields.map((f) => ({
    fieldKey: f.fieldKey,
    fieldLabel: f.fieldLabel,
    rawValue: f.rawValue,
    normalizedValue: f.normalizedValue,
    unit: f.unit,
    confidence: f.confidence,
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
    if (ev.result === 'PASS') passedCount++;
    if (ev.result === 'FAIL') failedCount++;
    if (ev.result === 'REVIEW') reviewCount++;
    if (ev.result === 'NOT_APPLICABLE') naCount++;

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

  let overallResult: 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE' = 'PASS';
  if (failedCount > 0) overallResult = 'FAIL';
  else if (reviewCount > 0) overallResult = 'REVIEW';
  else if (passedCount === 0 && naCount > 0) overallResult = 'NOT_APPLICABLE';

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

export const listInspections = async (req: any, res: Response) => {
  try {
    const { status, result, search } = req.query;

    const where: any = {};
    if (status) where.status = String(status);
    if (result) where.overallResult = String(result);
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const generateReport = async (req: any, res: Response) => {
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

    if (!inspection) return res.status(404).json({ error: 'Inspection not found.' });

    const fileName = `Report-${inspection.inspectionNumber}.pdf`;
    const outPath = path.join(process.cwd(), 'storage', 'reports', fileName);

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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error generating PDF report' });
  }
};
