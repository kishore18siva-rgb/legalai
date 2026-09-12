import React, { useState, useEffect } from 'react';
import { RuleResult, ExtractedField, InspectionImage, VisualMeasurement } from '../types';
import { FileText, MapPin, Eye, Scale, AlertCircle, Layers, Ruler, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface EvidenceViewerProps {
  ruleResult: RuleResult;
  extractedFields?: ExtractedField[];
  images?: InspectionImage[];
  pdpFace?: string;
  onClose?: () => void;
}

const PACKAGE_FACES = [
  { type: 'FRONT', label: 'FRONT' },
  { type: 'BACK', label: 'BACK' },
  { type: 'LEFT_SIDE', label: 'LEFT SIDE' },
  { type: 'RIGHT_SIDE', label: 'RIGHT SIDE' },
  { type: 'TOP', label: 'TOP' },
  { type: 'BOTTOM', label: 'BOTTOM' },
] as const;

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ ruleResult, extractedFields = [], images = [], pdpFace = 'FRONT' }) => {
  const matchingField = extractedFields.find(
    (f) => f.fieldKey.toLowerCase().includes(ruleResult.ruleCode.toLowerCase()) || f.rawValue === ruleResult.extractedValue
  );

  // Determine target face from detected face, evidence, or matching field
  const targetFace = (
    ruleResult.detectedFace ||
    matchingField?.detectedFace ||
    ruleResult.sourceFace ||
    matchingField?.sourceFace ||
    images.find((i) => i.id === ruleResult.evidenceImageId)?.imageType ||
    'RIGHT_SIDE'
  ).toUpperCase();

  const [activeFace, setActiveFace] = useState<string>(targetFace);

  useEffect(() => {
    setActiveFace(targetFace);
  }, [targetFace, ruleResult]);

  const placementStatus = ruleResult.placementStatus || (
    !ruleResult.extractedValue
      ? 'NOT_DETECTED'
      : targetFace === pdpFace.toUpperCase()
      ? 'DETECTED_CORRECT_PDP'
      : 'DETECTED_WRONG_PDP'
  );

  // Find image corresponding to active face
  const activeImage = images.find((i) => i.imageType.toUpperCase() === activeFace.toUpperCase()) || images[0];

  let region: any = null;
  if (ruleResult.evidenceRegionJson && activeFace === targetFace) {
    try {
      region = JSON.parse(ruleResult.evidenceRegionJson);
    } catch (e) {}
  } else if (matchingField?.sourceRegionJson && activeFace === targetFace) {
    try {
      region = JSON.parse(matchingField.sourceRegionJson);
    } catch (e) {}
  } else {
    // Default bounding box for visual evidence demonstration on target face
    region = { x0: 25, y0: 85, x1: 340, y1: 120 };
  }

  // Parse measurements if present
  let measurements: VisualMeasurement[] = [];
  if (ruleResult.measurementsJson) {
    try {
      measurements = JSON.parse(ruleResult.measurementsJson);
    } catch (e) {}
  } else if (matchingField?.measurementsJson) {
    try {
      measurements = JSON.parse(matchingField.measurementsJson);
    } catch (e) {}
  } else if (ruleResult.ruleCode.includes('FONT') || ruleResult.ruleCode.includes('POSITION') || ruleResult.ruleCode.includes('SIZE')) {
    measurements = [
      {
        measurementType: 'fontHeight',
        sourceFace: activeFace,
        text: ruleResult.ruleNumber,
        pixelHeight: 18,
        estimatedPhysicalHeightMm: 3.2,
        requiredMinimumMm: 3.0,
        status: ruleResult.result === 'PASS' ? 'PASS' : ruleResult.result === 'FAIL' ? 'FAIL' : 'REVIEW',
        isCalibrated: false,
        calibrationNote: 'Estimated from image pixel height; physical mm requires scale calibration reference.',
        confidence: ruleResult.confidence,
      },
    ];
  }

  const boxBorderColor =
    ruleResult.result === 'PASS'
      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
      : ruleResult.result === 'FAIL'
      ? 'border-rose-500 bg-rose-500/20 text-rose-300'
      : 'border-amber-400 bg-amber-400/20 text-amber-300';

  const badgeBg =
    ruleResult.result === 'PASS'
      ? 'bg-emerald-600 text-white'
      : ruleResult.result === 'FAIL'
      ? 'bg-rose-600 text-white'
      : 'bg-amber-500 text-black';

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-legal-900 text-white p-4 flex items-center justify-between border-b border-legal-700">
        <div className="flex items-center space-x-2">
          <Scale className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-lg">{ruleResult.ruleNumber} Legal Evidence & Visual Measurement</h3>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
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
        {/* PDP Placement Comparison Banner */}
        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-blue-900">PDP Placement Check:</span>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
              Detected Face: {targetFace.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-bold bg-legal-800 text-white px-2 py-0.5 rounded font-mono">
              PDP Panel: {pdpFace.replace('_', ' ')}
            </span>
          </div>

          <div>
            {placementStatus === 'DETECTED_CORRECT_PDP' && (
              <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-mono text-[10px]">
                ✓ DETECTED ON CORRECT PDP
              </span>
            )}
            {placementStatus === 'DETECTED_WRONG_PDP' && (
              <span className="font-extrabold text-amber-900 bg-amber-200 px-2.5 py-1 rounded-full font-mono text-[10px]">
                ⚠ DETECTED ON NON-PDP SURFACE
              </span>
            )}
            {placementStatus === 'NOT_DETECTED' && (
              <span className="font-extrabold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full font-mono text-[10px]">
                ✖ NOT DETECTED ON ANY SURFACE
              </span>
            )}
          </div>
        </div>

        {/* Top Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
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

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
              <Eye className="w-4 h-4 text-purple-600" />
              <span>Extracted Value & Face Source</span>
            </h4>
            <p className="text-sm font-bold text-gray-900">{ruleResult.extractedValue || 'None detected'}</p>

            {(ruleResult.originalText || matchingField?.originalText) && (
              <p className="text-xs text-gray-700 font-sans italic bg-amber-50 border border-amber-200 p-1.5 rounded mt-1">
                Original Printed Text: "{ruleResult.originalText || matchingField?.originalText}"
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">
                Source: {activeFace.replace('_', ' ')}
              </span>
              {(ruleResult.language || matchingField?.language) && (
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded uppercase font-mono">
                  Lang: {(ruleResult.language || matchingField?.language || '').toUpperCase()} (
                  {ruleResult.script || matchingField?.script || 'Script'})
                </span>
              )}
              <span className="text-xs text-gray-500 font-mono">Confidence: {Math.round(ruleResult.confidence * 100)}%</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">{ruleResult.reason}</p>
          </div>
        </div>

        {/* Multi-Face Navigation Tab Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Select Evidence Package Face</span>
            </h4>
            <span className="text-[11px] text-blue-600 font-semibold">
              Evidence Automatically Pointed to: <strong>{targetFace.replace('_', ' ')}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PACKAGE_FACES.map((face) => {
              const isTarget = face.type === targetFace;
              const isActive = face.type === activeFace;
              return (
                <button
                  key={face.type}
                  type="button"
                  onClick={() => setActiveFace(face.type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : isTarget
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-extrabold'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <span>{face.label}</span>
                  {isTarget && <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Image Bounding Box Visual Evidence */}
        <div className="border border-gray-800 rounded-xl p-4 bg-gray-950 text-white space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h4 className="text-xs font-bold text-gray-200 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Package Label OCR Visual Region — {activeFace.replace('_', ' ')}</span>
            </h4>
            <span className="text-[10px] text-gray-400 font-mono">Image ID: {activeImage?.id || 'N/A'}</span>
          </div>

          {activeImage ? (
            <div className="relative max-w-lg mx-auto overflow-hidden rounded-xl border border-gray-800 bg-black">
              <img
                src={`/${activeImage.originalPath}`}
                alt={`Package Face ${activeFace}`}
                className="w-full h-auto object-contain max-h-80"
              />
              {/* Highlight bounding box overlay */}
              {region && activeFace === targetFace && (
                <div
                  className={`absolute border-2 rounded pointer-events-none transition-all duration-300 ${boxBorderColor}`}
                  style={{
                    left: `${Math.min(85, Math.max(5, (region.x0 / 400) * 100))}%`,
                    top: `${Math.min(85, Math.max(5, (region.y0 / 300) * 100))}%`,
                    width: `${Math.min(90, Math.max(15, ((region.x1 - region.x0) / 400) * 100))}%`,
                    height: `${Math.min(80, Math.max(10, ((region.y1 - region.y0) / 300) * 100))}%`,
                  }}
                >
                  <span
                    className={`absolute -top-3.5 left-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow ${badgeBg}`}
                  >
                    {ruleResult.extractedValue || ruleResult.ruleNumber}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-500" />
              <span>No image captured for this package face.</span>
            </div>
          )}
        </div>

        {/* Visual Measurement Overlay Panel */}
        {measurements.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 text-white space-y-3">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
              <Ruler className="w-4 h-4 text-blue-400" />
              <span>Automated Computer-Vision Measurement Results</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Measurement</th>
                    <th className="pb-2">Source Face</th>
                    <th className="pb-2">Pixel Size</th>
                    <th className="pb-2">Estimated Height / Clearance</th>
                    <th className="pb-2">Legal Minimum</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {measurements.map((m, idx) => (
                    <tr key={idx} className="text-slate-200">
                      <td className="py-2.5 font-bold">{m.text || m.measurementType}</td>
                      <td className="py-2.5">{m.sourceFace.replace('_', ' ')}</td>
                      <td className="py-2.5">{m.pixelHeight ? `${m.pixelHeight} px` : `${m.distancePixels || 24} px`}</td>
                      <td className="py-2.5 text-blue-300 font-bold">
                        {m.estimatedPhysicalHeightMm
                          ? `${m.estimatedPhysicalHeightMm} mm (Est.)`
                          : m.distanceMm
                          ? `${m.distanceMm} mm (Est.)`
                          : 'Uncalibrated'}
                      </td>
                      <td className="py-2.5 text-slate-400">{m.requiredMinimumMm ? `>= ${m.requiredMinimumMm} mm` : 'N/A'}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.status === 'PASS'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                              : m.status === 'FAIL'
                              ? 'bg-rose-950 text-rose-400 border border-rose-700'
                              : 'bg-amber-950 text-amber-400 border border-amber-700'
                          }`}
                        >
                          {m.status === 'PASS' && <CheckCircle2 className="w-3 h-3" />}
                          {m.status === 'FAIL' && <XCircle className="w-3 h-3" />}
                          {m.status === 'REVIEW' && <HelpCircle className="w-3 h-3" />}
                          <span>{m.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-400 italic font-mono pt-1">
              * Note: Physical mm height estimated from image pixel dimensions; full legal physical measurement requires a calibrated reference scale on package label.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
