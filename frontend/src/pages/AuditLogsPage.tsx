import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AuditLog } from '../types';
import { ShieldCheck, Clock, User, FileText } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <span>Immutable System Audit Trail</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Complete security log of all inspection, user, rule edit, and report actions.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Entity</th>
                <th className="px-6 py-3">Details / Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition font-mono">
                  <td className="px-6 py-4 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{log.userEmail || 'System'}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">{log.action}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{log.entity}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{log.newValueJson || log.oldValueJson || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
