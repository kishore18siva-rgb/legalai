import 'package:flutter/material.dart';
import '../services/api_service.dart';

class RulesScreen extends StatefulWidget {
  const RulesScreen({super.key});

  @override
  State<RulesScreen> createState() => _RulesScreenState();
}

class _RulesScreenState extends State<RulesScreen> {
  List<dynamic> _rules = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchRules();
  }

  Future<void> _fetchRules() async {
    try {
      final res = await ApiService.get('/rules');
      setState(() {
        _rules = res as List;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF061727),
        title: const Text('STATUTORY LEGAL RULES 2011', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _rules.length,
              itemBuilder: (context, idx) {
                final r = _rules[idx];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ExpansionTile(
                    title: Text(r['ruleNumber'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF102A43))),
                    subtitle: Text(r['title'] ?? '', style: const TextStyle(fontSize: 11)),
                    children: [
                      Padding(
                        const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(r['requirementText'] ?? '', style: const TextStyle(fontSize: 11, color: Colors.black87)),
                            const SizedBox(height: 8),
                            Text('Source PDF Page: ${r['sourcePage']}', style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      )
                    ],
                  ),
                );
              },
            ),
    );
  }
}
