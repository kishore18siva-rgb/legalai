export type UserRole = 'ADMIN' | 'LEGAL_REVIEWER' | 'INSPECTOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export type ComplianceStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE';
export type InspectionState = 'DRAFT' | 'PROCESSING' | 'READY_FOR_REVIEW' | 'COMPLETED' | 'ARCHIVED';

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: string;
  packageType?: string;
  manufacturer?: string;
  packer?: string;
  importer?: string;
  countryOfOrigin?: string;
}

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

export type PlacementStatus = 'DETECTED_CORRECT_PDP' | 'DETECTED_WRONG_PDP' | 'NOT_DETECTED';

export interface InspectionImage {
  id: string;
  inspectionId: string;
  imageType: 'FRONT' | 'BACK' | 'LEFT_SIDE' | 'RIGHT_SIDE' | 'TOP' | 'BOTTOM' | string;
  originalPath: string;
  processedPath?: string;
  qualityStatus: 'GOOD' | 'BLURRY' | 'INSUFFICIENT_QUALITY';
  fileSize?: number;
  uploadedAt: string;
}

export interface ExtractedField {
  id?: string;
  inspectionId?: string;
  fieldKey: string;
  fieldLabel: string;
  rawValue?: string | null;
  normalizedValue?: string | null;
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
  measurementsJson?: string | null;
  measurements?: VisualMeasurement[];
  reviewRequired: boolean;
  isCorrected?: boolean;
  correctedValue?: string | null;
  correctionReason?: string | null;
}

export interface ImageCoverageInfo {
  coverageStatus: 'FULL' | 'PARTIAL';
  facesAccountedFor?: number;
  totalRequiredFaces?: number;
  detectedPanels: string[];
  missingPanels: string[];
  warningMessage?: string;
}

export interface AutoScanResponse {
  inspectionId: string;
  inspectionNumber: string;
  detectedProduct: {
    name: string;
    brand: string;
    category: string;
    categoryConfidence: number;
    categoryReason: string;
  };
  pdpInfo?: {
    pdpFace: string;
    confidence: number;
    determinationMethod: 'AI' | 'MANUAL';
    reason?: string;
  };
  imageCoverage: ImageCoverageInfo;
  extractedFields: ExtractedField[];
  images: InspectionImage[];
}

export interface RuleResult {
  id: string;
  inspectionId: string;
  ruleId: string;
  ruleCode: string;
  ruleNumber: string;
  result: ComplianceStatus;
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
  measurementsJson?: string | null;
  measurements?: VisualMeasurement[];
  sourcePage?: number | null;
  ruleVersion: number;
  rule?: LegalRule;
}

export interface Inspection {
  id: string;
  inspectionNumber: string;
  productId?: string;
  product?: Product;
  inspectorId: string;
  inspector?: User;
  status: InspectionState;
  overallResult: ComplianceStatus;
  complianceScore: number;
  scoreConfidence: number;
  passedCount: number;
  failedCount: number;
  reviewCount: number;
  naCount: number;
  pdpFace?: string;
  pdpDeterminationMethod?: 'AI' | 'MANUAL' | string;
  ruleVersionUsed: string;
  notes?: string;
  createdAt: string;
  images?: InspectionImage[];
  extractedFields?: ExtractedField[];
  ruleResults?: RuleResult[];
}

export interface LegalRule {
  id: string;
  ruleCode: string;
  ruleNumber: string;
  subRule?: string;
  clause?: string;
  schedule?: string;
  title: string;
  requirementText: string;
  applicabilityCondition: string;
  validationType: string;
  capabilityClass: string;
  sourcePage: number;
  sourceText: string;
  effectiveFrom: string;
  version: number;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'SUPERSEDED' | 'REJECTED';
}

export interface LegalSource {
  id: string;
  name: string;
  version: string;
  effectiveDate?: string;
  filePath: string;
  fileHash: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'DRAFT';
  ruleCount: number;
  uploadedAt: string;
}

export interface RuleUpdate {
  id: string;
  sourceUrl?: string;
  documentHash: string;
  documentVersion: string;
  effectiveDate?: string;
  previousVersion?: string;
  newVersion: string;
  changeSummary: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedByUser?: User;
  detectedAt: string;
  diffs?: RuleChangeDiff[];
}

export interface RuleChangeDiff {
  id: string;
  ruleCode: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'APPLICABILITY_CHANGED' | 'EFFECTIVE_DATE_CHANGED';
  oldRuleText?: string;
  newRuleText?: string;
  aiSummary?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValueJson?: string;
  newValueJson?: string;
  timestamp: string;
}
