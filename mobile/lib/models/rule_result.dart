class RuleResult {
  final String id;
  final String inspectionId;
  final String ruleId;
  final String ruleCode;
  final String ruleNumber;
  final String result; // PASS, FAIL, REVIEW, NOT_APPLICABLE
  final String requirementText;
  final String? extractedValue;
  final String? expectedCondition;
  final String reason;
  final double confidence;
  final String? evidenceImageId;
  final String? evidenceRegionJson;
  final int? sourcePage;
  final int ruleVersion;

  RuleResult({
    required this.id,
    required this.inspectionId,
    required this.ruleId,
    required this.ruleCode,
    required this.ruleNumber,
    required this.result,
    required this.requirementText,
    this.extractedValue,
    this.expectedCondition,
    required this.reason,
    required this.confidence,
    this.evidenceImageId,
    this.evidenceRegionJson,
    this.sourcePage,
    required this.ruleVersion,
  });

  factory RuleResult.fromJson(Map<String, dynamic> json) {
    return RuleResult(
      id: json['id'] ?? '',
      inspectionId: json['inspectionId'] ?? '',
      ruleId: json['ruleId'] ?? '',
      ruleCode: json['ruleCode'] ?? '',
      ruleNumber: json['ruleNumber'] ?? '',
      result: json['result'] ?? 'REVIEW',
      requirementText: json['requirementText'] ?? '',
      extractedValue: json['extractedValue'],
      expectedCondition: json['expectedCondition'],
      reason: json['reason'] ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 1.0,
      evidenceImageId: json['evidenceImageId'],
      evidenceRegionJson: json['evidenceRegionJson'],
      sourcePage: json['sourcePage'],
      ruleVersion: json['ruleVersion'] ?? 1,
    );
  }
}
