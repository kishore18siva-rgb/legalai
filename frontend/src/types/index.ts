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

export interface InspectionImage {
  id: string;
  inspectionId: string;
  imageType: 'FRONT' | 'BACK' | 'SIDE' | 'TOP_BOTTOM' | 'CLOSEUP';
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
  unit?: string | null;
  confidence: number;
  sourceImageId?: string | null;
  sourceRegionJson?: string | null;
  sourceText?: string | null;
  reviewRequired: boolean;
  isCorrected?: boolean;
  correctedValue?: string | null;
  correctionReason?: string | null;
}

export interface ImageCoverageInfo {
  coverageStatus: 'FULL' | 'PARTIAL';
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
  expectedCondition?: string | null;
  reason: string;
  confidence: number;
  evidenceImageId?: string | null;
  evidenceRegionJson?: string | null;
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
