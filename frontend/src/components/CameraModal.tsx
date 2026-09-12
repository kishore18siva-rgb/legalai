import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture, title = 'Capture Product Package Photo' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access unavailable. You can upload a photo file from your device.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `captured_package_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(capturedFile);
            stopCamera();
            onClose();
          }
        }, 'image/jpeg', 0.92);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCapture(e.target.files[0]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-legal-900 border border-legal-700 rounded-xl w-full max-w-lg overflow-hidden text-white shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-legal-700">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-legal-800 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          {cameraError ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-amber-400 text-sm max-w-xs">{cameraError}</p>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 justify-center inline-flex">
                <Upload className="w-4 h-4" />
                <span>Upload Photo from Device</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-legal-700">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        <div className="p-4 bg-legal-800 border-t border-legal-700 flex items-center justify-between">
          <label className="cursor-pointer text-xs text-gray-300 hover:text-white flex items-center space-x-1">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Choose File</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>

          {!cameraError && (
            <button
              onClick={handleCapture}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-full shadow flex items-center space-x-2"
            >
              <Camera className="w-5 h-5" />
              <span>Capture Photo</span>
            </button>
          )}

          <button onClick={startCamera} title="Refresh Camera" className="p-2 text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
