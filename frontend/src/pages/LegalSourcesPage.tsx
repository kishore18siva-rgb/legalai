import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LegalSource } from '../types';
import { FileText, Upload, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';

export const LegalSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<LegalSource[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await api.get('/legal-sources');
      setSources(res.data);
    } catch (err) {
      console.error('Error fetching legal sources:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    setUploading(true);
    try {
      await api.post('/legal-sources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchSources();
    } catch (err) {
      alert('Error uploading PDF document.');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessSource = async (sourceId: string) => {
    setProcessingId(sourceId);
    try {
      await api.post(`/legal-sources/${sourceId}/process`);
      fetchSources();
    } catch (err) {
      alert('Error processing PDF source.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
            <FileText className="w-7 h-7 text-blue-600" />
            <span>Official Legal Source Repository</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Official gazette PDF documents used as legal grounding for rule extraction.
          </p>
        </div>

        <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 cursor-pointer shadow">
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>Upload Legal Gazette PDF</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((src) => (
          <div key={src.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-legal-900 p-2.5 rounded-lg text-white">
                  <FileText className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{src.name}</h3>
                  <span className="text-[10px] text-gray-500 font-mono">Version: {src.version}</span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  src.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {src.status}
              </span>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1 font-mono text-gray-600">
              <p>File SHA-256 Hash: <span className="text-gray-900 font-bold">{src.fileHash.substring(0, 24)}...</span></p>
              <p>Extracted Rules: <span className="text-blue-700 font-bold">{src.ruleCount} rules</span></p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-gray-500">Uploaded: {new Date(src.uploadedAt).toLocaleDateString()}</span>
              {src.status === 'DRAFT' && (
                <button
                  onClick={() => handleProcessSource(src.id)}
                  disabled={processingId === src.id}
                  className="bg-legal-900 hover:bg-legal-800 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1"
                >
                  {processingId === src.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Process PDF Rules</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
