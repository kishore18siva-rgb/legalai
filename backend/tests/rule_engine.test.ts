import { DeterministicRuleEngine } from '../src/services/rule_engine/engine';
import { ExtractedFieldData, InspectionContext } from '../src/services/rule_engine/types';

describe('Deterministic Legal Rule Engine Tests', () => {
  let engine: DeterministicRuleEngine;

  beforeEach(() => {
    engine = new DeterministicRuleEngine();
  });

  test('Rule 6(1)(a) PASS when manufacturer name and complete address are present', () => {
    const rule = {
      id: 'rule-r6-1-a',
      ruleCode: 'R6_1_A_MFG_INFO',
      ruleNumber: 'Rule 6(1)(a)',
      title: 'Manufacturer Name and Address',
      requirementText: 'Every package shall bear name & address of manufacturer',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'REQUIRED_FIELD',
      parameters: JSON.stringify({ requiredFields: ['manufacturer_name', 'manufacturer_address'] }),
      capabilityClass: 'OCR_CHECKABLE',
      sourcePage: 5,
      sourceText: 'name and address of the manufacturer',
      version: 1,
      status: 'ACTIVE',
    };

    const fields: ExtractedFieldData[] = [
      { fieldKey: 'manufacturer_name', fieldLabel: 'Mfg Name', rawValue: 'Acme Consumer Ltd', confidence: 0.95 },
      { fieldKey: 'manufacturer_address', fieldLabel: 'Mfg Address', rawValue: 'Plot 12, MIDC Industrial Area, Pune 411018', confidence: 0.92 },
    ];

    const context: InspectionContext = { isRetailPackage: true, pdpFace: 'FRONT' };
    const result = engine.evaluateSingleRule(rule, new Map(fields.map((f) => [f.fieldKey, f])), context);

    expect(result.result).toBe('PASS');
    expect(result.extractedValue).toContain('Acme Consumer Ltd');
  });

  test('Rule 6(1)(c) FAIL when net quantity unit is non-SI', () => {
    const rule = {
      id: 'rule-r6-1-c',
      ruleCode: 'R6_1_C_NET_QTY',
      ruleNumber: 'Rule 6(1)(c)',
      title: 'Declaration of Net Quantity with SI Units',
      requirementText: 'The net quantity shall be in terms of standard unit of weight or measure',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'UNIT_VALIDATION',
      capabilityClass: 'OCR_CHECKABLE',
      sourcePage: 5,
      sourceText: 'standard unit of weight or measure',
      version: 1,
      status: 'ACTIVE',
    };

    const fields: ExtractedFieldData[] = [
      { fieldKey: 'net_quantity', fieldLabel: 'Net Quantity', rawValue: '2 lbs', unit: 'lbs', confidence: 0.95 },
    ];

    const context: InspectionContext = { isRetailPackage: true, pdpFace: 'FRONT' };
    const result = engine.evaluateSingleRule(rule, new Map(fields.map((f) => [f.fieldKey, f])), context);

    expect(result.result).toBe('FAIL');
    expect(result.reason).toContain('not a recognized legal SI unit');
  });

  test('Rule 26 Exemption NOT_APPLICABLE for packages <= 10g', () => {
    const rule = {
      id: 'rule-r6-1-a',
      ruleCode: 'R6_1_A_MFG_INFO',
      ruleNumber: 'Rule 6(1)(a)',
      title: 'Manufacturer Name and Address',
      requirementText: 'Every package shall bear name & address of manufacturer',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'REQUIRED_FIELD',
      capabilityClass: 'OCR_CHECKABLE',
      sourcePage: 5,
      sourceText: 'name and address of the manufacturer',
      version: 1,
      status: 'ACTIVE',
    };

    const fields: ExtractedFieldData[] = [];
    const context: InspectionContext = { isRetailPackage: true, netQuantityValue: 5, netQuantityUnit: 'g', pdpFace: 'FRONT' };
    const result = engine.evaluateSingleRule(rule, new Map(), context);

    expect(result.result).toBe('NOT_APPLICABLE');
    expect(result.reason).toContain('Exempt under Rule 26(a)');
  });

  test('Generic Brand vs Manufacturer Role Separation Test', () => {
    const { AiExtractionService } = require('../src/services/ai/aiExtractionService');
    const service = new AiExtractionService();

    const sampleOcrText = `FRONT PANEL:
ACME
CHOCOLATE BISCUITS

BACK PANEL:
Manufactured By: ACME FOODS PRIVATE LIMITED, INDUSTRIAL ZONE, MUMBAI 400001.
NET QUANTITY: 100 g`;

    const faceInputs = [
      { face: 'FRONT', imageId: 'img-1', fullText: 'FRONT PANEL:\nACME\nCHOCOLATE BISCUITS' },
      { face: 'BACK', imageId: 'img-2', fullText: 'BACK PANEL:\nManufactured By: ACME FOODS PRIVATE LIMITED, MUMBAI.\nNET QUANTITY: 100 g' },
    ];

    const meta = service.extractProductMetadata(sampleOcrText, faceInputs);
    const declarations = service.extractDeclarations(faceInputs, 'img-1');

    const mfgNameField = declarations.find((f: any) => f.fieldKey === 'manufacturer_name');

    expect(meta.brand).toBe('ACME');
    expect(meta.brand).not.toBe('ACME FOODS PRIVATE LIMITED');
    expect(mfgNameField?.rawValue).toBe('ACME FOODS PRIVATE LIMITED');
    expect(mfgNameField?.sourceFace).toBe('BACK');
  });

  test('Generic Candidate Scoring & Sentence Rejection Test (Milkmaid)', () => {
    const { AiExtractionService } = require('../src/services/ai/aiExtractionService');
    const service = new AiExtractionService();

    const sampleOcrText = `FRONT PANEL:
NESTLÉ
MILKMAID
Sweetened Condensed Partly Skimmed Milk

BACK PANEL:
with times nature and Youcan
Mkt by: Nestlé India Limited
NET QUANTITY: 190 g`;

    const faceInputs = [
      { face: 'FRONT', imageId: 'img-1', fullText: 'NESTLÉ\nMILKMAID\nSweetened Condensed Partly Skimmed Milk' },
      { face: 'BACK', imageId: 'img-2', fullText: 'with times nature and Youcan\nMkt by: Nestlé India Limited\nNET QUANTITY: 190 g' },
    ];

    const meta = service.extractProductMetadata(sampleOcrText, faceInputs);

    expect(meta.name).toBe('Sweetened Condensed Partly Skimmed Milk');
    expect(meta.name).not.toContain('with times nature');
    expect(meta.brand).toBe('NESTLÉ');
    expect(meta.variant).toBeNull(); // 190g is net quantity, not variant
  });
});
