import React from 'react';
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
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const activeConfig = ROOT_WEDGE_OPTIONS.find((w) => w.id === activeWedge) ?? ROOT_WEDGE_OPTIONS[0];
  const currentTrack = AMBIENT_TRACKS[trackIndex % AMBIENT_TRACKS.length];

  const toggleItems: {
    key: keyof QuickToggles;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'wifi', label: 'WIFI', icon: <Wifi className="w-3.5 h-3.5" /> },
    { key: 'bluetooth', label: 'BT', icon: <Bluetooth className="w-3.5 h-3.5" /> },
    { key: 'flashlight', label: 'FLASH', icon: <Flashlight className="w-3.5 h-3.5" /> },
    { key: 'lock', label: 'LOCK', icon: <Lock className="w-3.5 h-3.5" /> },
    { key: 'sync', label: 'SYNC', icon: <RefreshCw className="w-3.5 h-3.5" /> },
    {
      key: 'mute',
      label: 'MUTE',
      icon: toggles.mute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      <div className="shrink-0">
        <TimelineRuler now={now} />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-2 px-4 pb-2.5 pt-1 items-stretch">
        {/* LEFT SIDEBAR (01) */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          className="col-span-3 flex flex-col justify-between border-r border-[#00F0FF]/15 pr-3 py-1"
        >
          <div>
            <span className="font-mono-hud text-xs font-bold tracking-[0.2em] text-[#00F0FF]">
              01
            </span>
            <h2 className="font-display text-xs sm:text-sm font-bold tracking-[0.08em] text-[#E6F8FF] text-glow-cyan mt-1 leading-snug">
              {greeting}, SANJU
            </h2>
            <p className="font-mono-hud text-[9px] text-[#00F0FF]/80 mt-0.5 truncate">
              • STX AI READY · LOCAL
            </p>
          </div>

          <div className="space-y-2 my-2">
            <div>
              <div className="flex justify-between font-mono-hud text-[8.5px] text-[#E6F8FF]/70 mb-0.5">
                <span>CORE POWER</span>
                <span className="text-[#00F0FF]">{batteryPct}%</span>
              </div>
              <div className="h-1.5 bg-[#071620] overflow-hidden">
                <div className="h-full bg-[#00F0FF] glow-cyan" style={{ width: `${batteryPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-mono-hud text-[8.5px] text-[#E6F8FF]/70 mb-0.5">
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
              <div className="flex justify-between font-mono-hud text-[8.5px] text-[#E6F8FF]/70 mb-0.5">
                <span>MEM ALLOC</span>
                <span>{memPct}%</span>
              </div>
              <div className="h-1.5 bg-[#071620] overflow-hidden">
                <div className="h-full bg-[#E6F8FF]/80" style={{ width: `${memPct}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-[#00F0FF]/15">
            <CompassRadarDial headingDeg={225 + (now.getSeconds() % 12)} size={48} />
          </div>
        </motion.aside>

        {/* CENTERPIECE: ROTARY WEDGE SELECTOR */}
        <main className="col-span-6 relative flex flex-col items-center justify-between py-0.5">
          <div className="flex items-center gap-2.5 z-10">
            <span className="font-mono-hud text-[9px] tracking-[0.2em] text-[#FF2A4B]">
              [{activeConfig.shortCode}]
            </span>
            <button
              type="button"
              onClick={() => {
                hudSound.playChime();
                onSelectWedge(activeWedge, true);
              }}
              className="px-3 py-0.5 border border-[#00F0FF]/55 bg-[#00F0FF]/12 hover:bg-[#00F0FF]/25 font-display text-[10px] font-bold tracking-[0.18em] text-[#E6F8FF] transition-colors cursor-pointer"
            >
              OPEN {activeConfig.label}
            </button>
          </div>

          <motion.div
            layoutId="stark-rotary-dial"
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className="relative flex items-center justify-center flex-1 min-h-0"
          >
            <ArcReactorCore
              variant="rotary-hub"
              options={ROOT_WEDGE_OPTIONS}
              activeOptionId={activeWedge}
              onSelectOption={(id, open) => onSelectWedge(id as WedgeId, open)}
              size={256}
              pulseTrigger={pulseTrigger}
            />
          </motion.div>

          <div className="flex items-center gap-3 z-10 bg-[#03060B]/85 border border-[#00F0FF]/25 px-3 py-1">
            <button
              type="button"
              onClick={onToggleVoice}
              title="Voice Command"
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                voiceActive
                  ? 'bg-[#FF2A4B] border-white text-white shadow-[0_0_14px_#FF2A4B] scale-110'
                  : 'bg-[#FF2A4B]/20 border-[#FF2A4B] text-[#FF2A4B] hover:bg-[#FF2A4B]/35'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 border-l border-[#00F0FF]/20 pl-2.5">
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

            <span className="hidden md:inline font-mono-hud text-[8.5px] text-[#E6F8FF]/70 tracking-wider max-w-[130px] truncate">
              {currentTrack.title}
            </span>
          </div>
        </main>

        {/* RIGHT SIDEBAR (02) */}
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          className="col-span-3 flex flex-col justify-between border-l border-[#00F0FF]/15 pl-3 py-1"
        >
          <div className="text-right">
            <div className="flex items-center justify-between">
              <span className="font-mono-hud text-[9px] text-[#E6F8FF]/60">31°C</span>
              <span className="font-mono-hud text-sm font-bold text-[#E6F8FF]">{timeStr}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-mono-hud text-[9px] tracking-[0.2em] text-[#FF2A4B]">
                UPTIME
              </span>
              <span className="font-mono-hud text-xs font-bold tracking-[0.2em] text-[#00F0FF]">
                02
              </span>
            </div>
            <div className="font-mono-hud text-base sm:text-lg font-bold tracking-[0.14em] text-[#E6F8FF] text-glow-cyan mt-0.5 tabular-nums">
              {telemetryCode}
            </div>
          </div>

          <div>
            <div className="font-mono-hud text-[8.5px] tracking-[0.18em] text-[#E6F8FF]/55 mb-1.5 flex justify-between">
              <span>SYSTEM</span>
              <span className="text-[#00F0FF]">6 CH</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {toggleItems.map((item) => {
                const active = toggles[item.key];
                const isAlertStyle = item.key === 'lock' || item.key === 'mute';
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onToggleControl(item.key)}
                    className={`flex items-center justify-between px-2 py-1.5 border font-mono-hud text-[9px] tracking-wider transition-all cursor-pointer ${
                      active
                        ? isAlertStyle
                          ? 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-[#FFE5EA] shadow-[0_0_8px_rgba(255,42,75,0.35)]'
                          : 'border-[#00F0FF] bg-[#00F0FF]/18 text-[#E6F8FF] shadow-[0_0_8px_rgba(0,240,255,0.28)]'
                        : 'border-[#00F0FF]/20 bg-[#050910]/75 text-[#E6F8FF]/50 hover:border-[#00F0FF]/50'
                    }`}
                  >
                    {item.icon}
                    <span className="font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
};
