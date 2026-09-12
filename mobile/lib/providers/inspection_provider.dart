import 'package:flutter/material.dart';
import '../models/inspection.dart';
import '../models/extracted_field.dart';
import '../services/api_service.dart';

class InspectionProvider extends ChangeNotifier {
  Inspection? _currentInspection;
  List<ExtractedField> _reviewFields = [];
  Map<String, dynamic>? _autoScanData;
  bool _isLoading = false;
  String? _error;

  Inspection? get currentInspection => _currentInspection;
  List<ExtractedField> get reviewFields => _reviewFields;
  Map<String, dynamic>? get autoScanData => _autoScanData;
  bool get isLoading => _isLoading;
  String? get error => _error;

  void setAutoScanResult(Map<String, dynamic> data) {
    _autoScanData = data;
    if (data['extractedFields'] != null) {
      _reviewFields = (data['extractedFields'] as List)
          .map((e) => ExtractedField.fromJson(e))
          .toList();
    }
    notifyListeners();
  }

  void updateReviewField(String fieldKey, String newValue) {
    final idx = _reviewFields.indexWhere((f) => f.fieldKey == fieldKey);
    if (idx != -1) {
      _reviewFields[idx].rawValue = newValue;
      _reviewFields[idx].normalizedValue = newValue;
      _reviewFields[idx].isCorrected = true;
      _reviewFields[idx].reviewRequired = false;
      notifyListeners();
    }
  }

  Future<void> fetchInspectionById(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.get('/inspections/$id');
      _currentInspection = Inspection.fromJson(res);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }
}
