import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/inspection.dart';

class InspectionHistoryScreen extends StatefulWidget {
  const InspectionHistoryScreen({super.key});

  @override
  State<InspectionHistoryScreen> createState() => _InspectionHistoryScreenState();
}

class _InspectionHistoryScreenState extends State<InspectionHistoryScreen> {
  List<Inspection> _inspections = [];
  bool _isLoading = true;
  String _filter = '';

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    try {
      final res = await ApiService.get('/inspections?result=$_filter');
      final List list = res as List;
      setState(() {
        _inspections = list.map((i) => Inspection.fromJson(i)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF061727),
        title: const Text('INSPECTION HISTORY', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.filter_list, size: 18, color: Colors.grey),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButton<String>(
                    value: _filter,
                    isExpanded: true,
                    underline: const SizedBox(),
                    items: const [
                      DropdownMenuItem(value: '', child: Text('All Inspection Statuses')),
                      DropdownMenuItem(value: 'PASS', child: Text('PASS (Compliant)')),
                      DropdownMenuItem(value: 'FAIL', child: Text('FAIL (Violations)')),
                      DropdownMenuItem(value: 'REVIEW', child: Text('REVIEW (Needs Review)')),
                    ],
                    onChanged: (val) {
                      setState(() {
                        _filter = val ?? '';
                        _isLoading = true;
                      });
                      _fetchHistory();
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _inspections.length,
                    itemBuilder: (context, idx) {
                      final item = _inspections[idx];
                      return Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          title: Text(item.inspectionNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF102A43))),
                          subtitle: Text(
                            '${item.product?.name ?? "Packaged Item"} • ${item.createdAt.toString().split(" ")[0]}',
                            style: const TextStyle(fontSize: 11),
                          ),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: item.overallResult == 'PASS'
                                  ? Colors.green.shade100
                                  : item.overallResult === 'FAIL'
                                      ? Colors.red.shade100
                                      : Colors.amber.shade100,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item.overallResult,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: item.overallResult == 'PASS'
                                    ? Colors.green.shade900
                                    : item.overallResult === 'FAIL'
                                        ? Colors.red.shade900
                                        : Colors.amber.shade900,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
