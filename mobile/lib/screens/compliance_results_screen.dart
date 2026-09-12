import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inspection_provider.dart';
import '../models/rule_result.dart';
import '../services/api_service.dart';

class ComplianceResultsScreen extends StatefulWidget {
  const ComplianceResultsScreen({super.key});

  @override
  State<ComplianceResultsScreen> createState() => _ComplianceResultsScreenState();
}

class _ComplianceResultsScreenState extends State<ComplianceResultsScreen> {
  bool _isGeneratingPdf = false;

  void _showEvidenceModal(RuleResult result) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${result.ruleNumber} Statutory Trace', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Requirement:', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            Text(result.requirementText, style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 8),
            Text('Extracted Evidence:', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            Text(result.extractedValue ?? 'None', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.blueAccent)),
            const SizedBox(height: 8),
            Text('Legal Reason:', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            Text(result.reason, style: const TextStyle(fontSize: 11)),
            if (result.sourcePage != null) ...[
              const SizedBox(height: 8),
              Text('Legal Source Citation: Page ${result.sourcePage} of 2011 Rules', style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
            ],
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
        ],
      ),
    );
  }

  Future<void> _handleDownloadPdf() async {
    final inspection = context.read<InspectionProvider>().currentInspection;
    if (inspection == null) return;

    setState(() => _isGeneratingPdf = true);
    try {
      final res = await ApiService.get('/inspections/${inspection.id}/report');
      setState(() => _isGeneratingPdf = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Report Generated: ${res['reportUrl']}')),
        );
      }
    } catch (e) {
      setState(() => _isGeneratingPdf = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error generating report: $e')),
      );
    }
  }

  Color _getStatusColor(String result) {
    switch (result) {
      case 'PASS':
        return Colors.green;
      case 'FAIL':
        return Colors.red;
      case 'REVIEW':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final inspection = context.watch<InspectionProvider>().currentInspection;

    if (inspection == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Results')),
        body: const Center(child: Text('No inspection data loaded.')),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF061727),
        title: Text(inspection.inspectionNumber, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf, color: Colors.white),
            onPressed: _isGeneratingPdf ? null : _handleDownloadPdf,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall Status Banner Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade300),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: _getStatusColor(inspection.overallResult),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          inspection.overallResult,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.black, fontSize: 13),
                        ),
                      ),
                      Text(
                        '${inspection.complianceScore.toStringAsFixed(1)}%',
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.black, color: Color(0xFF102A43)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildCountBadge('PASSED', inspection.passedCount, Colors.green),
                      _buildCountBadge('FAILED', inspection.failedCount, Colors.red),
                      _buildCountBadge('REVIEW', inspection.reviewCount, Colors.orange),
                      _buildCountBadge('N/A', inspection.naCount, Colors.grey),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'DETERMINISTIC RULE-BY-RULE VALIDATION',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF486581)),
            ),
            const SizedBox(height: 8),

            // Rule Results List
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: inspection.ruleResults.length,
              itemBuilder: (context, idx) {
                final r = inspection.ruleResults[idx];
                final statusColor = _getStatusColor(r.result);

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(r.ruleNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF102A43))),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                r.result,
                                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(r.requirementText, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 6),
                        Text(r.reason, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 6),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton.icon(
                            onPressed: () => _showEvidenceModal(r),
                            icon: const Icon(Icons.visibility, size: 14),
                            label: const Text('View Evidence', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountBadge(String label, int count, Color color) {
    return Column(
      children: [
        Text(count.toString(), style: TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: color)),
        Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey)),
      ],
    );
  }
}
