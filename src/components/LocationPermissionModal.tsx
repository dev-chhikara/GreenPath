import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  Leaf,
  Award,
  AlertCircle,
  X,
  Compass,
} from 'lucide-react';
import { BrandLogoSvg } from './BrandLogo';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
  isLocating: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
  onChooseManually?: () => void;
  isDark?: boolean;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onRequestPermission,
  isLocating,
  permissionStatus,
  onChooseManually,
  isDark = true,
}) => {
  const [hasDeclinedOnce, setHasDeclinedOnce] = useState(false);

  if (!isOpen) return null;

  const bgModal = isDark
    ? 'bg-[#0b131a] text-zinc-100 border-zinc-800'
    : 'bg-white text-slate-900 border-slate-200';

  const cardSurface = isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-7 overflow-hidden transition-all ${bgModal}`}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          aria-label="Close location dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon + Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Compass className="w-8 h-8 text-emerald-400 animate-spin-slow" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
              <MapPin className="w-3.5 h-3.5 fill-black stroke-black" />
            </div>
          </div>

          <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            Precision Eco Navigation
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Enable Location Access?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-xs">
            GreenPath AI uses your real-time position to map low-AQI corridors and verify eco-commute points.
          </p>
        </div>

        {/* Value Proposition Cards */}
        <div className="space-y-2.5 mb-6">
          <div className={`p-3 rounded-2xl border flex items-start gap-3 ${cardSurface}`}>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 flex-shrink-0 mt-0.5">
              <Navigation className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">Instant Origin Placement</div>
              <div className="text-[11px] text-zinc-400 leading-snug">
                Instantly detects your departure street or transit hub without manual search typing.
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border flex items-start gap-3 ${cardSurface}`}>
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 flex-shrink-0 mt-0.5">
              <Leaf className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">Hyper-Local AQI Corridors</div>
              <div className="text-[11px] text-zinc-400 leading-snug">
                Compares roadside smog against nearby tree canopies and green bio-buffers along your path.
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border flex items-start gap-3 ${cardSurface}`}>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 flex-shrink-0 mt-0.5">
              <Award className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">Verified EcoPoints & Badges</div>
              <div className="text-[11px] text-zinc-400 leading-snug">
                Verifies genuine start and arrival milestones to credit your carbon savings and rewards.
              </div>
            </div>
          </div>
        </div>

        {/* Permission Denied Warning Notice if applicable */}
        {permissionStatus === 'denied' && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              Location access is currently blocked in your browser settings. Please click the lock/settings icon in your browser URL bar to allow location, or choose your points directly on the map.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onRequestPermission}
            disabled={isLocating}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Locating Device...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-black stroke-black" />
                <span>Allow Location Access</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setHasDeclinedOnce(true);
              if (onChooseManually) onChooseManually();
              onClose();
            }}
            className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              isDark
                ? 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Choose on Map
          </button>
        </div>

        {/* Privacy Assurance */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Your coordinates are strictly used for in-browser routing and never sold.</span>
        </div>
      </div>
    </div>
  );
};
