class ExtractedField {
  final String? id;
  final String fieldKey;
  final String fieldLabel;
  String? rawValue;
  String? normalizedValue;
  String? unit;
  final double confidence;
  final String? sourceImageId;
  final String? sourceRegionJson;
  final String? sourceText;
  bool reviewRequired;
  bool isCorrected;
  String? correctedValue;

  ExtractedField({
    this.id,
    required this.fieldKey,
    required this.fieldLabel,
    this.rawValue,
    this.normalizedValue,
    this.unit,
    required this.confidence,
    this.sourceImageId,
    this.sourceRegionJson,
    this.sourceText,
    this.reviewRequired = false,
    this.isCorrected = false,
    this.correctedValue,
  });

  factory ExtractedField.fromJson(Map<String, dynamic> json) {
    return ExtractedField(
      id: json['id'],
      fieldKey: json['fieldKey'] ?? '',
      fieldLabel: json['fieldLabel'] ?? '',
      rawValue: json['rawValue'],
      normalizedValue: json['normalizedValue']?.toString(),
      unit: json['unit'],
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      sourceImageId: json['sourceImageId'],
      sourceRegionJson: json['sourceRegionJson'],
      sourceText: json['sourceText'],
      reviewRequired: json['reviewRequired'] ?? false,
      isCorrected: json['isCorrected'] ?? false,
      correctedValue: json['correctedValue'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'fieldKey': fieldKey,
        'fieldLabel': fieldLabel,
        'rawValue': rawValue,
        'normalizedValue': normalizedValue,
        'unit': unit,
        'confidence': confidence,
        'sourceImageId': sourceImageId,
        'sourceRegionJson': sourceRegionJson,
        'sourceText': sourceText,
        'reviewRequired': reviewRequired,
        'isCorrected': isCorrected,
        'correctedValue': correctedValue,
      };
}
