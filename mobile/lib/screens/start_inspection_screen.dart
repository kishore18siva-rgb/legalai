import 'package:flutter/material.dart';

class StartInspectionScreen extends StatelessWidget {
  const StartInspectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF061727),
      appBar: AppBar(
        backgroundColor: const Color(0xFF102A43),
        elevation: 0,
        title: const Text('START PACKAGED COMMODITY INSPECTION', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: SafeArea(
        child: Padding(
          const EdgeInsets.all(20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF102A43),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF243B53)),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.camera_alt_outlined,
                        size: 56,
                        color: Colors.blueAccent,
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'START FIELD SCAN',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.black,
                        color: Colors.white,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Capture clear images of the package directly using the device camera. LegalLens will automatically identify product information and mandatory declarations.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF9FB3C8),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // PRIMARY CTA: OPEN CAMERA
              SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2B6CB0),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 6,
                  ),
                  onPressed: () {
                    Navigator.pushNamed(context, '/camera-capture');
                  },
                  icon: const Icon(Icons.photo_camera, color: Colors.white, size: 24),
                  label: const Text(
                    'OPEN CAMERA',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // SECONDARY RECOVERY CTA
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF334E68)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  Navigator.pushNamed(context, '/camera-capture');
                },
                icon: const Icon(Icons.photo_library, color: Colors.white70, size: 20),
                label: const Text(
                  'Use Existing Photo from Gallery',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
