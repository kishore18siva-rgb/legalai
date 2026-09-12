import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LegalRule } from '../types';
import { useAuth } from '../context/AuthContext';
import { Scale, Search, CheckCircle, XCircle, FileText, Bookmark, Info } from 'lucide-react';

export const RulesPage: React.FC = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<LegalRule[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<LegalRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, [search]);

  const fetchRules = async () => {
    try {
      const res = await api.get('/rules', { params: { search } });
      setRules(res.data);
    } catch (err) {
      console.error('Error fetching legal rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ruleId: string) => {
    try {
      await api.post(`/rules/${ruleId}/approve`);
      fetchRules();
    } catch (err) {
      alert('Error approving rule.');
    }
  };

  const handleReject = async (ruleId: string) => {
    try {
      await api.post(`/rules/${ruleId}/reject`);
      fetchRules();
    } catch (err) {
      alert('Error rejecting rule.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
            <Scale className="w-7 h-7 text-blue-600" />
            <span>Statutory Legal Rule Database</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Versioned, 100% traceable rules extracted from The Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules by rule number, code, or requirement..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 hover:border-blue-300 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {rule.ruleNumber}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-2">{rule.title}</h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  rule.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : rule.status === 'SUPERSEDED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                v{rule.version} ({rule.status})
              </span>
            </div>

            <p className="text-xs text-gray-700 font-medium bg-gray-50 p-3 rounded-lg border border-gray-200">
              {rule.requirementText}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span className="flex items-center space-x-1 font-mono text-blue-600">
                <Bookmark className="w-3.5 h-3.5" />
                <span>Source PDF Page {rule.sourcePage}</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedRule(rule)}
                  className="text-blue-600 font-semibold hover:underline flex items-center space-x-1"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Inspect Source Text</span>
                </button>

                {user && ['ADMIN', 'LEGAL_REVIEWER'].includes(user.role) && rule.status === 'UNDER_REVIEW' && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleApprove(rule.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Approve Rule"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(rule.id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      title="Reject Rule"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Source Text Modal */}
      {selectedRule && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-gray-900">{selectedRule.ruleNumber} Official Gazette Wording</h3>
              <button onClick={() => setSelectedRule(null)} className="text-gray-400 hover:text-gray-900 font-bold">
                ✕
              </button>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-lg border border-amber-200 text-xs text-amber-900 font-mono space-y-2">
              <p className="font-bold uppercase text-[10px] text-amber-700">Exact Extracted Source Text (Page {selectedRule.sourcePage}):</p>
              <p className="leading-relaxed">"{selectedRule.sourceText}"</p>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <p>Validation Logic Type: <strong className="font-mono text-blue-700">{selectedRule.validationType}</strong></p>
              <p>Capability Classification: <strong className="font-mono text-purple-700">{selectedRule.capabilityClass}</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
