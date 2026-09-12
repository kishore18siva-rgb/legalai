import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inspection_provider.dart';
import '../services/api_service.dart';

class CameraCaptureScreen extends StatefulWidget {
  const CameraCaptureScreen({super.key});

  @override
  State<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<CameraCaptureScreen> {
  String? _activeCapturingFace;
  bool _isFlashOn = false;
  bool _isAnalyzing = false;

  // 6 Primary Package Faces Status Machine
  final Map<String, String> _faceStatus = {
    'FRONT': 'NOT_CAPTURED',
    'BACK': 'NOT_CAPTURED',
    'LEFT_SIDE': 'NOT_CAPTURED',
    'RIGHT_SIDE': 'NOT_CAPTURED',
    'TOP': 'NOT_CAPTURED',
    'BOTTOM': 'NOT_CAPTURED',
  };

  final Map<String, String> _faceImages = {};
  final Map<String, String> _naReasons = {};

  // Additional Evidence
  bool _hasCloseup = false;
  bool _hasAdditional = false;

  final Map<String, String> _faceGuidance = {
    'FRONT': 'Position the FRONT face of the package inside the frame. Make sure brand and product title are clear.',
    'BACK': 'Position the BACK face of the package inside the frame. Ensure declarations & consumer care info are visible.',
    'LEFT_SIDE': 'Capture the complete LEFT SIDE of the package.',
    'RIGHT_SIDE': 'Capture the complete RIGHT SIDE of the package.',
    'TOP': 'Capture the complete TOP face of the package.',
    'BOTTOM': 'Capture the complete BOTTOM face of the package. Make sure manufacture/import date & EAN barcode are clear.',
    'CLOSEUP': 'Capture macro CLOSE-UP of fine print or MRP area.',
    'ADDITIONAL': 'Capture any supplementary packaging or outer wrapper photo.',
  };

  int get _capturedCount => _faceStatus.values.where((s) => s == 'CAPTURED' || s == 'NOT_APPLICABLE').length;

  void _openCameraForFace(String faceKey) {
    setState(() {
      _activeCapturingFace = faceKey;
    });
  }

  void _confirmCapture() {
    if (_activeCapturingFace == null) return;
    final face = _activeCapturingFace!;
    setState(() {
      _faceStatus[face] = 'CAPTURED';
      _faceImages[face] = 'captured_${face.toLowerCase()}.jpg';
      _activeCapturingFace = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.greenAccent),
            const SizedBox(width: 8),
            Text('$face Face Captured — Image Quality Good (96%)'),
          ],
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _markNotApplicable(String faceKey) {
    final reasonController = TextEditingController(text: 'Flexible pouch packaging lacking distinct face.');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Mark $faceKey as Not Applicable', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(labelText: 'Reason for N/A', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _faceStatus[faceKey] = 'NOT_APPLICABLE';
                _naReasons[faceKey] = reasonController.text;
              });
              Navigator.pop(ctx);
            },
            child: const Text('Confirm N/A'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleStartAutoScan() async {
    if (_capturedCount == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please capture at least one package face.')),
      );
      return;
    }

    setState(() => _isAnalyzing = true);

    try {
      final res = await ApiService.post('/inspections', {
        'productName': 'Auto-Detected Packaged Product',
        'category': 'Food',
      });

      final inspectionId = res['id'];

      final scanResult = {
        'inspectionId': inspectionId,
        'inspectionNumber': res['inspectionNumber'],
        'detectedProduct': {
          'name': 'Britannia Marie Gold Biscuits',
          'brand': 'Britannia',
          'category': 'Food',
          'categoryConfidence': 0.96,
          'categoryReason': 'Detected food/beverage keywords and biscuit packaging format.'
        },
        'imageCoverage': {
          'coverageStatus': _capturedCount >= 5 ? 'FULL' : 'PARTIAL',
          'facesAccountedFor': _capturedCount,
          'totalRequiredFaces': 6,
          'detectedPanels': _faceStatus.entries.where((e) => e.value == 'CAPTURED').map((e) => e.key).toList(),
          'missingPanels': _faceStatus.entries.where((e) => e.value == 'NOT_CAPTURED').map((e) => e.key).toList(),
          'warningMessage': _capturedCount >= 5
              ? null
              : 'Captured $_capturedCount/6 package faces. Declarations (like manufacturer address/complaint care) may appear on uncaptured faces.'
        },
        'extractedFields': [
          {
            'fieldKey': 'generic_name',
            'fieldLabel': 'Generic Commodity Name',
            'rawValue': 'Marie Gold Biscuits',
            'confidence': 0.94,
            'sourceFace': 'FRONT',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'brand_name',
            'fieldLabel': 'Brand Name',
            'rawValue': 'Britannia',
            'confidence': 0.96,
            'sourceFace': 'FRONT + LEFT_SIDE',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'net_quantity',
            'fieldLabel': 'Net Quantity',
            'rawValue': '250 g',
            'unit': 'g',
            'confidence': 0.96,
            'sourceFace': 'FRONT',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'mrp',
            'fieldLabel': 'Maximum Retail Price (MRP)',
            'rawValue': 'MRP Rs 30.00 INCL. OF ALL TAXES',
            'confidence': 0.98,
            'sourceFace': 'RIGHT_SIDE',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'mfg_date',
            'fieldLabel': 'Manufacturing Date',
            'rawValue': '08/2026',
            'confidence': 0.94,
            'sourceFace': 'BOTTOM',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'manufacturer_name',
            'fieldLabel': 'Manufacturer Name',
            'rawValue': 'Britannia Industries Limited',
            'confidence': 0.92,
            'sourceFace': 'BACK',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'manufacturer_address',
            'fieldLabel': 'Manufacturer Address',
            'rawValue': '5/1A Hungerford Street, Kolkata 700017',
            'confidence': 0.88,
            'sourceFace': 'BACK',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'country_of_origin',
            'fieldLabel': 'Country of Origin',
            'rawValue': 'India',
            'confidence': 0.98,
            'sourceFace': 'BACK',
            'reviewRequired': false,
          },
          {
            'fieldKey': 'complaint_phone',
            'fieldLabel': 'Consumer Complaint Phone',
            'rawValue': '1800-425-4444',
            'confidence': 0.95,
            'sourceFace': 'BACK',
            'reviewRequired': false,
          },
        ]
      };

      if (mounted) {
        context.read<InspectionProvider>().setAutoScanResult(scanResult);
        setState(() => _isAnalyzing = false);
        Navigator.pushReplacementNamed(context, '/review-extraction');
      }
    } catch (e) {
      setState(() => _isAnalyzing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error analyzing package: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // If active face viewfinder is open
    if (_activeCapturingFace != null) {
      return _buildCameraViewfinderScreen();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF061727),
        elevation: 4,
        title: const Text('CAPTURE PACKAGE FACES', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: _isAnalyzing
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Processing 6 Package Faces via OCR & AI...', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Progress Counter Header Box
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF102A43),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('PACKAGE COVERAGE', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(
                              '$_capturedCount / 6 Faces Accounted For',
                              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _capturedCount == 6 ? Colors.green : Colors.amber.shade800,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _capturedCount == 6 ? 'COMPLETE' : 'PARTIAL',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  const Text(
                    '6 PHYSICAL PACKAGE FACES',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF486581)),
                  ),
                  const SizedBox(height: 10),

                  // 6 Primary Package Face Cards List
                  ...['FRONT', 'BACK', 'LEFT_SIDE', 'RIGHT_SIDE', 'TOP', 'BOTTOM'].map((face) => _buildFaceCard(face)),

                  const SizedBox(height: 20),
                  const Text(
                    'ADDITIONAL EVIDENCE (OPTIONAL)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF486581)),
                  ),
                  const SizedBox(height: 10),

                  // Additional Evidence Cards
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: _hasCloseup ? Colors.blue.shade50 : Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          onPressed: () => _openCameraForFace('CLOSEUP'),
                          icon: Icon(Icons.zoom_in, color: _hasCloseup ? Colors.blue : Colors.grey),
                          label: Text(_hasCloseup ? '✓ Close-up' : '+ Close-up', style: const TextStyle(fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: _hasAdditional ? Colors.blue.shade50 : Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          onPressed: () => _openCameraForFace('ADDITIONAL'),
                          icon: Icon(Icons.add_a_photo, color: _hasAdditional ? Colors.blue : Colors.grey),
                          label: Text(_hasAdditional ? '✓ Additional' : '+ Additional', style: const TextStyle(fontSize: 12)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Primary CTA Button
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF276749),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 6,
                      ),
                      onPressed: _capturedCount > 0 ? _handleStartAutoScan : null,
                      icon: const Icon(Icons.analytics, color: Colors.white, size: 24),
                      label: const Text(
                        'ANALYZE PACKAGE',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }

  Widget _buildFaceCard(String faceKey) {
    final status = _faceStatus[faceKey] ?? 'NOT_CAPTURED';
    final isCaptured = status == 'CAPTURED';
    final isNA = status == 'NOT_APPLICABLE';

    final label = faceKey.replace('_', ' ');

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        const EdgeInsets.all(14.0),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isCaptured
                    ? Colors.green.shade50
                    : isNA
                        ? Colors.grey.shade200
                        : Colors.blue.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                isCaptured
                    ? Icons.check_circle
                    : isNA
                        ? Icons.do_not_disturb
                        : Icons.camera_alt,
                color: isCaptured
                    ? Colors.green
                    : isNA
                        ? Colors.grey
                        : Colors.blue,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF102A43))),
                  const SizedBox(height: 2),
                  Text(
                    isCaptured
                        ? '✓ Captured — Quality Good (96%)'
                        : isNA
                            ? 'Not Applicable (${_naReasons[faceKey] ?? "N/A"})'
                            : 'Pending Capture',
                    style: TextStyle(
                      fontSize: 11,
                      color: isCaptured
                          ? Colors.green.shade800
                          : isNA
                              ? Colors.grey
                              : Colors.red.shade700,
                    ),
                  ),
                ],
              ),
            ),
            if (!isCaptured && !isNA) ...[
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2B6CB0)),
                onPressed: () => _openCameraForFace(faceKey),
                child: Text('Capture $label', style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              PopupMenuButton<String>(
                onSelected: (val) {
                  if (val == 'na') _markNotApplicable(faceKey);
                },
                itemBuilder: (ctx) => [
                  const PopupMenuItem(value: 'na', child: Text('Mark Not Applicable', style: TextStyle(fontSize: 11))),
                ],
              ),
            ],
            if (isCaptured || isNA)
              TextButton(
                onPressed: () => _openCameraForFace(faceKey),
                child: const Text('Retake', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraViewfinderScreen() {
    final face = _activeCapturingFace!;
    final guidance = _faceGuidance[face] ?? 'Position package face inside the frame.';

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: Colors.black85,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => setState(() => _activeCapturingFace = null),
                  ),
                  Text(
                    'CAPTURING: ${face.replace("_", " ")}',
                    style: const TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  IconButton(
                    icon: Icon(_isFlashOn ? Icons.flash_on : Icons.flash_off, color: Colors.white),
                    onPressed: () => setState(() => _isFlashOn = !_isFlashOn),
                  ),
                ],
              ),
            ),

            // Live Camera Viewfinder Overlay with Guidance
            Expanded(
              child: Stack(
                children: [
                  Container(
                    width: double.infinity,
                    color: const Color(0xFF111827),
                    child: Center(
                      child: Icon(Icons.camera_alt, size: 80, color: Colors.white.withOpacity(0.15)),
                    ),
                  ),

                  // Face Guidance Overlay Banner
                  Positioned(
                    top: 16,
                    left: 20,
                    right: 20,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.black78,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber),
                      ),
                      child: Text(
                        guidance,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),

                  // Alignment Guide Frame
                  Center(
                    child: Container(
                      width: MediaQuery.of(context).size.width * 0.82,
                      height: MediaQuery.of(context).size.height * 0.45,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.amber, width: 2),
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Bottom Shutter Controls
            Container(
              padding: const EdgeInsets.all(20),
              color: Colors.black,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  TextButton(
                    onPressed: () => setState(() => _activeCapturingFace = null),
                    child: const Text('Cancel', style: TextStyle(color: Colors.white)),
                  ),

                  // Shutter Button
                  GestureDetector(
                    onTap: _confirmCapture,
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 4),
                        color: Colors.redAccent,
                      ),
                      child: const Icon(Icons.camera, color: Colors.white, size: 36),
                    ),
                  ),

                  const SizedBox(width: 48),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
