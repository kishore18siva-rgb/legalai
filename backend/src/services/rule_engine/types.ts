export type ValidationType =
  | 'REQUIRED_FIELD'
  | 'OPTIONAL_FIELD'
  | 'TEXT_MATCH'
  | 'TEXT_PRESENCE'
  | 'NUMERIC_COMPARISON'
  | 'RANGE_CHECK'
  | 'DATE_FORMAT'
  | 'UNIT_VALIDATION'
  | 'CONDITIONAL_RULE'
  | 'EXCEPTION_RULE'
  | 'APPLICABILITY_RULE'
  | 'CONSISTENCY_CHECK'
  | 'CROSS_FIELD_CHECK'
  | 'IMAGE_POSITION_CHECK'
  | 'READABILITY_CHECK'
  | 'FONT_SIZE_CHECK'
  | 'QUANTITY_ERROR_CHECK'
  | 'STANDARD_PACKAGE_CHECK'
  | 'MANUAL_REVIEW_REQUIRED';

export type ComplianceResultStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE';

export type CapabilityClass =
  | 'IMAGE_CHECKABLE'
  | 'OCR_CHECKABLE'
  | 'STRUCTURED_DATA_CHECKABLE'
  | 'MANUAL_VISUAL_CHECK'
  | 'PHYSICAL_MEASUREMENT_REQUIRED'
  | 'EXTERNAL_DOCUMENT_REQUIRED'
  | 'LEGAL_REVIEW_REQUIRED';

export interface ExtractedFieldData {
  fieldKey: string;
  fieldLabel: string;
  rawValue?: string | null;
  normalizedValue?: any;
  unit?: string | null;
  confidence: number;
  sourceImageId?: string | null;
  sourceRegionJson?: string | null;
  sourceText?: string | null;
  reviewRequired?: boolean;
}

export interface InspectionContext {
  productName?: string | null;
  category?: string | null; // Food, Beverage, Cosmetics, etc.
  packageType?: string | null;
  isRetailPackage: boolean;
  netQuantityValue?: number;
  netQuantityUnit?: string;
  hasPhysicalMeasurement?: boolean;
  actualMeasuredQuantity?: number;
}

export interface RuleEvaluationOutput {
  ruleId: string;
  ruleCode: string;
  ruleNumber: string;
  result: ComplianceResultStatus;
  requirementText: string;
  extractedValue?: string | null;
  expectedCondition?: string | null;
  reason: string;
  confidence: number;
  evidenceImageId?: string | null;
  evidenceRegionJson?: string | null;
  sourcePage?: number | null;
  ruleVersion: number;
}
