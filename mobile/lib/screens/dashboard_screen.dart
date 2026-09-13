import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _stats;
  List<dynamic> _users = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    final user = context.read<AuthProvider>().user;
    try {
      final res = await ApiService.get('/dashboard');
      setState(() {
        _stats = res;
      });

      if (user != null && user.isSystemAdmin) {
        final usersRes = await ApiService.get('/admin/users');
        setState(() {
          _users = usersRes['users'] ?? [];
        });
      }

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleUserStatus(String userId, String currentStatus) async {
    final newStatus = currentStatus == 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await ApiService.post('/admin/users/$userId/status', {'status': newStatus});
      _loadDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update status: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final statsData = _stats?['stats'] ?? {};

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF061727),
        elevation: 4,
        title: Row(
          children: [
            const Icon(Icons.shield, color: Color(0xFF627D98)),
            const SizedBox(width: 8),
            const Text(
              'LEGAL LENS CONSOLE',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Logout',
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (mounted) {
                Navigator.pushReplacementNamed(context, '/login');
              }
            },
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Inspector/User Banner
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF102A43), Color(0xFF243B53)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  user?.name ?? 'Authenticated Officer',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF334E68),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  user?.roleDisplayName ?? 'Officer',
                                  style: const TextStyle(color: Colors.lightBlueAccent, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Email: ${user?.email ?? ""} | Employee #: ${user?.employeeNumber ?? "N/A"}',
                            style: const TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Primary CTA for Inspectors
                    if (user == null || user.isComplianceOfficer) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF276749), // High contrast green
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 6,
                          ),
                          onPressed: () {
                            Navigator.pushNamed(context, '/start-inspection');
                          },
                          icon: const Icon(Icons.camera_alt, color: Colors.white, size: 28),
                          label: const Text(
                            '+ START NEW INSPECTION',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.black,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // System Administrator User Management Panel
                    if (user != null && user.isSystemAdmin) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'SYSTEM USER MANAGEMENT',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF102A43)),
                          ),
                          Chip(
                            label: Text('${_users.length} Users', style: const TextStyle(fontSize: 10, color: Colors.white)),
                            backgroundColor: const Color(0xFF102A43),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _users.length,
                        itemBuilder: (context, index) {
                          final u = _users[index];
                          final isSuspended = u['status'] == 'SUSPENDED';
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isSuspended ? Colors.red.shade100 : Colors.blue.shade100,
                                child: Icon(
                                  isSuspended ? Icons.block : Icons.person,
                                  color: isSuspended ? Colors.red : Colors.blue.shade800,
                                ),
                              ),
                              title: Text(u['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              subtitle: Text('${u['email']} • ${u['role']}', style: const TextStyle(fontSize: 11)),
                              trailing: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isSuspended ? Colors.green : Colors.red,
                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                ),
                                onPressed: () => _toggleUserStatus(u['id'], u['status']),
                                child: Text(
                                  isSuspended ? 'ACTIVATE' : 'SUSPEND',
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Mobile Metrics KPI Cards Grid
                    const Text(
                      'INSPECTION METRICS',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF486581)),
                    ),
                    const SizedBox(height: 8),
                    GridView.count(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      childAspectRatio: 1.5,
                      children: [
                        _buildMetricCard('Total Audits', '${statsData['totalInspections'] ?? 0}', Icons.assignment, Colors.blue),
                        _buildMetricCard('Compliant (PASS)', '${statsData['compliantCount'] ?? 0}', Icons.check_circle, Colors.green),
                        _buildMetricCard('Violations (FAIL)', '${statsData['nonCompliantCount'] ?? 0}', Icons.cancel, Colors.red),
                        _buildMetricCard('Needs Review', '${statsData['reviewCount'] ?? 0}', Icons.warning, Colors.orange),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Quick Navigation Links
                    const Text(
                      'FIELD OPERATIONS',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF486581)),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _buildActionTile(
                            context,
                            'Inspection History',
                            Icons.history,
                            () => Navigator.pushNamed(context, '/history'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildActionTile(
                            context,
                            'Legal Rules',
                            Icons.gavel,
                            () => Navigator.pushNamed(context, '/rules'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
              Icon(icon, size: 20, color: color),
            ],
          ),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.black, color: Color(0xFF102A43))),
        ],
      ),
    );
  }

  Widget _buildActionTile(BuildContext context, String title, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF102A43), size: 20),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
