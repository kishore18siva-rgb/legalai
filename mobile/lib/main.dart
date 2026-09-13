import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/inspection_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_inspector_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/start_inspection_screen.dart';
import 'screens/camera_capture_screen.dart';
import 'screens/review_extraction_screen.dart';
import 'screens/compliance_results_screen.dart';
import 'screens/inspection_history_screen.dart';
import 'screens/rules_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LegalLensApp());
}

class LegalLensApp extends StatelessWidget {
  const LegalLensApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => InspectionProvider()),
      ],
      child: MaterialApp(
        title: 'LegalLens Mobile',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF061727),
            primary: const Color(0xFF102A43),
            secondary: const Color(0xFF2B6CB0),
          ),
          fontFamily: 'Roboto',
        ),
        initialRoute: '/login',
        routes: {
          '/login': (context) => const LoginScreen(),
          '/register-inspector': (context) => const RegisterInspectorScreen(),
          '/dashboard': (context) => const DashboardScreen(),
          '/start-inspection': (context) => const StartInspectionScreen(),
          '/camera-capture': (context) => const CameraCaptureScreen(),
          '/review-extraction': (context) => const ReviewExtractionScreen(),
          '/compliance-results': (context) => const ComplianceResultsScreen(),
          '/history': (context) => const InspectionHistoryScreen(),
          '/rules': (context) => const RulesScreen(),
        },
      ),
    );
  }
}
