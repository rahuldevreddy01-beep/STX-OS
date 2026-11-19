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
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  Zap,
} from 'lucide-react';
import { AMBIENT_TRACKS, ROOT_WEDGE_OPTIONS } from '../data/hudData';
import { AppItem, DeviceTelemetry, QuickToggles, WedgeId } from '../types/hud';
import { hudSound } from '../utils/soundFx';
import { ArcReactorCore } from './ArcReactorCore';
import { CompassRadarDial } from './MicroGauge';
import { TimelineRuler } from './TimelineRuler';

interface LandscapeHubViewProps {
  now: Date;
  greeting: string;
  telemetry: DeviceTelemetry;
  activeWedge: WedgeId;
  onSelectWedge: (wedge: WedgeId, openTool?: boolean) => void;
  apps: AppItem[];
  onLaunchApp: (app: AppItem) => void;
  onOpenSettings: () => void;
  onEnableSensors: () => Promise<boolean>;
  onScanBluetooth: () => Promise<string | null>;
  toggles: QuickToggles;
  onToggleControl: (key: keyof QuickToggles) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  trackIndex: number;
  onStepTrack: (dir: -1 | 1) => void;
  voiceActive: boolean;
  onToggleVoice: () => void;
  pulseTrigger: number;
  notifCount: number;
}

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export const LandscapeHubView: React.FC<LandscapeHubViewProps> = ({
  now,
  greeting,
  telemetry,
  activeWedge,
  onSelectWedge,
  apps,
  onLaunchApp,
  onOpenSettings,
  onEnableSensors,
  onScanBluetooth,
  toggles,
  onToggleControl,
  isPlaying,
  onTogglePlay,
  trackIndex,
  onStepTrack,
  voiceActive,
  onToggleVoice,
  pulseTrigger,
  notifCount,
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
        const next = Math.max(176, Math.min(310, Math.floor(Math.min(w, h) * 0.96)));
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

  const stepGoalPct = Math.min(100, Math.round((telemetry.steps / 10000) * 100));
  const netPct = !toggles.wifi || !telemetry.online ? 0 : Math.min(100, Math.max(25, Math.round(telemetry.downlinkMbps * 4)));

  const toggleItems: {
    key: keyof QuickToggles;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'wifi', label: 'WIFI', icon: <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'bluetooth', label: 'BT', icon: <Bluetooth className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'flashlight', label: 'FLASH', icon: <Flashlight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'lock', label: 'LOCK', icon: <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
    { key: 'sync', label: 'WAKE', icon: <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> },
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

      <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden hud-scroll px-2.5 sm:px-4 pb-2 pt-1">
        <div className="min-h-full sm:h-full flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
          {/* CENTERPIECE: ROTARY DIAL */}
          <main className="order-1 sm:order-2 sm:col-span-6 relative flex flex-col items-center justify-between min-h-[245px] sm:min-h-0 py-0.5">
            <div className="flex items-center gap-2 z-10 shrink-0">
              <span className="font-mono-hud text-[9px] tracking-[0.2em] text-[#FF2A4B]">
                {activeConfig.shortCode}
              </span>
              <span className="font-display text-[10px] sm:text-xs font-bold tracking-[0.18em] text-[#E6F8FF] text-glow-cyan">
                {activeConfig.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  hudSound.playChime();
                  onSelectWedge('APPS', true);
                }}
                className="px-2 py-0.5 border border-[#00F0FF]/45 bg-[#040A12] hover:border-[#00F0FF] font-mono-hud text-[8.5px] tracking-[0.14em] text-[#9FEFFF] cursor-pointer"
              >
                {apps.length} APPS 3D
              </button>
            </div>

            <div
              ref={dialWrapRef}
              className="relative flex items-center justify-center flex-1 w-full min-h-[190px] sm:min-h-0 py-0.5"
            >
              <ArcReactorCore
                variant="rotary-hub"
                options={ROOT_WEDGE_OPTIONS}
                activeOptionId={activeWedge}
                onSelectOption={(id, open) => onSelectWedge(id as WedgeId, open)}
                size={dialSize}
                pulseTrigger={pulseTrigger}
                apps={apps}
                onLaunchApp={onLaunchApp}
                toggles={toggles}
                onToggleControl={onToggleControl}
                onOpenSettings={onOpenSettings}
                pitchDeg={telemetry.pitchDeg}
                rollDeg={telemetry.rollDeg}
                voiceActive={voiceActive}
                notifCount={notifCount}
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

          {/* LEFT SIDEBAR (01) — REAL DEVICE BATTERY, NETWORK, STEPS & GYRO COMPASS */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="order-2 sm:order-1 sm:col-span-3 flex flex-col justify-between border-t sm:border-t-0 sm:border-r border-[#00F0FF]/15 pt-2 sm:pt-1 sm:pr-3 sm:py-1 sm:min-h-0 sm:overflow-y-auto hud-scroll gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono-hud text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#00F0FF]">
                    01
                  </span>
                  <span className="font-mono-hud text-[8px] px-1 border border-[#00F0FF]/35 text-[#00F0FF]">
                    {telemetry.cpuCores}C
                  </span>
                </div>
                <h2 className="font-display text-xs sm:text-sm font-bold tracking-[0.08em] text-[#E6F8FF] text-glow-cyan mt-0.5 leading-snug truncate">
                  {greeting}, SANJU
                </h2>
                <p className="font-mono-hud text-[8.5px] text-[#00F0FF]/80 mt-0.5 truncate">
                  {telemetry.isCharging ? '⚡ CHARGING' : '• BATTERY'} · {telemetry.batteryPct}%
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="OS Settings"
                  className="p-1.5 border border-[#00F0FF]/45 bg-[#040A12] hover:border-[#00F0FF] text-[#00F0FF] cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playChime();
                    onSelectWedge('STX', true);
                  }}
                  className="sm:hidden flex items-center gap-1 px-2 py-1 border border-[#00F0FF]/50 bg-[#00F0FF]/15 font-mono-hud text-[9px] text-[#00F0FF] cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>STX</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div>
                <div className="flex justify-between font-mono-hud text-[8px] sm:text-[8.5px] text-[#E6F8FF]/75 mb-0.5">
                  <span className="flex items-center gap-1">
                    {telemetry.isCharging && <Zap className="w-2.5 h-2.5 text-[#00F0FF]" />}
                    BATTERY
                  </span>
                  <span className="text-[#00F0FF]">
                    {telemetry.batteryPct}% {telemetry.isCharging ? 'CHG' : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-[#071620] overflow-hidden">
                  <div
                    className={`h-full ${telemetry.batteryPct < 20 ? 'bg-[#FF2A4B]' : 'bg-[#00F0FF]'}`}
                    style={{ width: `${telemetry.batteryPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-mono-hud text-[8px] sm:text-[8.5px] text-[#E6F8FF]/75 mb-0.5">
                  <span>NET LINK</span>
                  <span className={toggles.wifi && telemetry.online ? 'text-[#00F0FF]' : 'text-[#FF2A4B]'}>
                    {toggles.wifi && telemetry.online
                      ? `${telemetry.netType} ${telemetry.downlinkMbps}M`
                      : 'OFFLINE'}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1B0910] overflow-hidden">
                  <div
                    className="h-full bg-[#FF2A4B]"
                    style={{ width: `${Math.max(4, netPct)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  hudSound.playDetentClick();
                  onSelectWedge('HEALTH', true);
                }}
                className="w-full text-left cursor-pointer group"
              >
                <div className="flex justify-between font-mono-hud text-[8px] sm:text-[8.5px] text-[#E6F8FF]/75 mb-0.5">
                  <span className="group-hover:text-[#00F0FF]">STEPS (SENSOR)</span>
                  <span className="text-[#E6F8FF] font-bold tabular-nums">
                    {telemetry.steps.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-[#071620] overflow-hidden">
                  <div className="h-full bg-[#E6F8FF]/85" style={{ width: `${Math.max(4, stepGoalPct)}%` }} />
                </div>
              </button>
            </div>

            <div className="pt-1.5 border-t border-[#00F0FF]/15 flex items-center justify-between gap-2">
              <CompassRadarDial headingDeg={telemetry.headingDeg} size={42} />
              <div className="flex flex-col items-end gap-1 shrink-0">
                {telemetry.sensorNeedsPermission && !telemetry.gyroActive ? (
                  <button
                    type="button"
                    onClick={() => onEnableSensors()}
                    className="px-2 py-0.5 border border-[#FF2A4B]/60 bg-[#FF2A4B]/15 font-mono-hud text-[8px] text-[#FFB4C0] cursor-pointer"
                  >
                    ENABLE GYRO
                  </button>
                ) : (
                  <span className="font-mono-hud text-[8px] text-[#9FEFFF]">
                    P:{telemetry.pitchDeg}° R:{telemetry.rollDeg}°
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playChime();
                    onSelectWedge('BRIEF', true);
                  }}
                  className="px-2 py-0.5 border border-[#00F0FF]/35 bg-[#040A12] hover:border-[#00F0FF] font-mono-hud text-[8px] tracking-wider text-[#9FEFFF] cursor-pointer"
                >
                  BRIEFING
                </button>
              </div>
            </div>
          </motion.aside>

          {/* RIGHT SIDEBAR (02) — REAL UPTIME, REAL WIFI/BT/FLASH/WAKE/MUTE CONTROLS */}
          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="order-3 sm:col-span-3 flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-[#00F0FF]/15 pt-2 sm:pt-1 sm:pl-3 sm:py-1 sm:min-h-0 sm:overflow-y-auto hud-scroll gap-2"
          >
            <div className="text-right">
              <div className="flex items-center justify-between">
                <span className="font-mono-hud text-[9px] text-[#00F0FF]/80">
                  {telemetry.wakeLockActive ? 'WAKE LOCKED' : '31°C CLEAR'}
                </span>
                <span className="font-mono-hud text-xs sm:text-sm font-bold text-[#E6F8FF]">{timeStr}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono-hud text-[8.5px] sm:text-[9px] tracking-[0.18em] text-[#FF2A4B]">
                  UPTIME
                </span>
                <span className="font-mono-hud text-[11px] sm:text-xs font-bold tracking-[0.2em] text-[#00F0FF]">
                  02
                </span>
              </div>
              <div className="font-mono-hud text-sm sm:text-base font-bold tracking-[0.14em] text-[#E6F8FF] text-glow-cyan mt-0.5 tabular-nums">
                {formatUptime(telemetry.uptimeSec)}
              </div>
              <div className="font-mono-hud text-[8px] text-[#9FEFFF]/70 truncate">
                BT: {telemetry.btStatus}
              </div>
            </div>

            <div>
              <div className="font-mono-hud text-[8px] sm:text-[8.5px] tracking-[0.14em] text-[#E6F8FF]/55 mb-1.5 flex items-center justify-between gap-1">
                <span>SYSTEM</span>
                <button
                  type="button"
                  onClick={() => onScanBluetooth()}
                  className="px-1.5 py-0.5 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/15 text-[7.5px] cursor-pointer"
                >
                  {telemetry.btScanning ? 'SCAN...' : 'PAIR BT'}
                </button>
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
