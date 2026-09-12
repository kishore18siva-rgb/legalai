import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Inspection } from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ScanLine,
  TrendingUp,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex items-center justify-center space-x-2">
        <ShieldCheck className="w-6 h-6 text-blue-600 animate-spin" />
        <span>Loading LegalLens Analytics Console...</span>
      </div>
    );
  }

  const s = stats?.stats || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-legal-900 to-legal-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between border border-legal-700">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Legal Metrology Compliance Overview</h1>
          <p className="text-xs text-blue-300 mt-1">
            Real-time deterministic legal compliance metrics based on The Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>
        <Link
          to="/inspect/new"
          className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-2 shadow transition"
        >
          <ScanLine className="w-5 h-5" />
          <span>New Product Scan</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Inspections</span>
            <FileCheck2 className="w-5 h-5 text-legal-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{s.totalInspections || 0}</p>
          <span className="text-[11px] text-gray-500">Database records</span>
        </div>

        <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Compliant (PASS)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{s.compliantCount || 0}</p>
          <span className="text-[11px] text-emerald-600">Fully compliant</span>
        </div>

        <div className="bg-rose-50/60 p-5 rounded-xl border border-rose-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Violations (FAIL)</span>
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{s.nonCompliantCount || 0}</p>
          <span className="text-[11px] text-rose-600">Statutory failure</span>
        </div>

        <div className="bg-amber-50/60 p-5 rounded-xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Needs Review</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{s.reviewCount || 0}</p>
          <span className="text-[11px] text-amber-600">Visual / Ambiguity review</span>
        </div>

        <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Avg Score</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-800 mt-2">{s.avgComplianceScore || 0}%</p>
          <span className="text-[11px] text-blue-600">Compliance Index</span>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Failed Rules */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-rose-600" />
            <span>Most Frequently Failed Legal Requirements</span>
          </h2>

          <div className="space-y-3">
            {stats?.failedRuleGroups?.length > 0 ? (
              stats.failedRuleGroups.map((g: any, idx: number) => (
                <div key={idx} className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-800 bg-rose-200/60 px-2 py-0.5 rounded font-mono">
                      {g.ruleNumber}
                    </span>
                    <p className="text-xs font-medium text-gray-800 mt-1">{g.requirementText}</p>
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                    {g.failCount} failures
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 py-4 text-center">No failure trends recorded yet.</p>
            )}
          </div>
        </div>

        {/* Product Category Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Inspected Product Categories</span>
          </h2>

          <div className="space-y-3">
            {stats?.categoryBreakdown?.length > 0 ? (
              stats.categoryBreakdown.map((c: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-xs font-semibold text-gray-800">{c.category}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, (c.count / (s.totalInspections || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 font-mono">{c.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 py-4 text-center">No product category data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Recent Inspections</h2>
          <Link to="/history" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1">
            <span>View All History</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-3">Inspection #</th>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Inspector</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {stats?.recentInspections?.map((i: Inspection) => (
                <tr key={i.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-blue-700">{i.inspectionNumber}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{i.product?.name || 'Packaged Item'}</td>
                  <td className="px-6 py-4 text-gray-600">{i.product?.category || 'General'}</td>
                  <td className="px-6 py-4 text-gray-600">{i.inspector?.name || 'Officer'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        i.overallResult === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : i.overallResult === 'FAIL'
                          ? 'bg-rose-100 text-rose-800'
                          : i.overallResult === 'REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {i.overallResult}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold font-mono text-gray-900">{i.complianceScore.toFixed(1)}%</td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/inspect/${i.id}/results`}
                      className="text-blue-600 font-semibold hover:underline flex items-center space-x-1"
                    >
                      <span>View Results</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
