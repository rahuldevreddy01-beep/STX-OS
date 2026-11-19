import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bluetooth,
  Flashlight,
  Lock,
  Mic,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react';
import { AMBIENT_TRACKS, ROOT_WEDGE_OPTIONS } from '../data/hudData';
import { QuickToggles, WedgeId } from '../types/hud';
import { hudSound } from '../utils/soundFx';
import { ArcReactorCore } from './ArcReactorCore';
import { CompassRadarDial } from './MicroGauge';
import { TimelineRuler } from './TimelineRuler';

interface LandscapeHubViewProps {
  now: Date;
  greeting: string;
  batteryPct: number;
  memPct: number;
  telemetryCode: string;
  activeWedge: WedgeId;
  onSelectWedge: (wedge: WedgeId, openTool?: boolean) => void;
  toggles: QuickToggles;
  onToggleControl: (key: keyof QuickToggles) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  trackIndex: number;
  onStepTrack: (dir: -1 | 1) => void;
  voiceActive: boolean;
  onToggleVoice: () => void;
  pulseTrigger: number;
}

export const LandscapeHubView: React.FC<LandscapeHubViewProps> = ({
  now,
  greeting,
  batteryPct,
  memPct,
  telemetryCode,
  activeWedge,
  onSelectWedge,
  toggles,
  onToggleControl,
  isPlaying,
  onTogglePlay,
  trackIndex,
  onStepTrack,
  voiceActive,
  onToggleVoice,
  pulseTrigger,
}) => {
  const dialWrapRef = useRef<HTMLDivElement | null>(null);
  const [dialSize, setDialSize] = useState(248);

  useEffect(() => {
    const el = dialWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        const next = Math.max(150, Math.min(264, Math.floor(Math.min(w, h) * 0.94)));
        setDialSize(next);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const activeConfig = ROOT_WEDGE_OPTIONS.find((w) => w.id === activeWedge) ?? ROOT_WEDGE_OPTIONS[0];
  const currentTrack = AMBIENT_TRACKS[trackIndex % AMBIENT_TRACKS.length];

  const toggleItems: {
    key: keyof QuickToggles;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'wifi', label: 'WIFI', icon: <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'bluetooth', label: 'BT', icon: <Bluetooth className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'flashlight', label: 'FLASH', icon: <Flashlight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'lock', label: 'LOCK', icon: <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'sync', label: 'SYNC', icon: <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    {
      key: 'mute',
      label: 'MUTE',
      icon: toggles.mute ? (
        <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
      ) : (
        <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
      ),
    },
  ];

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      <div className="shrink-0">
        <TimelineRuler now={now} compact />
      </div>

      {/* Responsive Hub Container: stacked scroll on narrow portrait, 3-column tactical HUD on landscape/tablet+ */}
      <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden hud-scroll px-2.5 sm:px-4 pb-2 pt-1">
        <div className="min-h-full sm:h-full flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
          {/* CENTERPIECE FIRST ON MOBILE PORTRAIT, MIDDLE COLUMN ON LANDSCAPE */}
          <main className="order-1 sm:order-2 sm:col-span-6 relative flex flex-col items-center justify-between min-h-[250px] sm:min-h-0 py-0.5">
            {/* Passive Active Readout — No separate OPEN button needed; click any wedge on dial */}
            <div className="flex items-center gap-2 z-10 shrink-0">
              <span className="font-mono-hud text-[9px] tracking-[0.2em] text-[#FF2A4B]">
                [{activeConfig.shortCode}]
              </span>
              <span className="font-display text-[10px] sm:text-xs font-bold tracking-[0.18em] text-[#E6F8FF] text-glow-cyan">
                {activeConfig.label}
              </span>
              <span className="hidden md:inline font-mono-hud text-[8.5px] tracking-[0.14em] text-[#00F0FF]/65">
                · CLICK WEDGE TO OPEN
              </span>
            </div>

            <div
              ref={dialWrapRef}
              className="relative flex items-center justify-center flex-1 w-full min-h-[168px] sm:min-h-0 py-1"
            >
              <ArcReactorCore
                variant="rotary-hub"
                options={ROOT_WEDGE_OPTIONS}
                activeOptionId={activeWedge}
                onSelectOption={(id, open) => onSelectWedge(id as WedgeId, open)}
                size={dialSize}
                pulseTrigger={pulseTrigger}
              />
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 z-10 bg-[#03060B]/90 border border-[#00F0FF]/25 px-2.5 sm:px-3 py-1 shrink-0 max-w-full">
              <button
                type="button"
                onClick={onToggleVoice}
                title="Voice Command"
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-transform cursor-pointer shrink-0 ${
                  voiceActive
                    ? 'bg-[#FF2A4B] border-white text-white shadow-[0_0_12px_#FF2A4B] scale-105'
                    : 'bg-[#FF2A4B]/20 border-[#FF2A4B] text-[#FF2A4B] hover:bg-[#FF2A4B]/35'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 sm:gap-1.5 border-l border-[#00F0FF]/20 pl-2">
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playDetentClick();
                    onStepTrack(-1);
                  }}
                  aria-label="Previous track"
                  className="p-1 text-[#00F0FF] hover:text-white cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playDetentClick();
                    onTogglePlay();
                  }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-1 border border-[#00F0FF]/45 text-[#E6F8FF] hover:bg-[#00F0FF]/20 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playDetentClick();
                    onStepTrack(1);
                  }}
                  aria-label="Next track"
                  className="p-1 text-[#00F0FF] hover:text-white cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="font-mono-hud text-[8.5px] text-[#E6F8FF]/75 tracking-wider max-w-[110px] sm:max-w-[130px] truncate">
                {currentTrack.title}
              </span>
            </div>
          </main>

          {/* LEFT SIDEBAR (01) */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="order-2 sm:order-1 sm:col-span-3 flex flex-col justify-between border-t sm:border-t-0 sm:border-r border-[#00F0FF]/15 pt-2 sm:pt-1 sm:pr-3 sm:py-1 sm:min-h-0 sm:overflow-y-auto hud-scroll gap-2"
          >
            <div className="flex sm:block items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono-hud text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#00F0FF]">
                  01
                </span>
                <h2 className="font-display text-xs sm:text-sm font-bold tracking-[0.08em] text-[#E6F8FF] text-glow-cyan mt-0.5 leading-snug truncate">
                  {greeting}, SANJU
                </h2>
                <p className="font-mono-hud text-[8.5px] sm:text-[9px] text-[#00F0FF]/80 mt-0.5 truncate">
                  • STX AI READY · LOCAL
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  hudSound.playChime();
                  onSelectWedge('STX', true);
                }}
                className="sm:hidden flex items-center gap-1 px-2 py-1 border border-[#00F0FF]/50 bg-[#00F0FF]/15 font-mono-hud text-[9px] text-[#00F0FF] shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>STX AI</span>
              </button>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div>
                <div className="flex justify-between font-mono-hud text-[8px] sm:text-[8.5px] text-[#E6F8FF]/70 mb-0.5">
                  <span>CORE POWER</span>
                  <span className="text-[#00F0FF]">{batteryPct}%</span>
                </div>
                <div className="h-1.5 bg-[#071620] overflow-hidden">
                  <div className="h-full bg-[#00F0FF] glow-cyan" style={{ width: `${batteryPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-mono-hud text-[8px] sm:text-[8.5px] text-[#E6F8FF]/70 mb-0.5">
                  <span>RF SIGNAL</span>
                  <span className="text-[#FF2A4B]">{toggles.wifi ? '96%' : 'OFF'}</span>
                </div>
                <div className="h-1.5 bg-[#1B0910] overflow-hidden">
                  <div
                    className="h-full bg-[#FF2A4B] glow-crimson"
                    style={{ width: toggles.wifi ? '96%' : '6%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-mono-hud text-[8px] sm:text-[8.5px] text-[#E6F8FF]/70 mb-0.5">
                  <span>MEM ALLOC</span>
                  <span>{memPct}%</span>
                </div>
                <div className="h-1.5 bg-[#071620] overflow-hidden">
                  <div className="h-full bg-[#E6F8FF]/80" style={{ width: `${memPct}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#00F0FF]/15 flex items-center justify-between gap-2">
              <CompassRadarDial headingDeg={225 + (now.getSeconds() % 12)} size={42} />
              <button
                type="button"
                onClick={() => {
                  hudSound.playChime();
                  onSelectWedge('BRIEF', true);
                }}
                className="px-2 py-1 border border-[#00F0FF]/35 bg-[#040A12] hover:border-[#00F0FF] font-mono-hud text-[8.5px] tracking-wider text-[#9FEFFF] cursor-pointer shrink-0"
              >
                BRIEFING
              </button>
            </div>
          </motion.aside>

          {/* RIGHT SIDEBAR (02) */}
          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="order-3 sm:col-span-3 flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-[#00F0FF]/15 pt-2 sm:pt-1 sm:pl-3 sm:py-1 sm:min-h-0 sm:overflow-y-auto hud-scroll gap-2"
          >
            <div className="text-right">
              <div className="flex items-center justify-between">
                <span className="font-mono-hud text-[9px] text-[#E6F8FF]/60">31°C</span>
                <span className="font-mono-hud text-xs sm:text-sm font-bold text-[#E6F8FF]">{timeStr}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono-hud text-[8.5px] sm:text-[9px] tracking-[0.2em] text-[#FF2A4B]">
                  UPTIME
                </span>
                <span className="font-mono-hud text-[11px] sm:text-xs font-bold tracking-[0.2em] text-[#00F0FF]">
                  02
                </span>
              </div>
              <div className="font-mono-hud text-sm sm:text-base font-bold tracking-[0.12em] text-[#E6F8FF] text-glow-cyan mt-0.5 tabular-nums truncate">
                {telemetryCode}
              </div>
            </div>

            <div>
              <div className="font-mono-hud text-[8px] sm:text-[8.5px] tracking-[0.18em] text-[#E6F8FF]/55 mb-1.5 flex justify-between">
                <span>SYSTEM</span>
                <span className="text-[#00F0FF]">6 CH</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">
                {toggleItems.map((item) => {
                  const active = toggles[item.key];
                  const isAlertStyle = item.key === 'lock' || item.key === 'mute';
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onToggleControl(item.key)}
                      className={`flex items-center justify-between gap-1 px-2 py-1.5 border font-mono-hud text-[8.5px] sm:text-[9px] tracking-wider transition-colors cursor-pointer ${
                        active
                          ? isAlertStyle
                            ? 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-[#FFE5EA]'
                            : 'border-[#00F0FF] bg-[#00F0FF]/18 text-[#E6F8FF]'
                          : 'border-[#00F0FF]/20 bg-[#050910]/75 text-[#E6F8FF]/50 hover:border-[#00F0FF]/50'
                      }`}
                    >
                      {item.icon}
                      <span className="font-bold truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
};
