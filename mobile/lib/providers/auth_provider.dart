import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = true;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    checkCurrentUser();
  }

  Future<void> checkCurrentUser() async {
    _isLoading = true;
    notifyListeners();
    _user = await AuthService.getCurrentUser();
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      _user = await AuthService.login(email, password);
      _isLoading = false;
      notifyListeners();
      return _user != null;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> registerInspector({
    required String name,
    required String email,
    required String phoneNumber,
    required String employeeNumber,
    required String password,
    required String confirmPassword,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      await AuthService.registerInspector(
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        employeeNumber: employeeNumber,
        password: password,
        confirmPassword: confirmPassword,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    _user = null;
    notifyListeners();
  }
}
