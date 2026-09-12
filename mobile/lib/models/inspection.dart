import 'product.dart';
import 'extracted_field.dart';
import 'rule_result.dart';
import 'user.dart';

class Inspection {
  final String id;
  final String inspectionNumber;
  final String? productId;
  final Product? product;
  final String inspectorId;
  final User? inspector;
  final String status;
  final String overallResult; // PASS, FAIL, REVIEW, NOT_APPLICABLE
  final double complianceScore;
  final double scoreConfidence;
  final int passedCount;
  final int failedCount;
  final int reviewCount;
  final int naCount;
  final String ruleVersionUsed;
  final String? notes;
  final DateTime createdAt;
  final List<ExtractedField> extractedFields;
  final List<RuleResult> ruleResults;

  Inspection({
    required this.id,
    required this.inspectionNumber,
    this.productId,
    this.product,
    required this.inspectorId,
    this.inspector,
    required this.status,
    required this.overallResult,
    required this.complianceScore,
    required this.scoreConfidence,
    required this.passedCount,
    required this.failedCount,
    required this.reviewCount,
    required this.naCount,
    required this.ruleVersionUsed,
    this.notes,
    required this.createdAt,
    this.extractedFields = const [],
    this.ruleResults = const [],
  });

  factory Inspection.fromJson(Map<String, dynamic> json) {
    return Inspection(
      id: json['id'] ?? '',
      inspectionNumber: json['inspectionNumber'] ?? '',
      productId: json['productId'],
      product: json['product'] != null ? Product.fromJson(json['product']) : null,
      inspectorId: json['inspectorId'] ?? '',
      inspector: json['inspector'] != null ? User.fromJson(json['inspector']) : null,
      status: json['status'] ?? 'DRAFT',
      overallResult: json['overallResult'] ?? 'REVIEW',
      complianceScore: (json['complianceScore'] as num?)?.toDouble() ?? 0.0,
      scoreConfidence: (json['scoreConfidence'] as num?)?.toDouble() ?? 0.0,
      passedCount: json['passedCount'] ?? 0,
      failedCount: json['failedCount'] ?? 0,
      reviewCount: json['reviewCount'] ?? 0,
      naCount: json['naCount'] ?? 0,
      ruleVersionUsed: json['ruleVersionUsed'] ?? '2011-V1',
      notes: json['notes'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      extractedFields: (json['extractedFields'] as List<dynamic>?)
              ?.map((e) => ExtractedField.fromJson(e))
              .toList() ??
          [],
      ruleResults: (json['ruleResults'] as List<dynamic>?)
              ?.map((e) => RuleResult.fromJson(e))
              .toList() ??
          [],
    );
  }
}
