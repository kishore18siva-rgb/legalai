import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineSyncItem {
  final String id;
  final String date;
  final Map<String, dynamic> inspectionData;
  final List<String> imagePaths;

  OfflineSyncItem({
    required this.id,
    required this.date,
    required this.inspectionData,
    required this.imagePaths,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date,
        'inspectionData': inspectionData,
        'imagePaths': imagePaths,
      };

  factory OfflineSyncItem.fromJson(Map<String, dynamic> json) => OfflineSyncItem(
        id: json['id'],
        date: json['date'],
        inspectionData: json['inspectionData'],
        imagePaths: List<String>.from(json['imagePaths'] ?? []),
      );
}

class OfflineSyncService {
  static const String _storageKey = 'offline_inspection_queue';

  static Future<void> saveOfflineInspection(OfflineSyncItem item) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getOfflineQueue();
    queue.add(item);
    final jsonList = queue.map((i) => i.toJson()).toList();
    await prefs.setString(_storageKey, jsonEncode(jsonList));
  }

  static Future<List<OfflineSyncItem>> getOfflineQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final str = prefs.getString(_storageKey);
    if (str == null) return [];
    final List<dynamic> jsonList = jsonDecode(str);
    return jsonList.map((i) => OfflineSyncItem.fromJson(i)).toList();
  }

  static Future<void> clearOfflineQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
