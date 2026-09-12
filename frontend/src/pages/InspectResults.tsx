import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Inspection, RuleResult, ExtractedField } from '../types';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { FieldCorrectionModal } from '../components/FieldCorrectionModal';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Download,
  Edit3,
  Scale,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';

export const InspectResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ALL' | 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE'>('ALL');
  const [selectedRule, setSelectedRule] = useState<RuleResult | null>(null);

  const [correctModalOpen, setCorrectModalOpen] = useState(false);
  const [fieldToCorrect, setFieldToCorrect] = useState<ExtractedField | null>(null);

  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const fetchInspection = async () => {
    try {
      const res = await api.get(`/inspections/${id}`);
      setInspection(res.data);
    } catch (err) {
      console.error('Error fetching inspection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!id) return;
    setGeneratingReport(true);
    try {
      const res = await api.get(`/inspections/${id}/report`);
      window.open(res.data.reportUrl, '_blank');
    } catch (err) {
      alert('Error generating PDF compliance report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading || !inspection) {
    return (
      <div className="p-8 text-center text-gray-500 flex items-center justify-center space-x-2">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span>Loading Compliance Results...</span>
      </div>
    );
  }

  const results = inspection.ruleResults || [];
  const filteredResults = results.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.result === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500 text-white';
      case 'FAIL':
        return 'bg-rose-600 text-white';
      case 'REVIEW':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className={`px-4 py-1.5 rounded-full font-black text-sm tracking-wider uppercase ${getStatusColor(inspection.overallResult)}`}>
              {inspection.overallResult}
            </span>
            <h1 className="text-2xl font-black text-gray-900 font-mono">{inspection.inspectionNumber}</h1>
          </div>

          <p className="text-xs text-gray-600 mt-2 font-medium">
            Product: <strong className="text-gray-900">{inspection.product?.name}</strong> | Category:{' '}
            <strong className="text-gray-900">{inspection.product?.category}</strong> | Inspector:{' '}
            <strong className="text-gray-900">{inspection.inspector?.name}</strong>
          </p>
        </div>

        {/* Score Meter & Actions */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-3xl font-black text-blue-700 font-mono">{inspection.complianceScore.toFixed(1)}%</div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Compliance Index</p>
          </div>

          <button
            onClick={handleDownloadReport}
            disabled={generatingReport}
            className="bg-legal-900 hover:bg-legal-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow transition"
          >
            {generatingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download Official PDF Report</span>
          </button>
        </div>
      </div>

      {/* Cards breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase">Passed</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-1">{inspection.passedCount}</p>
        </div>

        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold uppercase">Failed</span>
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900 mt-1">{inspection.failedCount}</p>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase">Needs Review</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">{inspection.reviewCount}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between text-gray-700">
            <span className="text-xs font-bold uppercase">Not Applicable</span>
            <HelpCircle className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-1">{inspection.naCount}</p>
        </div>
      </div>

      {/* Extracted Fields & Manual Correction Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center space-x-2 border-b pb-2">
          <Edit3 className="w-4 h-4 text-blue-600" />
          <span>Extracted Declarations & Manual Corrections</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inspection.extractedFields?.map((field) => (
            <div key={field.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">{field.fieldLabel}</span>
                <p className="text-xs font-bold text-gray-900 font-mono mt-0.5">{field.rawValue || 'Not detected'}</p>
                {field.isCorrected && (
                  <span className="text-[9px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                    Manually Corrected
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setFieldToCorrect(field);
                  setCorrectModalOpen(true);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Correct value"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rule-by-Rule Compliance Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
            <Scale className="w-4 h-4 text-blue-600" />
            <span>Deterministic Legal Metrology Validation Table</span>
          </h2>

          <div className="flex space-x-1 bg-gray-200/80 p-1 rounded-lg text-xs font-semibold">
            {(['ALL', 'PASS', 'FAIL', 'REVIEW', 'NOT_APPLICABLE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-3">Rule Number</th>
                <th className="px-6 py-3">Statutory Requirement</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Extracted Value</th>
                <th className="px-6 py-3">Reason / Legal Trace</th>
                <th className="px-6 py-3">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {filteredResults.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-bold font-mono text-legal-800">{r.ruleNumber}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 max-w-xs">{r.requirementText}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.result === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.result === 'FAIL'
                          ? 'bg-rose-100 text-rose-800'
                          : r.result === 'REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {r.result}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-gray-800">{r.extractedValue || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-sm">{r.reason}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedRule(r)}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Evidence</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Rule Evidence Modal / Drawer */}
      {selectedRule && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full relative">
            <button
              onClick={() => setSelectedRule(null)}
              className="absolute -top-10 right-0 bg-white text-gray-900 font-bold px-3 py-1 rounded-full text-xs shadow"
            >
              Close Evidence
            </button>
            <EvidenceViewer
              ruleResult={selectedRule}
              extractedFields={inspection.extractedFields}
              images={inspection.images}
              onClose={() => setSelectedRule(null)}
            />
          </div>
        </div>
      )}

      {/* Field Correction Modal */}
      <FieldCorrectionModal
        isOpen={correctModalOpen}
        onClose={() => setCorrectModalOpen(false)}
        field={fieldToCorrect}
        inspectionId={inspection.id}
        onSuccess={fetchInspection}
      />
    </div>
  );
};
