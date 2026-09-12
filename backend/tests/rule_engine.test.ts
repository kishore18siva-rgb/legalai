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

    const context: InspectionContext = { isRetailPackage: true };
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

    const context: InspectionContext = { isRetailPackage: true };
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
    const context: InspectionContext = { isRetailPackage: true, netQuantityValue: 5, netQuantityUnit: 'g' };
    const result = engine.evaluateSingleRule(rule, new Map(), context);

    expect(result.result).toBe('NOT_APPLICABLE');
    expect(result.reason).toContain('Exempt under Rule 26(a)');
  });
});
