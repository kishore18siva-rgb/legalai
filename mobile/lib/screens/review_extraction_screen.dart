import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inspection_provider.dart';
import '../models/extracted_field.dart';
import '../services/api_service.dart';

class ReviewExtractionScreen extends StatefulWidget {
  const ReviewExtractionScreen({super.key});

  @override
  State<ReviewExtractionScreen> createState() => _ReviewExtractionScreenState();
}

class _ReviewExtractionScreenState extends State<ReviewExtractionScreen> {
  bool _isEvaluating = false;

  void _showEditDialog(ExtractedField field) {
    final controller = TextEditingController(text: field.rawValue ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Edit ${field.fieldLabel}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Corrected Value'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              context.read<InspectionProvider>().updateReviewField(field.fieldKey, controller.text);
              Navigator.pop(ctx);
            },
            child: const Text('Save & Confirm'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleConfirmAndRunEngine() async {
    final provider = context.read<InspectionProvider>();
    final autoData = provider.autoScanData;
    if (autoData == null) return;

    setState(() => _isEvaluating = true);

    try {
      final inspectionId = autoData['inspectionId'];
      final res = await ApiService.post('/inspections/$inspectionId/confirm-and-evaluate', {
        'confirmedProduct': autoData['detectedProduct'],
        'confirmedFields': provider.reviewFields.map((f) => f.toJson()).toList(),
      });

      if (mounted) {
        await provider.fetchInspectionById(inspectionId);
        setState(() => _isEvaluating = false);
        Navigator.pushReplacementNamed(context, '/compliance-results');
      }
    } catch (e) {
      setState(() => _isEvaluating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error running rule engine: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InspectionProvider>();
    final autoData = provider.autoScanData ?? {};
    final detectedProduct = autoData['detectedProduct'] ?? {};
    final imageCoverage = autoData['imageCoverage'] ?? {};
    final fields = provider.reviewFields;

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF061727),
        title: const Text('DETECTED PRODUCT DECLARATIONS', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: _isEvaluating
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Running Deterministic Legal Metrology Engine...', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image Coverage Warning Banner
                  if (imageCoverage['coverageStatus'] == 'PARTIAL')
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber, color: Colors.amber, size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              imageCoverage['warningMessage'] ?? 'Partial image panel coverage.',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF92400E), fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Auto-Detected Product Metadata Box
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('AUTO-DETECTED PRODUCT METADATA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 8),
                        Text(detectedProduct['name'] ?? 'Packaged Item', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text('Brand: ${detectedProduct['brand'] ?? 'Generic'}', style: const TextStyle(fontSize: 12, color: Colors.black87)),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: Colors.green.shade300),
                              ),
                              child: Text(
                                '${detectedProduct['category']} (${((detectedProduct['categoryConfidence'] ?? 0.95) * 100).toInt()}% Conf)',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  const Text(
                    'STATUTORY DECLARATIONS REVIEW',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF486581)),
                  ),
                  const SizedBox(height: 8),

                  // Extracted Declarations List
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: fields.length,
                    itemBuilder: (context, idx) {
                      final f = fields[idx];
                      final isLowConf = f.reviewRequired || f.confidence < 0.8;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        color: isLowConf ? const Color(0xFFFFFBEB) : Colors.white,
                        child: Padding(
                          const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(f.fieldLabel, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isLowConf ? Colors.amber.shade100 : Colors.green.shade100,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${(f.confidence * 100).toInt()}% ${isLowConf ? "⚠ Review" : "Conf"}',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: isLowConf ? Colors.amber.shade900 : Colors.green.shade900,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                f.rawValue ?? 'Not detected',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: f.rawValue == null ? Colors.red : Colors.black900,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton.icon(
                                    onPressed: () => _showEditDialog(f),
                                    icon: const Icon(Icons.edit, size: 14),
                                    label: const Text('Confirm / Edit', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              )
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Final Confirm CTA
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2B6CB0),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 6,
                      ),
                      onPressed: _handleConfirmAndRunEngine,
                      icon: const Icon(Icons.gavel, color: Colors.white),
                      label: const Text(
                        'CONFIRM & RUN RULE ENGINE',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }
}
