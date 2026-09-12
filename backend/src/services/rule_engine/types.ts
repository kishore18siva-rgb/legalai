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

export type PlacementStatus = 'DETECTED_CORRECT_PDP' | 'DETECTED_WRONG_PDP' | 'NOT_DETECTED';

export interface VisualMeasurement {
  measurementType: 'fontHeight' | 'edgeClearance' | 'textBlockDimensions' | 'placement';
  sourceFace: string;
  text?: string;
  pixelHeight?: number;
  estimatedPhysicalHeightMm?: number;
  requiredMinimumMm?: number;
  distancePixels?: number;
  distanceMm?: number;
  status: 'PASS' | 'FAIL' | 'REVIEW';
  isCalibrated: boolean;
  calibrationNote?: string;
  confidence: number;
}

export interface ExtractedFieldData {
  fieldKey: string;
  fieldLabel: string;
  rawValue?: string | null;
  normalizedValue?: any;
  originalText?: string | null;
  language?: string | null;
  script?: string | null;
  languageConfidence?: number | null;
  unit?: string | null;
  confidence: number;
  sourceFace?: string | null;
  detectedFace?: string | null;
  placementStatus?: PlacementStatus | null;
  sourceImageId?: string | null;
  sourceRegionJson?: string | null;
  sourceText?: string | null;
  measurements?: VisualMeasurement[];
  reviewRequired?: boolean;
}

export interface InspectionContext {
  productName?: string | null;
  category?: string | null; // Food, Beverage, Cosmetics, etc.
  packageType?: string | null;
  isRetailPackage: boolean;
  pdpFace: string; // FRONT, BACK, LEFT_SIDE, RIGHT_SIDE, TOP, BOTTOM
  pdpDeterminationMethod?: string;
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
  originalText?: string | null;
  language?: string | null;
  script?: string | null;
  languageConfidence?: number | null;
  expectedCondition?: string | null;
  reason: string;
  confidence: number;
  sourceFace?: string | null;
  detectedFace?: string | null;
  placementStatus?: PlacementStatus | null;
  evidenceImageId?: string | null;
  evidenceRegionJson?: string | null;
  measurements?: VisualMeasurement[];
  sourcePage?: number | null;
  ruleVersion: number;
}
