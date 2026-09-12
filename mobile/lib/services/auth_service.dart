import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user.dart';

class AuthService {
  static Future<User?> login(String email, String password) async {
    final res = await ApiService.post('/auth/login', {
      'email': email,
      'password': password,
    });

    final token = res['token'];
    final userData = res['user'];

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('legallens_token', token);

    return User.fromJson(userData);
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('legallens_token');
  }

  static Future<User?> getCurrentUser() async {
    try {
      final token = await ApiService.getToken();
      if (token == null) return null;
      final res = await ApiService.get('/auth/me');
      return User.fromJson(res['user']);
    } catch (e) {
      return null;
    }
  }
}
