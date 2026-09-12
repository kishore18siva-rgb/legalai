import React, { useState } from 'react';
import { ExtractedField } from '../types';
import { Edit3, X, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../services/api';

interface FieldCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: ExtractedField | null;
  inspectionId: string;
  onSuccess: () => void;
}

export const FieldCorrectionModal: React.FC<FieldCorrectionModalProps> = ({
  isOpen,
  onClose,
  field,
  inspectionId,
  onSuccess,
}) => {
  const [correctedValue, setCorrectedValue] = useState(field?.rawValue || '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !field) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post(`/inspections/${inspectionId}/correct-field`, {
        fieldId: field.id,
        correctedValue,
        reason: reason || 'Inspector manual correction of OCR extraction',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit field correction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200">
        <div className="bg-legal-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-lg">Correct Declaration Field</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">Field</label>
            <p className="text-sm font-bold text-gray-900">{field.fieldLabel}</p>
          </div>

          <div className="bg-amber-50 p-3 rounded border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Original OCR Value: <strong className="font-mono">{field.rawValue || 'None detected'}</strong>.
              Submitting a correction will audit the change and re-evaluate all legal rules deterministically.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Corrected Value *</label>
            <input
              type="text"
              value={correctedValue}
              onChange={(e) => setCorrectedValue(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. MRP Rs 40.00 INCL OF ALL TAXES"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Correction</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Reason (e.g. OCR misread Rs 400 as Rs 4000 due to glare)"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center space-x-1"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
              <span>Save & Recalculate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
