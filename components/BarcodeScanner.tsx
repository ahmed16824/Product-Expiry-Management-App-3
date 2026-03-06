import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useSettings } from '../context/SettingsContext';
import { useSound } from '../context/SoundContext';
import { 
  X, 
  Camera, 
  Zap, 
  ZapOff, 
  RefreshCw, 
  Maximize, 
  Minimize,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BarcodeScannerProps {
  onScanSuccess: (code: string) => void;
  onClose: () => void;
  isInline?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose, isInline = false }) => {
  const { t, direction } = useSettings();
  const { playSound } = useSound();
  const [error, setError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [successFlash, setSuccessFlash] = useState(false);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  
  const beepRef = useRef<HTMLAudioElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const containerId = isInline ? "inline-reader" : "full-reader";

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      } catch (err: any) {
        if (!String(err).includes("ongoing")) {
          console.error("Failed to stop scanner", err);
        }
        setIsScanning(false);
      }
    }
  }, []);

  const startScanner = useCallback(async (cameraId?: string) => {
    if (!html5QrCodeRef.current || isStartingRef.current) return;
    
    // If already scanning, stop first
    if (html5QrCodeRef.current.isScanning) {
      await stopScanner();
    }

    isStartingRef.current = true;
    setIsScanning(true);
    setError(null);

    const config = {
      fps: 30,
      qrbox: isInline ? { width: 250, height: 150 } : { width: 280, height: 180 },
      aspectRatio: 1.0,
    };

    try {
      const targetCamera = cameraId || (cameras.length > 0 ? cameras[currentCameraIndex].id : { facingMode: "environment" });
      
      await html5QrCodeRef.current.start(
        targetCamera,
        config,
        (decodedText) => {
          setSuccessFlash(true);
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
          playSound('scan');
          
          setTimeout(() => {
            setSuccessFlash(false);
            if (!isInline) {
              stopScanner().then(() => onScanSuccess(decodedText)).catch(() => onScanSuccess(decodedText));
            } else {
              onScanSuccess(decodedText);
            }
          }, 300);
        },
        () => {}
      );

      if (html5QrCodeRef.current && typeof html5QrCodeRef.current.getRunningTrack === 'function') {
        const track = html5QrCodeRef.current.getRunningTrack();
        if (track) {
          const capabilities = track.getCapabilities() as any;
          setHasFlash(!!capabilities.torch);
          if (capabilities.zoom) {
            setMaxZoom(capabilities.zoom.max);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to start scanner", err);
      let errorMessage = t('barcodeScannerCameraError') || "Could not start camera";
      
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || String(err).includes('Permission denied')) {
        errorMessage = t('cameraPermissionDenied');
      } else if (err?.name === 'NotReadableError' || String(err).includes('Could not start video source')) {
        errorMessage = t('cameraBusyError');
      }
      
      setError(errorMessage);
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [cameras, currentCameraIndex, isInline, onScanSuccess, stopScanner, t]);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const element = document.getElementById(containerId);
      if (element) {
        html5QrCodeRef.current = new Html5Qrcode(containerId);
        
        Html5Qrcode.getCameras().then(devices => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            const backCameraIndex = devices.findIndex(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            if (backCameraIndex !== -1) {
              setCurrentCameraIndex(backCameraIndex);
            }
          } else {
            // No cameras found, try fallback
            startScanner();
          }
        }).catch(err => {
          console.error("Error getting cameras", err);
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || String(err).includes('Permission denied')) {
            setError(t('cameraPermissionDenied'));
          } else {
            // Try fallback anyway
            startScanner();
          }
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [containerId, stopScanner, t]);

  // Start scanner when cameras are loaded or index changes
  useEffect(() => {
    if (cameras.length > 0) {
      startScanner();
    } else if (!isScanning && !error) {
      // Fallback for devices that don't list cameras well
      startScanner();
    }
  }, [cameras.length, currentCameraIndex, startScanner]);

  const toggleFlash = async () => {
    if (!html5QrCodeRef.current || !hasFlash) return;
    try {
      const newState = !isFlashOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: newState }] as any
      });
      setIsFlashOn(newState);
    } catch (err) {
      console.error("Failed to toggle flash", err);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    stopScanner().then(() => {
      setCurrentCameraIndex(nextIndex);
    });
  };

  const handleZoom = async (newZoom: number) => {
    if (!html5QrCodeRef.current) return;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ zoom: newZoom }] as any
      });
      setZoom(newZoom);
    } catch (err) {
      console.error("Failed to apply zoom", err);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playSound('scan');
      onScanSuccess(manualCode.trim());
      setIsManualInputOpen(false);
    }
  };

  const ScannerOverlay = () => (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center overflow-hidden">
      {/* Cutout Box with Shadow Backdrop */}
      <div 
        className={`relative ${isInline ? 'w-full max-w-[280px] h-[180px]' : 'w-72 h-72'} rounded-3xl shadow-[0_0_0_5000px_rgba(0,0,0,0.6)]`}
      >
         {/* Red Laser Line */}
         <div className="absolute left-0 w-full h-0.5 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,1)] animate-scan-line z-20"></div>

         {/* Success Flash */}
         <AnimatePresence>
           {successFlash && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-emerald-500/20 z-30 flex items-center justify-center backdrop-blur-[1px]"
             >
               <div className="bg-white rounded-full p-3 shadow-xl">
                 <Scan className="w-8 h-8 text-emerald-600" />
               </div>
             </motion.div>
           )}
         </AnimatePresence>
      </div>
      
      {/* Bottom Text Overlay */}
      {!isInline && (
        <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center z-20">
          <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-xl mb-6">
            <p className="text-white text-sm font-medium tracking-wide flex items-center gap-2">
              <Scan className="w-4 h-4 text-brand-400" />
              {t('barcodeScannerPrompt')}
            </p>
          </div>
          
          <button 
            onClick={() => setIsManualInputOpen(true)}
            className="text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors underline underline-offset-4 pointer-events-auto"
          >
            {t('manualEntry') || 'MANUAL ENTRY'}
          </button>
        </div>
      )}
    </div>
  );

  if (isInline) {
    return (
      <div className="relative mt-2 border-2 border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden bg-black aspect-video">
        <div id={containerId} className="w-full h-full"></div>
        <ScannerOverlay />
        
        {/* Inline Controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
          {hasFlash && (
            <button 
              onClick={toggleFlash}
              className={`p-3 rounded-2xl backdrop-blur-md transition-all active:scale-90 ${isFlashOn ? 'bg-brand-500 text-white' : 'bg-white/20 text-white'}`}
            >
              {isFlashOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}
          {cameras.length > 1 && (
            <button 
              onClick={switchCamera}
              className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white transition-all active:scale-90"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
            <div className="text-white">
              <p className="text-sm font-bold mb-4">{error}</p>
              <button onClick={() => startScanner()} className="px-4 py-2 bg-brand-600 rounded-xl text-xs font-bold uppercase tracking-wider">
                {t('retry') || 'Retry'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Scan className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-black text-lg tracking-tight">{t('barcodeScannerPrompt')}</h3>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-90"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        <div id={containerId} className="w-full h-full object-cover"></div>
        <ScannerOverlay />
      </div>

      {/* Footer Controls */}
      <div className="p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-8 z-20">
        {maxZoom > 1 && (
          <div className="w-full max-w-xs flex items-center gap-4">
            <Minimize className="w-4 h-4 text-white/60" />
            <input 
              type="range" 
              min="1" 
              max={maxZoom} 
              step="0.1" 
              value={zoom} 
              onChange={(e) => handleZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <Maximize className="w-4 h-4 text-white/60" />
          </div>
        )}

        <div className="flex items-center gap-6">
          {hasFlash && (
            <button 
              onClick={toggleFlash}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl backdrop-blur-md transition-all active:scale-90 ${isFlashOn ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/40' : 'bg-white/10 text-white'}`}
              title={t('toggleFlashlight')}
            >
              {isFlashOn ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="w-20 h-20 flex items-center justify-center rounded-3xl bg-white text-slate-900 shadow-2xl transition-all active:scale-90"
          >
            <X className="w-8 h-8" />
          </button>

          {cameras.length > 1 && (
            <button 
              onClick={switchCamera}
              className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md transition-all active:scale-90"
              title={t('switchCamera')}
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 p-8 text-center">
          <div className="max-w-xs">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-rose-500" />
            </div>
            <h4 className="text-white text-xl font-bold mb-2">{t('barcodeScannerError')}</h4>
            <p className="text-white/60 text-sm mb-8">{error}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => startScanner()} 
                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
              >
                {t('retry') || 'Retry'}
              </button>
              <button 
                onClick={() => setIsManualInputOpen(true)}
                className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest backdrop-blur-md active:scale-95 transition-all"
              >
                {t('manualEntry') || 'Manual Entry'}
              </button>
              <button 
                onClick={onClose} 
                className="w-full py-4 bg-transparent text-white/40 rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      <AnimatePresence>
        {isManualInputOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl"
            >
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('manualEntry') || 'Manual Entry'}</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 font-medium">{t('enterBarcodeManually') || 'Enter the product barcode number below'}</p>
              
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <input 
                  type="text" 
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="000000000000"
                  className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-xl font-mono text-center tracking-[0.2em] focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                  autoFocus
                />
                
                <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                  >
                    {t('confirm') || 'Confirm'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsManualInputOpen(false)}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        #${containerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #${containerId} {
          background: black !important;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
