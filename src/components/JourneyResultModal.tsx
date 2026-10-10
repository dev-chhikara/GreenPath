import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Leaf,
  ShieldAlert,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { JourneyRecord } from '../services/auth';

interface JourneyResultModalProps {
  journeyResult: JourneyRecord | null;
  onClose: () => void;
  onOpenWallet: () => void;
  theme: 'dark' | 'light';
}

export function JourneyResultModal({
  journeyResult,
  onClose,
  onOpenWallet,
  theme,
}: JourneyResultModalProps) {
  useEffect(() => {
    if (journeyResult?.isVerified) {
      // Fire confetti celebration
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#38bdf8', '#fbbf24'],
        });
      } catch (e) {
        console.warn('Confetti error', e);
      }
    }
  }, [journeyResult]);

  if (!journeyResult) return null;

  const panelBg =
    theme === 'dark'
      ? 'bg-[#090d16] text-zinc-100 border border-zinc-800'
      : 'bg-white text-slate-800 border border-slate-200 shadow-2xl';

  const cardBg =
    theme === 'dark'
      ? 'bg-black/40 border-zinc-800/80'
      : 'bg-slate-50 border-slate-200';

  const actualMinutes = Math.floor(journeyResult.actualDurationSeconds / 60);
  const actualSeconds = journeyResult.actualDurationSeconds % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className={`w-full max-w-lg ${panelBg} rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95`}>
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          {journeyResult.isVerified ? (
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
              <Award className="h-8 w-8 stroke-[2]" />
            </div>
          ) : (
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
              <ShieldAlert className="h-8 w-8 stroke-[2]" />
            </div>
          )}

          <h3 className="text-lg font-semibold tracking-tight">
            {journeyResult.isVerified ? 'Commute Verified & Points Claimed! 🎉' : 'Journey Invalid — No Points Awarded'}
          </h3>

          <p className="text-xs text-zinc-400 font-light max-w-sm mx-auto">
            {journeyResult.verificationReason}
          </p>
        </div>

        {/* Big Points Badge (if verified) */}
        {journeyResult.isVerified ? (
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 text-center space-y-1 shadow-inner">
            <span className="text-[10px] uppercase font-light tracking-[0.2em] text-emerald-400">
              Clean Air Reward
            </span>
            <div className="text-3xl font-light font-metallic text-emerald-300">
              +{journeyResult.pointsEarned} EcoPoints
            </div>
            <div className="text-xs text-teal-400/90 font-light">
              Avoided {journeyResult.co2SavedGrams}g CO₂ & -{journeyResult.aqiSavedPercent}% toxic particulate inhalation
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>Anti-Spoof Verification Failed</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              To keep the carbon offset pool fair, EcoPoints are only granted when the journey duration is within realistic transit speed thresholds and arrival coordinates match the intended destination.
            </p>
          </div>
        )}

        {/* Journey Diagnostics Breakdown */}
        <div className={`p-3.5 rounded-2xl border ${cardBg} space-y-2.5 text-xs`}>
          <div className="text-[10px] uppercase font-light tracking-[0.18em] text-zinc-400">
            Commute Diagnostics:
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={`p-2 rounded-xl ${cardBg} border`}>
              <span className="text-[10px] text-zinc-400 block font-light">Actual Time</span>
              <span className="font-metallic text-sm font-light">
                {actualMinutes}m {actualSeconds}s
              </span>
            </div>

            <div className={`p-2 rounded-xl ${cardBg} border`}>
              <span className="text-[10px] text-zinc-400 block font-light">Expected Time</span>
              <span className="font-metallic text-sm font-light">
                {journeyResult.expectedDurationMinutes} mins
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-cyan-400" /> Origin:
              </span>
              <span className="font-medium truncate max-w-[200px]">{journeyResult.originAddress.split(',')[0]}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-emerald-400" /> Destination:
              </span>
              <span className="font-medium truncate max-w-[200px]">{journeyResult.destinationAddress.split(',')[0]}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Corridor Route:</span>
              <span className="font-medium">
                {journeyResult.routeType === 'route-b' ? 'GreenPath Clean Bio-Corridor' : 'Highway Arterial'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {journeyResult.isVerified ? (
            <button
              onClick={() => {
                onClose();
                onOpenWallet();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-semibold text-xs tracking-wide shadow-md transition-all active:scale-[0.98]"
            >
              <span>View Rewards Wallet</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs tracking-wide transition-all"
            >
              <span>Understood</span>
            </button>
          )}

          <button
            onClick={onClose}
            className={`py-2.5 px-4 rounded-xl ${cardBg} text-xs text-zinc-400 hover:text-white border transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
