import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AutoScanResponse, ExtractedField } from '../types';
import { CameraModal } from '../components/CameraModal';
import { EvidenceViewer } from '../components/EvidenceViewer';
import {
  ScanLine,
  Camera,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Eye,
  ArrowRight,
  Package,
  Layers,
} from 'lucide-react';

export const InspectNew: React.FC = () => {
  const navigate = useNavigate();

  // Step state: 1 = Upload Images, 2 = Analyzing, 3 = User Review & Edit Screen
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [uploadedImages, setUploadedImages] = useState<
    { file: File; preview: string; type: string }[]
  >([]);

  const [activeImageType, setActiveImageType] = useState<string>('FRONT');
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Analysis Progress Stages
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [progressStageText, setProgressStageText] = useState('');

  // Scan Results for Review (Manual Inspector Entry)
  const [autoScanData, setAutoScanData] = useState<AutoScanResponse | null>(null);
  const [editedProductName, setEditedProductName] = useState('');
  const [editedBrand, setEditedBrand] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedVariant, setEditedVariant] = useState('');
  const [metadataConfirmed, setMetadataConfirmed] = useState(false);
  const [selectedPdpFace, setSelectedPdpFace] = useState<string>('FRONT');
  const [reviewFields, setReviewFields] = useState<ExtractedField[]>([]);

  // Field Edit Drawer / Modal state
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);
  const [fieldEditValue, setFieldEditValue] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Food',
    'Beverage',
    'Cosmetics',
    'Household',
    'Personal Care',
    'Clothing/Textile',
    'Electronics',
    'Stationery',
    'Pharmaceutical-related package',
    'Other',
  ];

  const handleCapturePhoto = (file: File) => {
    const preview = URL.createObjectURL(file);
    setUploadedImages((prev) => [...prev, { file, preview, type: activeImageType }]);
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // STEP 1 -> STEP 2: Execute Auto-Scan Pipeline
  const handleStartAutoScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedImages.length === 0) {
      setError('Please capture or upload at least one product package image.');
      return;
    }

    setLoading(true);
    setError(null);
    setAutoScanData(null);
    setEditedProductName('');
    setEditedBrand('');
    setEditedCategory('');
    setEditedVariant('');
    setMetadataConfirmed(false);
    setReviewFields([]);
    setCurrentStep(2);

    // Dynamic Analysis Stage Progress
    setProgressStageText('Stage 1/5: Checking image resolution & blur quality...');
    setAnalysisProgress(25);

    try {
      const formData = new FormData();
      uploadedImages.forEach((item) => {
        formData.append('images', item.file);
        formData.append('imageTypes', item.type);
      });

      setProgressStageText('Stage 3/5: Running OCR text extraction & AI analysis...');
      setAnalysisProgress(65);

      const res = await api.post('/inspections/auto-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data: AutoScanResponse = res.data;
      setProgressStageText('Stage 5/5: Analyzing package panel coverage...');
      setAnalysisProgress(100);

      setAutoScanData(data);
      setEditedProductName('');
      setEditedBrand('');
      setEditedCategory('');
      setEditedVariant('');
      setSelectedPdpFace(data.pdpInfo?.pdpFace || 'FRONT');
      setReviewFields(data.extractedFields || []);

      setLoading(false);
      setCurrentStep(3); // Move to Review Screen
    } catch (err: any) {
      let errorMsg = 'Error executing package auto-scan.';
      if (err.response?.data) {
        if (typeof err.response.data.error === 'string') {
          errorMsg = err.response.data.error;
        } else if (typeof err.response.data === 'string') {
          errorMsg = `Server Error: ${err.response.status} - Please try again.`;
        } else {
          errorMsg = err.response.data.message || err.response.data.error?.message || errorMsg;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setLoading(false);
      setCurrentStep(1);
    }
  };

  // Field edit handler in Review Screen
  const handleSaveFieldEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;

    setReviewFields((prev) =>
      prev.map((f) =>
        f.fieldKey === editingField.fieldKey
          ? { ...f, rawValue: fieldEditValue, normalizedValue: fieldEditValue, isCorrected: true, reviewRequired: false }
          : f
      )
    );
    setEditingField(null);
  };

  // STEP 3 -> STEP 4: Confirm Data & Run Legal Metrology Rule Engine
  const handleConfirmAndRunEngine = async () => {
    if (!autoScanData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/inspections/${autoScanData.inspectionId}/confirm-and-evaluate`, {
        confirmedProduct: {
          name: editedProductName,
          brand: editedBrand,
          category: editedCategory,
        },
        confirmedFields: reviewFields,
        pdpFace: selectedPdpFace,
      });

      // Navigate to Results Page
      navigate(`/inspect/${res.data.id}/results`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error running legal rule engine.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Step Header Indicator */}
      <div className="bg-legal-900 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between border border-legal-700">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2.5 rounded-xl border border-blue-400">
            <ScanLine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Packaged Commodity Compliance Inspection</h1>
            <p className="text-xs text-blue-300">
              The Legal Metrology (Packaged Commodities) Rules, 2011 Compliance Audit
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-bold font-mono">
          <span className={`px-3 py-1 rounded-full ${currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-legal-800 text-gray-400'}`}>
            1. Capture
          </span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span className={`px-3 py-1 rounded-full ${currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-legal-800 text-gray-400'}`}>
            2. Auto Scan
          </span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span className={`px-3 py-1 rounded-full ${currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-legal-800 text-gray-400'}`}>
            3. Review & Validate
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-xl font-medium flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: CAPTURE OR UPLOAD PRODUCT PACKAGE IMAGES */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-6">
          <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 flex items-start space-x-3">
            <Camera className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">1. CAPTURE OR UPLOAD PRODUCT PACKAGE</p>
              <p className="mt-0.5">
                Upload clear photos of all visible sides of the package. LegalLens will automatically detect product
                information and mandatory statutory declarations. No manual text entry is required before scanning.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { type: 'FRONT', label: 'ADD FRONT' },
              { type: 'BACK', label: 'ADD BACK' },
              { type: 'LEFT_SIDE', label: 'ADD LEFT SIDE' },
              { type: 'RIGHT_SIDE', label: 'ADD RIGHT SIDE' },
              { type: 'TOP', label: 'ADD TOP' },
              { type: 'BOTTOM', label: 'ADD BOTTOM' },
            ].map((card) => (
              <button
                type="button"
                key={card.type}
                onClick={() => {
                  setActiveImageType(card.type);
                  setCameraModalOpen(true);
                }}
                className="border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 text-center transition group"
              >
                <Camera className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                <span className="text-xs font-bold text-gray-700 uppercase">{card.label}</span>
              </button>
            ))}
          </div>

          {/* Uploaded Images Preview Grid */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-300 group shadow-sm">
                  <img src={img.preview} alt={`Label ${idx}`} className="w-full h-32 object-cover" />
                  <div className="absolute top-1 left-1 bg-legal-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {img.type}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleStartAutoScan}
              disabled={uploadedImages.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition shadow-lg"
            >
              <ScanLine className="w-5 h-5" />
              <span>Upload & Auto-Scan Package</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: AUTOMATIC ANALYSIS PROGRESS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-6 py-12">
          <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">Analyzing Package Labels...</h2>
            <p className="text-xs text-gray-500 mt-1 font-mono">{progressStageText}</p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-2xl mx-auto text-[11px] font-semibold text-gray-600">
            <span className={analysisProgress >= 20 ? 'text-emerald-600 font-bold' : ''}>✓ Quality Check</span>
            <span className={analysisProgress >= 40 ? 'text-emerald-600 font-bold' : ''}>✓ OCR Text</span>
            <span className={analysisProgress >= 60 ? 'text-emerald-600 font-bold' : ''}>✓ Declarations</span>
            <span className={analysisProgress >= 80 ? 'text-emerald-600 font-bold' : ''}>✓ Category</span>
            <span className={analysisProgress >= 100 ? 'text-emerald-600 font-bold' : ''}>✓ Coverage</span>
          </div>
        </div>
      )}

      {/* STEP 3: USER REVIEW & CONFIRMATION SCREEN */}
      {currentStep === 3 && autoScanData && (
        <div className="space-y-6">
          {/* Panel Coverage Warning Banner */}
          {autoScanData.imageCoverage.coverageStatus === 'PARTIAL' && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">PARTIAL IMAGE COVERAGE WARNING</p>
                <p className="mt-0.5">{autoScanData.imageCoverage.warningMessage}</p>
              </div>
            </div>
          )}

          {/* Section A: Product Metadata — Inspector Entry */}
          <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>2. Product Metadata — Inspector Entry</span>
              </h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono">
                Authoritative Input for Compliance Engine
              </span>
            </div>

            <p className="text-xs text-gray-600">
              Please enter the verified product information. The deterministic compliance engine will evaluate captured package evidence against this confirmed metadata.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Product / Common Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedProductName}
                  onChange={(e) => {
                    setEditedProductName(e.target.value);
                    setMetadataConfirmed(false);
                  }}
                  placeholder="e.g. Caloe Plus Lotion / Tomato Ketchup"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedBrand}
                  onChange={(e) => {
                    setEditedBrand(e.target.value);
                    setMetadataConfirmed(false);
                  }}
                  placeholder="e.g. Dermadew / Del Monte"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={editedCategory}
                  onChange={(e) => {
                    setEditedCategory(e.target.value);
                    setMetadataConfirmed(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-blue-900 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Product Category --</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Variant / Flavour <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={editedVariant}
                  onChange={(e) => {
                    setEditedVariant(e.target.value);
                    setMetadataConfirmed(false);
                  }}
                  placeholder="e.g. Classic Blend / Mini"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              {metadataConfirmed ? (
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Product Metadata Confirmed by Inspecting Officer</span>
                </div>
              ) : (
                <p className="text-xs text-amber-700 font-medium">
                  ⚠ Please confirm product information before running compliance analysis.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!editedProductName.trim() || !editedBrand.trim() || !editedCategory) {
                    setError('Product Name, Brand Name, and Category are required before confirming.');
                    return;
                  }
                  setError(null);
                  setMetadataConfirmed(true);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  metadataConfirmed
                    ? 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{metadataConfirmed ? 'Edit Product Information' : 'Confirm Product Information'}</span>
              </button>
            </div>
          </div>

          {/* Debug / Transparency Section: RAW OCR TEXT FROM CURRENT IMAGE */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>RAW OCR TEXT FROM CURRENT IMAGE (PER-FACE BREAKDOWN)</span>
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                {autoScanData.fullOcrText ? `${autoScanData.fullOcrText.length} characters extracted` : 'OCR_LOW_CONFIDENCE'}
              </span>
            </div>

            {autoScanData.rawOcrByFace && autoScanData.rawOcrByFace.length > 0 ? (
              <div className="space-y-2">
                {autoScanData.rawOcrByFace.map((f, i) => (
                  <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-850 pb-1 mb-2">
                      <span className="text-emerald-400 font-mono uppercase">[{f.face} FACE OCR]</span>
                      <span>Confidence: {Math.round((f.confidence || 0.85) * 100)}%</span>
                    </div>
                    <pre className="text-xs text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap font-mono">
                      {f.text || '(No text extracted from this face)'}
                    </pre>
                  </div>
                ))}
              </div>
            ) : autoScanData.fullOcrText ? (
              <pre className="text-xs bg-slate-950 p-3 rounded-lg overflow-x-auto text-slate-300 max-h-40 leading-relaxed whitespace-pre-wrap font-mono border border-slate-850">
                {autoScanData.fullOcrText}
              </pre>
            ) : (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 text-xs font-sans">
                ⚠ Low confidence / empty OCR output on captured images.
              </div>
            )}
          </div>

          {/* Section B: Principal Display Panel (PDP) Determination & Override */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>3. Principal Display Panel (PDP) Determination & Override</span>
              </h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono">
                Legal Metrology Rules 2011 (Rule 8)
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm">
                    AI Auto-Detected PDP: <span className="text-blue-700 font-black font-mono uppercase">{autoScanData.pdpInfo?.pdpFace || 'FRONT'}</span>
                  </p>
                  <p className="mt-1 text-gray-700">
                    Reason: {autoScanData.pdpInfo?.reason || 'Identified based on primary brand logo and prominent product declaration density.'}
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-1 rounded font-mono">
                  {Math.round((autoScanData.pdpInfo?.confidence || 0.95) * 100)}% PDP Confidence
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Designate Principal Display Panel (PDP) Surface:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[
                  { type: 'FRONT', label: 'FRONT' },
                  { type: 'BACK', label: 'BACK' },
                  { type: 'LEFT_SIDE', label: 'LEFT SIDE' },
                  { type: 'RIGHT_SIDE', label: 'RIGHT SIDE' },
                  { type: 'TOP', label: 'TOP' },
                  { type: 'BOTTOM', label: 'BOTTOM' },
                ].map((face) => (
                  <button
                    type="button"
                    key={face.type}
                    onClick={() => setSelectedPdpFace(face.type)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono transition text-center ${
                      selectedPdpFace === face.type
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {face.label}
                    {autoScanData.pdpInfo?.pdpFace === face.type && selectedPdpFace !== face.type && (
                      <span className="block text-[8px] font-normal text-blue-600">AI Suggested</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section C: Extracted Mandatory Legal Declarations */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2 border-b pb-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>4. Detected Legal Declarations & Review</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewFields.map((field) => {
                const confPercent = Math.round(field.confidence * 100);
                const isLowConf = field.reviewRequired || confPercent < 80;

                return (
                  <div
                    key={field.fieldKey}
                    className={`p-4 rounded-xl border transition ${
                      isLowConf ? 'bg-amber-50/50 border-amber-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">{field.fieldLabel}</span>
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono uppercase">
                            Source: {field.sourceFace ? field.sourceFace.replace('_', ' ') : 'RIGHT SIDE'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">
                          {field.rawValue || <span className="text-rose-600 font-normal italic">Not detected</span>}
                        </p>
                      </div>

                      <div className="text-right">
                        {field.rawValue ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              isLowConf ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {confPercent}% {isLowConf ? '⚠ Review Required' : 'Confidence'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            Not Found
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200/60 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField(field);
                          setFieldEditValue(field.rawValue || '');
                        }}
                        className="text-xs text-blue-600 font-bold hover:underline flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Confirm / Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: Final Engine Trigger */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
            >
              ← Back to Image Upload
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {!metadataConfirmed && (
                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  ⚠ Confirm product metadata above to enable rule engine
                </span>
              )}
              <button
                onClick={handleConfirmAndRunEngine}
                disabled={loading || !metadataConfirmed}
                className={`font-bold px-6 py-3 rounded-xl text-sm flex items-center space-x-2 shadow-lg transition ${
                  metadataConfirmed && !loading
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                }`}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-blue-300" />
                )}
                <span>Confirm & Run Deterministic Legal Metrology Engine</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCapturePhoto}
        title={`Capture ${activeImageType} Package Label`}
      />

      {/* Field Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-gray-900">Edit {editingField.fieldLabel}</h3>
            <form onSubmit={handleSaveFieldEdit} className="space-y-4">
              <input
                type="text"
                value={fieldEditValue}
                onChange={(e) => setFieldEditValue(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Enter value..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="px-3 py-1.5 text-xs text-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 text-white font-bold px-4 py-1.5 rounded-lg text-xs">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
