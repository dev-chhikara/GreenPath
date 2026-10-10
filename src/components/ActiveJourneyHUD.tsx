import React, { useState, useEffect } from 'react';
import {
  Timer,
  CheckCircle2,
  Navigation,
  MapPin,
  ExternalLink,
  Flag,
  X,
  Sparkles,
  Zap,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

export interface ActiveJourneyState {
  routeTitle: string;
  originAddress: string;
  destinationAddress: string;
  originCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  expectedMinutes: number;
  distanceKm: number;
  routeType: 'route-a' | 'route-b';
  co2SavedGrams: number;
  potentialPoints: number;
  startedAt: number; // timestamp
  googleMapsUrl: string;
}

interface ActiveJourneyHUDProps {
  journey: ActiveJourneyState;
  onFinishJourney: (actualSeconds: number, simulatedNearDestination: boolean) => void;
  onCancelJourney: () => void;
  theme: 'dark' | 'light';
}

export function ActiveJourneyHUD({
  journey,
  onFinishJourney,
  onCancelJourney,
  theme,
}: ActiveJourneyHUDProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSimulatedNearDestination, setIsSimulatedNearDestination] = useState(true);

  // Timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const expectedSeconds = journey.expectedMinutes * 60;
  const progressRatio = Math.min(elapsedSeconds / Math.max(expectedSeconds, 1), 1);
  const percentComplete = Math.round(progressRatio * 100);

  // Quick helper to test valid completion without waiting 30 minutes in a real car
  const handleFastForwardToNearArrival = () => {
    // Set timer to 92% of expected time
    setElapsedSeconds(Math.max(Math.round(expectedSeconds * 0.92), 15));
    setIsSimulatedNearDestination(true);
  };

  const panelBg =
    theme === 'dark'
      ? 'bg-[#090d16]/95 border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-2xl'
      : 'bg-white/95 border-slate-200 text-slate-800 shadow-2xl backdrop-blur-2xl';

  const cardBg =
    theme === 'dark'
      ? 'bg-black/40 border-zinc-800/80'
      : 'bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Floating Active Journey Banner */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full animate-in fade-in slide-in-from-top-6">
        <div className={`rounded-3xl border ${panelBg} p-4 shadow-2xl space-y-3`}>
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 font-metallic">
                Route Active in Google Maps
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={journey.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors font-medium"
                title="Switch back to Google Maps navigation tab"
              >
                <span>Google Maps</span>
                <ExternalLink className="h-3 w-3 stroke-[2]" />
              </a>

              <button
                onClick={onCancelJourney}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Cancel active tracking"
              >
                <X className="h-4 w-4 stroke-[1.75]" />
              </button>
            </div>
          </div>

          {/* Route path */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate max-w-[140px] font-medium">{journey.originAddress.split(',')[0]}</span>
              <span className="text-emerald-500">➔</span>
              <span className="truncate max-w-[140px] font-medium">{journey.destinationAddress.split(',')[0]}</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-light flex-shrink-0">
              {journey.distanceKm} km · Est. {journey.expectedMinutes}m
            </span>
          </div>

          {/* Origin verification pill */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/40 border border-emerald-500/30 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 stroke-[2]" />
              <span>Start Location Verified: {journey.originAddress.split(',')[0]}</span>
            </span>
            <span className="text-zinc-400 font-light">GPS Synced</span>
          </div>
        </div>
      </div>

      {/* Bottom Floating Timer & Finish Journey Action */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full animate-in fade-in slide-in-from-bottom-6">
        <div className={`rounded-3xl border ${panelBg} p-4 sm:p-5 shadow-2xl space-y-3.5`}>
          {/* Main Stopwatch Timer */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-light tracking-[0.2em] text-zinc-400 flex items-center gap-1">
                <Timer className="h-3.5 w-3.5 text-emerald-500" />
                <span>Elapsed Commute Time</span>
              </div>
              <div className="text-3xl sm:text-4xl font-light font-metallic tracking-wider text-emerald-500">
                {formatTimer(elapsedSeconds)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-light tracking-[0.2em] text-zinc-400">
                Potential Reward
              </div>
              <div className="text-lg font-semibold text-teal-400 font-metallic">
                +{journey.potentialPoints} EcoPoints
              </div>
              <div className="text-[10px] text-zinc-400">
                +{journey.co2SavedGrams}g CO₂ Saved
              </div>
            </div>
          </div>

          {/* Progress Bar towards expected time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light">
              <span>Time Progress vs Expected ({journey.expectedMinutes} mins)</span>
              <span>{percentComplete}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-black/15 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  percentComplete >= 75 ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          {/* Testing / Demo Helper Toolbar */}
          <div className={`p-2.5 rounded-2xl border ${cardBg} flex items-center justify-between gap-2 text-xs`}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-[11px] text-zinc-400 font-light">
                Testing Verification Mode:
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFastForwardToNearArrival}
                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-medium border border-emerald-500/30 transition-colors"
                title="Fast forward timer to match expected commute duration"
              >
                Fast-Forward Time ({journey.expectedMinutes}m)
              </button>

              <button
                type="button"
                onClick={() => setIsSimulatedNearDestination(!isSimulatedNearDestination)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                  isSimulatedNearDestination
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
                title="Toggle arrival destination perimeter match"
              >
                GPS Dest: {isSimulatedNearDestination ? 'Matched ✓' : 'Far Off ✕'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onFinishJourney(elapsedSeconds, isSimulatedNearDestination)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-semibold text-xs tracking-wide shadow-lg transition-all active:scale-[0.98]"
            >
              <Flag className="h-4 w-4 fill-current stroke-current" />
              <span>Finish Journey & Claim Points</span>
            </button>

            <button
              onClick={onCancelJourney}
              className={`py-3 px-4 rounded-2xl ${cardBg} hover:bg-rose-500/20 hover:text-rose-400 text-xs text-zinc-400 border transition-all`}
              title="Cancel journey"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
