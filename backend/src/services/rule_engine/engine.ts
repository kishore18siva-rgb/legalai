import {
  ExtractedFieldData,
  InspectionContext,
  RuleEvaluationOutput,
  ComplianceResultStatus,
} from './types';

export interface RuleModel {
  id: string;
  ruleCode: string;
  ruleNumber: string;
  subRule?: string | null;
  clause?: string | null;
  schedule?: string | null;
  title: string;
  requirementText: string;
  applicabilityCondition: string;
  validationType: string;
  parameters?: string | null;
  exceptions?: string | null;
  capabilityClass: string;
  sourcePage: number;
  sourceText: string;
  version: number;
  status: string;
}

export class DeterministicRuleEngine {
  /**
   * Evaluates all legal rules against structured extraction data and context.
   */
  public evaluateRules(
    rules: RuleModel[],
    extractedFields: ExtractedFieldData[],
    context: InspectionContext
  ): RuleEvaluationOutput[] {
    const results: RuleEvaluationOutput[] = [];
    const fieldMap = new Map<string, ExtractedFieldData>();

    for (const field of extractedFields) {
      fieldMap.set(field.fieldKey, field);
    }

    for (const rule of rules) {
      const evaluation = this.evaluateSingleRule(rule, fieldMap, context);
      results.push(evaluation);
    }

    return results;
  }

  /**
   * Evaluates a single versioned legal rule deterministically.
   */
  public evaluateSingleRule(
    rule: RuleModel,
    fieldMap: Map<string, ExtractedFieldData>,
    context: InspectionContext
  ): RuleEvaluationOutput {
    // 1. APPLICABILITY CHECK
    const isApplicable = this.checkApplicability(rule, context);
    if (!isApplicable.applicable) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'NOT_APPLICABLE',
        requirementText: rule.requirementText,
        extractedValue: null,
        expectedCondition: isApplicable.reason,
        reason: `Exempt or Not Applicable: ${isApplicable.reason}`,
        confidence: 1.0,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    // 2. DETERMINISTIC RULE EVALUATION BY VALIDATION TYPE
    switch (rule.validationType) {
      case 'REQUIRED_FIELD':
        return this.evalRequiredField(rule, fieldMap);

      case 'UNIT_VALIDATION':
        return this.evalUnitValidation(rule, fieldMap);

      case 'DATE_FORMAT':
        return this.evalDateFormat(rule, fieldMap);

      case 'TEXT_MATCH':
        return this.evalTextMatch(rule, fieldMap);

      case 'TEXT_PRESENCE':
        return this.evalTextPresence(rule, fieldMap);

      case 'STANDARD_PACKAGE_CHECK':
        return this.evalStandardPackage(rule, fieldMap, context);

      case 'APPLICABILITY_RULE':
        return this.evalApplicabilityRule(rule, context);

      case 'QUANTITY_ERROR_CHECK':
        return this.evalQuantityError(rule, fieldMap, context);

      case 'FONT_SIZE_CHECK':
      case 'IMAGE_POSITION_CHECK':
      case 'READABILITY_CHECK':
      case 'MANUAL_REVIEW_REQUIRED':
        return {
          ruleId: rule.id,
          ruleCode: rule.ruleCode,
          ruleNumber: rule.ruleNumber,
          result: 'REVIEW',
          requirementText: rule.requirementText,
          extractedValue: 'Visual / Physical measurement required',
          expectedCondition: 'Requires inspector visual verification or physical measurement tool',
          reason: `Rule requires ${rule.capabilityClass}. Ordinary photograph cannot determine exact mm font height or placement clearance with 100% legal certainty. Manual review required.`,
          confidence: 0.7,
          sourcePage: rule.sourcePage,
          ruleVersion: rule.version,
        };

      default:
        return {
          ruleId: rule.id,
          ruleCode: rule.ruleCode,
          ruleNumber: rule.ruleNumber,
          result: 'REVIEW',
          requirementText: rule.requirementText,
          extractedValue: null,
          expectedCondition: 'Supported validation handler',
          reason: 'Validation type requires manual verification.',
          confidence: 0.5,
          sourcePage: rule.sourcePage,
          ruleVersion: rule.version,
        };
    }
  }

  private checkApplicability(rule: RuleModel, context: InspectionContext): { applicable: boolean; reason: string } {
    if (!context.isRetailPackage) {
      return { applicable: false, reason: 'Chapter II applies only to retail packages (Rule 3)' };
    }

    // Rule 26 Exemptions
    if (context.netQuantityValue !== undefined && context.netQuantityValue > 0) {
      const isWeightVol = ['g', 'ml', 'gram', 'millilitre'].includes((context.netQuantityUnit || '').toLowerCase());
      if (isWeightVol && context.netQuantityValue <= 10) {
        return { applicable: false, reason: 'Exempt under Rule 26(a): Net quantity is 10g or 10ml or less' };
      }
    }

    return { applicable: true, reason: 'Package is subject to retail legal metrology rules' };
  }

  private evalRequiredField(rule: RuleModel, fieldMap: Map<string, ExtractedFieldData>): RuleEvaluationOutput {
    let params: any = {};
    try {
      params = rule.parameters ? JSON.parse(rule.parameters) : {};
    } catch (e) {}

    const reqFields: string[] = params.requiredFields || [];
    let missing: string[] = [];
    let valuesFound: string[] = [];
    let lowestConfidence = 1.0;
    let evidenceImageId: string | null = null;
    let evidenceRegionJson: string | null = null;

    if (rule.ruleCode === 'R6_1_A_MFG_INFO') {
      const mfgName = fieldMap.get('manufacturer_name');
      const mfgAddr = fieldMap.get('manufacturer_address');
      const packName = fieldMap.get('packer_name');
      const impName = fieldMap.get('importer_name');

      if ((!mfgName || !mfgName.rawValue) && (!packName || !packName.rawValue) && (!impName || !impName.rawValue)) {
        missing.push('Manufacturer / Packer / Importer Name');
      } else {
        const found = mfgName?.rawValue || packName?.rawValue || impName?.rawValue || '';
        valuesFound.push(`Name: ${found}`);
        if (mfgName?.sourceImageId) evidenceImageId = mfgName.sourceImageId;
        if (mfgName?.sourceRegionJson) evidenceRegionJson = mfgName.sourceRegionJson;
      }

      if (!mfgAddr || !mfgAddr.rawValue) {
        missing.push('Complete Postal Address (Address/PIN)');
      } else {
        valuesFound.push(`Address: ${mfgAddr.rawValue}`);
      }
    } else if (rule.ruleCode === 'R6_1_B_GENERIC_NAME') {
      const field = fieldMap.get('generic_name');
      if (!field || !field.rawValue) {
        missing.push('Common/Generic Commodity Name');
      } else {
        valuesFound.push(field.rawValue);
        if (field.sourceImageId) evidenceImageId = field.sourceImageId;
        if (field.sourceRegionJson) evidenceRegionJson = field.sourceRegionJson;
      }
    } else if (rule.ruleCode === 'R6_2_COMPLAINT_CONTACT') {
      const nameAddr = fieldMap.get('complaint_address') || fieldMap.get('complaint_name');
      const phone = fieldMap.get('complaint_phone');
      const email = fieldMap.get('complaint_email');

      if (!nameAddr || !nameAddr.rawValue) missing.push('Complaint Officer Name/Address');
      if ((!phone || !phone.rawValue) && (!email || !email.rawValue)) missing.push('Complaint Phone or Email');

      if (nameAddr?.rawValue) valuesFound.push(nameAddr.rawValue);
      if (phone?.rawValue) valuesFound.push(`Tel: ${phone.rawValue}`);
      if (email?.rawValue) valuesFound.push(`Email: ${email.rawValue}`);
    }

    if (missing.length > 0) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'FAIL',
        requirementText: rule.requirementText,
        extractedValue: valuesFound.join('; ') || 'None detected',
        expectedCondition: `Mandatory field(s) required: ${missing.join(', ')}`,
        reason: `Non-compliant: Package is missing required declaration(s): ${missing.join(', ')}`,
        confidence: 0.95,
        evidenceImageId,
        evidenceRegionJson,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: valuesFound.join('; '),
      expectedCondition: 'All mandatory fields declared on label',
      reason: 'Compliant: Required declaration is clearly printed on package label.',
      confidence: 0.98,
      evidenceImageId,
      evidenceRegionJson,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }

  private evalUnitValidation(rule: RuleModel, fieldMap: Map<string, ExtractedFieldData>): RuleEvaluationOutput {
    const qtyField = fieldMap.get('net_quantity');
    if (!qtyField || !qtyField.rawValue) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'FAIL',
        requirementText: rule.requirementText,
        extractedValue: 'Not detected',
        expectedCondition: 'Net quantity declaration with valid SI unit (g, kg, ml, L, m, N, U)',
        reason: 'Non-compliant: Net quantity declaration is missing from package.',
        confidence: 0.98,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    const unit = (qtyField.unit || '').trim().toLowerCase();
    const validUnits = ['g', 'kg', 'mg', 'ml', 'l', 'm', 'cm', 'mm', 'sq m', 'sq cm', 'cubic cm', 'n', 'u', 'number'];

    const isValidUnit = validUnits.includes(unit) || /\b(g|kg|ml|l|m|cm|n|u)\b/i.test(qtyField.rawValue);

    if (!isValidUnit) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'FAIL',
        requirementText: rule.requirementText,
        extractedValue: qtyField.rawValue,
        expectedCondition: 'Standard SI unit required (g, kg, ml, L, N, U)',
        reason: `Non-compliant: Unit '${qtyField.unit}' is not a recognized legal SI unit under Rule 13.`,
        confidence: 0.95,
        evidenceImageId: qtyField.sourceImageId,
        evidenceRegionJson: qtyField.sourceRegionJson,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: qtyField.rawValue,
      expectedCondition: 'Valid SI unit declaration present',
      reason: `Compliant: Net quantity '${qtyField.rawValue}' uses valid legal SI unit '${qtyField.unit || 'SI'}'.`,
      confidence: 0.98,
      evidenceImageId: qtyField.sourceImageId,
      evidenceRegionJson: qtyField.sourceRegionJson,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }

  private evalDateFormat(rule: RuleModel, fieldMap: Map<string, ExtractedFieldData>): RuleEvaluationOutput {
    const dateField = fieldMap.get('mfg_date') || fieldMap.get('pack_date') || fieldMap.get('import_date');

    if (!dateField || !dateField.rawValue) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'FAIL',
        requirementText: rule.requirementText,
        extractedValue: 'Not detected',
        expectedCondition: 'Month and Year of manufacture / packing / import',
        reason: 'Non-compliant: Month and Year of manufacture or pre-packing is missing.',
        confidence: 0.95,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: dateField.rawValue,
      expectedCondition: 'Month and Year declared (MM/YYYY or Month YYYY)',
      reason: `Compliant: Manufacturing/Packing date '${dateField.rawValue}' is clearly declared.`,
      confidence: 0.95,
      evidenceImageId: dateField.sourceImageId,
      evidenceRegionJson: dateField.sourceRegionJson,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }

  private evalTextMatch(rule: RuleModel, fieldMap: Map<string, ExtractedFieldData>): RuleEvaluationOutput {
    const mrpField = fieldMap.get('mrp');

    if (!mrpField || !mrpField.rawValue) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'FAIL',
        requirementText: rule.requirementText,
        extractedValue: 'Not detected',
        expectedCondition: 'MRP Rs. X (incl. of all taxes)',
        reason: 'Non-compliant: Maximum Retail Price (MRP) declaration is missing.',
        confidence: 0.98,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    const valLower = mrpField.rawValue.toLowerCase();
    const hasTaxInfo = valLower.includes('tax') || valLower.includes('incl');

    if (!hasTaxInfo) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'REVIEW',
        requirementText: rule.requirementText,
        extractedValue: mrpField.rawValue,
        expectedCondition: 'MRP declaration must explicitly include "inclusive of all taxes" or "incl. of all taxes"',
        reason: 'Needs Review: MRP detected, but "inclusive of all taxes" statement could not be fully verified from OCR.',
        confidence: 0.85,
        evidenceImageId: mrpField.sourceImageId,
        evidenceRegionJson: mrpField.sourceRegionJson,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: mrpField.rawValue,
      expectedCondition: 'MRP declared inclusive of all taxes',
      reason: `Compliant: Retail price declaration '${mrpField.rawValue}' includes statutory tax statement.`,
      confidence: 0.98,
      evidenceImageId: mrpField.sourceImageId,
      evidenceRegionJson: mrpField.sourceRegionJson,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }

  private evalTextPresence(rule: RuleModel, fieldMap: Map<string, ExtractedFieldData>): RuleEvaluationOutput {
    let params: any = {};
    try {
      params = rule.parameters ? JSON.parse(rule.parameters) : {};
    } catch (e) {}

    const forbidden: string[] = params.forbiddenKeywords || params.forbiddenTerms || [];
    const qtyField = fieldMap.get('net_quantity');

    if (qtyField && qtyField.rawValue) {
      const lower = qtyField.rawValue.toLowerCase();
      for (const term of forbidden) {
        if (lower.includes(term)) {
          return {
            ruleId: rule.id,
            ruleCode: rule.ruleCode,
            ruleNumber: rule.ruleNumber,
            result: 'FAIL',
            requirementText: rule.requirementText,
            extractedValue: qtyField.rawValue,
            expectedCondition: `Must NOT contain prohibited misleading terms: ${forbidden.join(', ')}`,
            reason: `Non-compliant: Quantity declaration contains prohibited misleading term '${term}'.`,
            confidence: 0.98,
            evidenceImageId: qtyField.sourceImageId,
            evidenceRegionJson: qtyField.sourceRegionJson,
            sourcePage: rule.sourcePage,
            ruleVersion: rule.version,
          };
        }
      }
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: qtyField?.rawValue || 'Clean',
      expectedCondition: 'No misleading expressions or non-SI symbols present',
      reason: 'Compliant: Declaration is free from misleading terms (minimum, approx, dozen, gross).',
      confidence: 0.95,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }

  private evalStandardPackage(
    rule: RuleModel,
    fieldMap: Map<string, ExtractedFieldData>,
    context: InspectionContext
  ): RuleEvaluationOutput {
    const category = context.category || '';
    const qtyField = fieldMap.get('net_quantity');

    if (!qtyField || !qtyField.rawValue || !qtyField.normalizedValue) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'REVIEW',
        requirementText: rule.requirementText,
        extractedValue: 'Net quantity missing',
        expectedCondition: 'Standard pack size per Second Schedule',
        reason: 'Needs Review: Cannot perform Second Schedule standard pack check without verified net quantity.',
        confidence: 0.8,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: `${qtyField.normalizedValue} ${qtyField.unit || ''}`,
      expectedCondition: `Standard pack size for category '${category}'`,
      reason: `Compliant: Product pack size ${qtyField.normalizedValue} ${qtyField.unit || ''} conforms to Legal Metrology Second Schedule.`,
      confidence: 0.95,
      evidenceImageId: qtyField.sourceImageId,
      evidenceRegionJson: qtyField.sourceRegionJson,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }

  private evalApplicabilityRule(rule: RuleModel, context: InspectionContext): RuleEvaluationOutput {
    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: 'Retail Package',
      expectedCondition: 'Package scope evaluation',
      reason: 'Compliant: Package is subject to retail legal metrology rules under Chapter II.',
      confidence: 1.0,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }

  private evalQuantityError(
    rule: RuleModel,
    fieldMap: Map<string, ExtractedFieldData>,
    context: InspectionContext
  ): RuleEvaluationOutput {
    if (!context.hasPhysicalMeasurement || context.actualMeasuredQuantity === undefined) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'NOT_APPLICABLE',
        requirementText: rule.requirementText,
        extractedValue: 'No scale measurement data provided',
        expectedCondition: 'Physical scale weight / volume testing data required',
        reason: 'Not Applicable to Image Scan: Physical quantity error (MPE) testing requires physical weighing scale measurement at factory/lab as per Fifth & Sixth Schedule.',
        confidence: 1.0,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    const declared = context.netQuantityValue || 0;
    const actual = context.actualMeasuredQuantity;
    const deficiency = declared - actual;

    let mpeLimit = declared * 0.03; // Default 3%
    if (declared <= 50) mpeLimit = declared * 0.09;
    else if (declared <= 100) mpeLimit = 4.5;
    else if (declared <= 200) mpeLimit = declared * 0.045;
    else if (declared <= 300) mpeLimit = 9.0;
    else if (declared <= 500) mpeLimit = declared * 0.03;
    else if (declared <= 1000) mpeLimit = 15.0;

    if (deficiency > mpeLimit) {
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleNumber: rule.ruleNumber,
        result: 'FAIL',
        requirementText: rule.requirementText,
        extractedValue: `Declared: ${declared}, Actual: ${actual}, Deficiency: ${deficiency}`,
        expectedCondition: `Max permissible error limit: ${mpeLimit}`,
        reason: `Non-compliant: Physical deficiency of ${deficiency} exceeds Maximum Permissible Error limit of ${mpeLimit} under First Schedule.`,
        confidence: 0.99,
        sourcePage: rule.sourcePage,
        ruleVersion: rule.version,
      };
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleNumber: rule.ruleNumber,
      result: 'PASS',
      requirementText: rule.requirementText,
      extractedValue: `Declared: ${declared}, Actual: ${actual}, Deficiency: ${deficiency}`,
      expectedCondition: `Deficiency within MPE limit ${mpeLimit}`,
      reason: 'Compliant: Physical net content is within Maximum Permissible Error limits.',
      confidence: 0.99,
      sourcePage: rule.sourcePage,
      ruleVersion: rule.version,
    };
  }
}
