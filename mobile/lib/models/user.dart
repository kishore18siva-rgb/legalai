class User {
  final String id;
  final String email;
  final String name;
  final String? phoneNumber;
  final String? employeeNumber;
  final String role;
  final String status;
  final String? lastLoginAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phoneNumber,
    this.employeeNumber,
    required this.role,
    this.status = 'ACTIVE',
    this.lastLoginAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? 'Officer',
      phoneNumber: json['phoneNumber'],
      employeeNumber: json['employeeNumber'],
      role: json['role'] ?? 'COMPLIANCE_OFFICER',
      status: json['status'] ?? 'ACTIVE',
      lastLoginAt: json['lastLoginAt'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'phoneNumber': phoneNumber,
        'employeeNumber': employeeNumber,
        'role': role,
        'status': status,
        'lastLoginAt': lastLoginAt,
      };

  String get roleDisplayName {
    switch (role) {
      case 'SYSTEM_ADMINISTRATOR':
      case 'ADMIN':
        return 'System Administrator';
      case 'SENIOR_LEGAL_OFFICER':
      case 'LEGAL_REVIEWER':
        return 'Senior Legal Officer / Reviewer';
      case 'COMPLIANCE_OFFICER':
      case 'INSPECTOR':
      default:
        return 'Compliance Officer / Inspector';
    }
  }

  bool get isSystemAdmin => role == 'SYSTEM_ADMINISTRATOR' || role == 'ADMIN';
  bool get isSeniorLegalOfficer => role == 'SENIOR_LEGAL_OFFICER' || role == 'LEGAL_REVIEWER';
  bool get isComplianceOfficer => role == 'COMPLIANCE_OFFICER' || role == 'INSPECTOR';
}
