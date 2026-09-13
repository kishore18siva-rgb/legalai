import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterInspectorScreen extends StatefulWidget {
  const RegisterInspectorScreen({super.key});

  @override
  State<RegisterInspectorScreen> createState() => _RegisterInspectorScreenState();
}

class _RegisterInspectorScreenState extends State<RegisterInspectorScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _empNumController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _errorMessage;
  bool _isSuccess = false;

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _errorMessage = null);

    try {
      await context.read<AuthProvider>().registerInspector(
            name: _nameController.text.trim(),
            email: _emailController.text.trim(),
            phoneNumber: _phoneController.text.trim(),
            employeeNumber: _empNumController.text.trim(),
            password: _passwordController.text,
            confirmPassword: _confirmPasswordController.text,
          );

      setState(() => _isSuccess = true);

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green),
                SizedBox(width: 8),
                Text('Registration Successful'),
              ],
            ),
            content: const Text(
              'Inspector account created successfully. You can now sign in to the LegalLens Inspection Console.',
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF102A43)),
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Back to Login
                },
                child: const Text('Back to Sign In', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF061727),
      appBar: AppBar(
        backgroundColor: const Color(0xFF102A43),
        title: const Text('CREATE INSPECTOR ACCOUNT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              elevation: 12,
              color: Colors.white,
              child: Padding(
                const EdgeInsets.all(24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.badge_outlined, size: 40, color: Color(0xFF102A43)),
                      const SizedBox(height: 8),
                      const Text(
                        'OFFICIAL REGISTRATION',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF102A43),
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Field Compliance Officer Account Provisioning',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      const SizedBox(height: 20),
                      if (_errorMessage != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFEEEE),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.redAccent),
                          ),
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: Colors.red, fontSize: 12),
                          ),
                        ),

                      // 1. Full Name *
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          labelText: 'Full Name *',
                          prefixIcon: const Icon(Icons.person),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Full Name is mandatory';
                          if (value.trim().length < 2) return 'Please enter a valid full name';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // 2. Official Email Address *
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          labelText: 'Official Email Address *',
                          prefixIcon: const Icon(Icons.email),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Official Email is mandatory';
                          if (!value.contains('@') || !value.contains('.')) return 'Invalid email format';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // 3. Phone Number *
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          labelText: 'Phone Number *',
                          prefixIcon: const Icon(Icons.phone),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Phone Number is mandatory';
                          final cleaned = value.replaceAll(RegExp(r'[\s\-\(\)]'), '');
                          if (!RegExp(r'^(?:\+91|0)?[6-9]\d{9}$').hasMatch(cleaned)) {
                            return 'Valid 10-digit phone number is mandatory';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // 4. Employee Number *
                      TextFormField(
                        controller: _empNumController,
                        decoration: InputDecoration(
                          labelText: 'Employee Number *',
                          prefixIcon: const Icon(Icons.confirmation_number),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Employee Number is mandatory';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // 5. Password *
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: 'Password *',
                          prefixIcon: const Icon(Icons.lock),
                          helperText: 'Min 8 chars, uppercase, lowercase, number & special char',
                          helperMaxLines: 2,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Password is mandatory';
                          if (value.length < 8) return 'Password must be at least 8 characters';
                          if (!RegExp(r'[A-Z]').hasMatch(value)) return 'Must contain an uppercase letter';
                          if (!RegExp(r'[a-z]').hasMatch(value)) return 'Must contain a lowercase letter';
                          if (!RegExp(r'[0-9]').hasMatch(value)) return 'Must contain a number';
                          if (!RegExp(r'[!@#$%^&*()_+\-=\[\]{};' + r"':" + r'\\|,.<>\/?]').hasMatch(value)) {
                            return 'Must contain a special character';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // 6. Confirm Password *
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: 'Confirm Password *',
                          prefixIcon: const Icon(Icons.lock_outline),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Confirm Password is mandatory';
                          if (value != _passwordController.text) return 'Passwords do not match';
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),

                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF102A43),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: authProvider.isLoading ? null : _handleRegister,
                          child: authProvider.isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text(
                                  'Create Inspector Account',
                                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Already have an account? Back to Sign In'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
