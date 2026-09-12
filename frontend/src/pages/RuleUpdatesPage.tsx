import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { RuleUpdate } from '../types';
import { RefreshCw, CheckCircle, AlertTriangle, FileCode, ArrowRight, ShieldCheck } from 'lucide-react';

export const RuleUpdatesPage: React.FC = () => {
  const [updates, setUpdates] = useState<RuleUpdate[]>([]);
  const [checking, setChecking] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<RuleUpdate | null>(null);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const res = await api.get('/rule-updates');
      setUpdates(res.data);
    } catch (err) {
      console.error('Error fetching rule updates:', err);
    }
  };

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      await api.post('/rule-updates/check');
      fetchUpdates();
    } catch (err) {
      alert('Error monitoring official gazette updates.');
    } finally {
      setChecking(false);
    }
  };

  const handleApproveUpdate = async (id: string) => {
    try {
      await api.post(`/rule-updates/${id}/approve`);
      fetchUpdates();
      setSelectedUpdate(null);
    } catch (err) {
      alert('Error approving amendment.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
            <RefreshCw className="w-7 h-7 text-blue-600" />
            <span>Rule Update Monitor & Legal Change Diff</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Monitors official Gazette notifications and provides visual side-by-side legal diffs for human review.
          </p>
        </div>

        <button
          onClick={handleCheckUpdates}
          disabled={checking}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow"
        >
          {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Check Official Gazette for Amendments</span>
        </button>
      </div>

      {/* Updates List */}
      <div className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded font-mono border border-purple-200">
                  {update.documentVersion}
                </span>
                <h3 className="font-bold text-base text-gray-900 mt-2">{update.changeSummary}</h3>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  update.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {update.approvalStatus}
              </span>
            </div>

            {/* Visual Diff Preview */}
            <div className="bg-gray-900 rounded-xl p-4 text-white space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2 text-gray-400 font-sans">
                <span className="font-bold uppercase text-[10px]">Legal Change Diff Comparison</span>
                <span className="text-[10px]">Effective: {update.effectiveDate || 'Pending'}</span>
              </div>

              {update.diffs?.map((diff) => (
                <div key={diff.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-rose-950/40 p-3 rounded border border-rose-800/40">
                    <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">OLD RULE VERSION ({update.previousVersion})</p>
                    <p className="text-rose-200 text-xs">{diff.oldRuleText || 'None'}</p>
                  </div>

                  <div className="bg-emerald-950/40 p-3 rounded border border-emerald-800/40">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">NEW RULE AMENDMENT ({update.newVersion})</p>
                    <p className="text-emerald-200 text-xs">{diff.newRuleText}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-gray-500">Detected: {new Date(update.detectedAt).toLocaleString()}</span>
              {update.approvalStatus === 'PENDING' && (
                <button
                  onClick={() => handleApproveUpdate(update.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve & Activate Statutory Amendment</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
