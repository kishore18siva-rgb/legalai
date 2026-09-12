import React from 'react';
import { RuleResult, ExtractedField, InspectionImage } from '../types';
import { FileText, MapPin, Eye, Scale, AlertCircle } from 'lucide-react';

interface EvidenceViewerProps {
  ruleResult: RuleResult;
  extractedFields?: ExtractedField[];
  images?: InspectionImage[];
  onClose?: () => void;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ ruleResult, extractedFields = [], images = [] }) => {
  const matchingField = extractedFields.find((f) => f.fieldKey.toLowerCase().includes(ruleResult.ruleCode.toLowerCase()) || f.rawValue === ruleResult.extractedValue);
  const evidenceImage = images.find((i) => i.id === ruleResult.evidenceImageId) || images[0];

  let region: any = null;
  if (ruleResult.evidenceRegionJson) {
    try {
      region = JSON.parse(ruleResult.evidenceRegionJson);
    } catch (e) {}
  } else if (matchingField?.sourceRegionJson) {
    try {
      region = JSON.parse(matchingField.sourceRegionJson);
    } catch (e) {}
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-legal-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Scale className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-lg">{ruleResult.ruleNumber} Legal Evidence & Audit Trace</h3>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            ruleResult.result === 'PASS'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : ruleResult.result === 'FAIL'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : ruleResult.result === 'REVIEW'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
          }`}
        >
          {ruleResult.result}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Top Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Statutory Requirement</span>
            </h4>
            <p className="text-sm font-medium text-gray-900">{ruleResult.requirementText}</p>
            {ruleResult.sourcePage && (
              <p className="text-xs text-blue-600 mt-2 font-mono">
                Source Citation: Page {ruleResult.sourcePage} of Legal Metrology (Packaged Commodities) Rules, 2011
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
              <Eye className="w-4 h-4 text-purple-600" />
              <span>Extracted Value & Analysis</span>
            </h4>
            <p className="text-sm font-semibold text-gray-900">{ruleResult.extractedValue || 'None detected'}</p>
            <p className="text-xs text-gray-600 mt-1">{ruleResult.reason}</p>
          </div>
        </div>

        {/* Image Bounding Box Visual Evidence */}
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-900 text-white">
          <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span>Label Image OCR Visual Region</span>
          </h4>

          {evidenceImage ? (
            <div className="relative max-w-lg mx-auto overflow-hidden rounded-lg border border-gray-700 bg-black">
              <img
                src={`/${evidenceImage.originalPath}`}
                alt="Product Package Label"
                className="w-full h-auto object-contain max-h-80"
              />
              {/* Highlight bounding box overlay */}
              {region && (
                <div
                  className="absolute border-2 border-amber-400 bg-amber-400/20 rounded pointer-events-none animate-pulse"
                  style={{
                    left: `${(region.x0 / 400) * 100}%`,
                    top: `${(region.y0 / 300) * 100}%`,
                    width: `${((region.x1 - region.x0) / 400) * 100}%`,
                    height: `${((region.y1 - region.y0) / 300) * 100}%`,
                  }}
                />
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-500" />
              <span>No image visual bounding box recorded for this requirement.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
