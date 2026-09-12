import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Inspection } from '../types';
import { Search, Filter, History, ArrowRight, Calendar, ShieldCheck } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [search, statusFilter]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/inspections', {
        params: { search, result: statusFilter },
      });
      setInspections(res.data);
    } catch (err) {
      console.error('Error fetching inspection history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
            <History className="w-7 h-7 text-blue-600" />
            <span>Inspection History & Evidence Repository</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Complete audit trail of all packaged commodity inspections performed.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Inspection # or Product Name..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="PASS">PASS (Compliant)</option>
            <option value="FAIL">FAIL (Violation)</option>
            <option value="REVIEW">REVIEW (Needs Review)</option>
            <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-3">Inspection #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Inspector</th>
                <th className="px-6 py-3">Result</th>
                <th className="px-6 py-3">Compliance Score</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {inspections.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-blue-700">{i.inspectionNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{i.product?.name || 'Packaged Item'}</td>
                  <td className="px-6 py-4 text-gray-600">{i.product?.category}</td>
                  <td className="px-6 py-4 text-gray-600">{i.inspector?.name}</td>
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
                      <span>Reopen Evidence</span>
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
