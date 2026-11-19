import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bluetooth,
  Camera,
  ChevronLeft,
  Flashlight,
  FolderLock,
  Globe,
  Grid,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings,
  Signal,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { AMBIENT_TRACKS, ROOT_WEDGE_OPTIONS } from '../data/hudData';
import {
  AppItem,
  BriefingEntry,
  DeviceTelemetry,
  DialOption,
  QuickToggles,
  StxLogEntry,
  WedgeId,
  WifiNetwork,
} from '../types/hud';
import { hudSound } from '../utils/soundFx';
import { ArcReactorCore } from './ArcReactorCore';
import { CenterCarousel } from './CenterCarousel';
import { CircularMicroGauge } from './MicroGauge';
import { StxHologram } from './StxHologram';

interface PortraitViewProps {
  now: Date;
  greeting: string;
  tickerLine: string;
  telemetry: DeviceTelemetry;
  activeWedge: WedgeId;
  dialOptions: DialOption[];
  activeSubId: string;
  onSelectRootWedge: (wedge: WedgeId, openTool?: boolean) => void;
  onSelectSubOption: (id: string, activate?: boolean) => void;
  onLaunchApp: (app: AppItem) => void;
  onOpenSettings: () => void;
  onStepBackApp?: () => void;
  selectedApp: AppItem | null;
  apps: AppItem[];
  onToggleAppSetting: (
    appId: string,
    field: 'pinnedToDock' | 'notificationsEnabled' | 'backgroundSync' | 'batteryOpt'
  ) => void;
  onClearAppCache: (appId: string) => void;
  toggles: QuickToggles;
  onToggleControl: (key: keyof QuickToggles) => void;
  networks: WifiNetwork[];
  onConnectNetwork: (ssid: string) => void;
  briefings: BriefingEntry[];
  onToggleBriefing: (id: string) => void;
  stxLogs: StxLogEntry[];
  onSendStxCommand: (cmd: string) => void;
  voiceActive: boolean;
  onToggleVoice: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  trackIndex: number;
  onStepTrack: (dir: -1 | 1) => void;
  onEnableSensors: () => Promise<boolean>;
  onResetSteps: () => void;
  onScanBluetooth: () => Promise<string | null>;
  cameraMode: 'OPTICAL' | 'THERMAL' | 'NIGHT';
  cameraZoom: number;
  liveCameraEnabled: boolean;
  onToggleLiveCamera: () => void;
  shutterFlash: boolean;
  notifCount: number;
}

export const PortraitView: React.FC<PortraitViewProps> = ({
  now,
  greeting,
  tickerLine,
  telemetry,
  activeWedge,
  dialOptions,
  activeSubId,
  onSelectRootWedge,
  onSelectSubOption,
  onLaunchApp,
  onOpenSettings,
  onStepBackApp,
  selectedApp,
  apps,
  onToggleAppSetting,
  onClearAppCache,
  toggles,
  onToggleControl,
  networks,
  onConnectNetwork,
  briefings,
  onToggleBriefing,
  stxLogs,
  onSendStxCommand,
  voiceActive,
  onToggleVoice,
  isPlaying,
  onTogglePlay,
  trackIndex,
  onStepTrack,
  onEnableSensors,
  onResetSteps,
  onScanBluetooth,
  cameraMode,
  cameraZoom,
  liveCameraEnabled,
  onToggleLiveCamera,
  shutterFlash,
  notifCount,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [overlayMode, setOverlayMode] = useState<'none' | 'stx' | 'module'>('none');
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(720);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setContainerHeight(el.clientHeight || 720);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wheelSize = containerHeight < 520 ? 156 : containerHeight < 650 ? 184 : 212;
  const gaugeSize = containerHeight < 620 ? 44 : 52;

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now
    .toLocaleDateString([], { month: 'short', day: '2-digit', weekday: 'short' })
    .toUpperCase();

  const nextBrief = briefings.find((b) => b.priority !== 'CLEAR') ?? briefings[briefings.length - 1];
  const lastStxMsg =
    [...stxLogs].reverse().find((l) => l.sender === 'STX')?.text ??
    'STX AI ready for voice or text command.';
  const currentTrack = AMBIENT_TRACKS[trackIndex % AMBIENT_TRACKS.length];

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) {
      hudSound.playChime();
      setOverlayMode('stx');
      return;
    }
    const q = commandInput.trim();
    onSendStxCommand(q);
    setCommandInput('');
    setLastReply(`STX AI: "${q.toUpperCase()}"`);
    setTimeout(() => setLastReply(null), 3500);
  };

  const openModule = (wedge: WedgeId) => {
    hudSound.playDetentClick();
    onSelectRootWedge(wedge, false);
    setOverlayMode(wedge === 'STX' ? 'stx' : 'module');
  };

  const toggleItems: {
    key: keyof QuickToggles;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'wifi', label: 'WIFI', icon: <Wifi className="w-3 h-3" /> },
    { key: 'bluetooth', label: 'BT', icon: <Bluetooth className="w-3 h-3" /> },
    { key: 'flashlight', label: 'FLSH', icon: <Flashlight className="w-3 h-3" /> },
    { key: 'lock', label: 'LOCK', icon: <Lock className="w-3 h-3" /> },
    { key: 'sync', label: 'SYNC', icon: <RefreshCw className="w-3 h-3" /> },
    {
      key: 'mute',
      label: 'MUTE',
      icon: toggles.mute ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />,
    },
  ];

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col justify-between h-full w-full px-3 pt-2 pb-1.5 overflow-y-auto hud-scroll"
    >
      {/* 1. TOP STATUS BAR */}
      <header className="flex items-center justify-between text-[10px] font-mono-hud tracking-widest shrink-0 z-10 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#E6F8FF]">{timeStr}</span>
          <span className="text-[#00F0FF]/65 text-[9px]">{dateStr}</span>
        </div>

        <div className="flex items-center gap-2">
          <Wifi className={`w-3 h-3 ${toggles.wifi && telemetry.online ? 'text-[#00F0FF]' : 'text-[#FF2A4B]/60'}`} />
          <Signal className="w-3 h-3 text-[#00F0FF]" />
          <span className="text-[#E6F8FF] font-semibold">
            {telemetry.batteryPct}%{telemetry.isCharging ? '⚡' : ''}
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Android Settings"
            className="p-1 border border-[#00F0FF]/45 bg-[#040A12] text-[#00F0FF] cursor-pointer hover:border-[#00F0FF]"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => openModule('STX')}
            className="px-2 py-0.5 border border-[#00F0FF]/50 bg-[#00F0FF]/12 text-[#00F0FF] text-[8.5px] font-bold tracking-[0.16em] cursor-pointer hover:bg-[#00F0FF]/25 transition-colors"
          >
            STX AI
          </button>
        </div>
      </header>

      {/* 2. UPPER HERO — CONCENTRIC ARC REACTOR WHEEL */}
      <section className="relative flex flex-col items-center justify-center shrink-0">
        <div className="relative flex items-center justify-center w-full">
          <div className="absolute left-0.5 bottom-0.5 z-10">
            <CircularMicroGauge
              value={telemetry.batteryPct}
              label={`${telemetry.batteryPct}%`}
              subLabel={telemetry.isCharging ? 'CHG' : 'PWR'}
              accent="cyan"
              size={gaugeSize}
            />
          </div>

          <ArcReactorCore
            variant="portrait"
            options={ROOT_WEDGE_OPTIONS}
            activeOptionId={activeWedge}
            onSelectOption={(id) => openModule(id as WedgeId)}
            size={wheelSize}
          />

          <div className="absolute right-0.5 bottom-0.5 z-10">
            <CircularMicroGauge
              value={Math.min(100, Math.round((telemetry.steps / 10000) * 100))}
              label={telemetry.steps > 999 ? `${(telemetry.steps / 1000).toFixed(1)}K` : `${telemetry.steps}`}
              subLabel="STEPS"
              accent="crimson"
              size={gaugeSize}
            />
          </div>
        </div>

        <div className="w-full flex items-center justify-between px-1.5 pt-1 pb-1 border-b border-[#00F0FF]/20">
          <div className="flex items-center gap-1.5 font-mono-hud">
            <span className="text-sm sm:text-base font-bold text-[#E6F8FF] leading-none">31°</span>
            <span className="text-[8px] text-[#00F0FF]/70 tracking-wider">CLEAR</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono-hud text-[8px] sm:text-[8.5px] tracking-[0.14em] text-[#E6F8FF]/85 truncate px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF] shrink-0" />
            <span className="truncate">STX AI CONNECTED</span>
          </div>

          <button
            type="button"
            onClick={() => openModule('BRIEF')}
            className="flex items-center gap-1 font-mono-hud text-[10px] text-[#E6F8FF] cursor-pointer hover:text-[#00F0FF] shrink-0"
          >
            <span className="text-[8px] text-[#E6F8FF]/55 tracking-wider">ALRT</span>
            <span className="font-bold text-[#00F0FF]">{notifCount}</span>
          </button>
        </div>
      </section>

      {/* 3. MIDDLE COMMAND, SYSTEM TOGGLES & BRIEFING DECK */}
      <section className="relative flex-1 min-h-0 flex flex-col justify-between py-2 px-2.5 border border-[#00F0FF]/20 bg-[#03060B]/85 my-1.5 gap-1.5">
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00F0FF]" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00F0FF]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#FF2A4B]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00F0FF]" />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold tracking-[0.08em] text-[#E6F8FF] text-glow-cyan leading-tight truncate">
              {greeting}, SANJU
            </h1>
            <p className="font-mono-hud text-[8.5px] tracking-[0.08em] text-[#00F0FF]/85 truncate mt-0.5">
              {lastReply ?? tickerLine}
            </p>
          </div>
          {/* Mini Audio Transport */}
          <div className="flex items-center gap-1 border border-[#00F0FF]/25 bg-[#040A12] px-1.5 py-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                hudSound.playDetentClick();
                onStepTrack(-1);
              }}
              aria-label="Previous track"
              className="p-0.5 text-[#00F0FF] cursor-pointer"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                hudSound.playDetentClick();
                onTogglePlay();
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={currentTrack.title}
              className="p-0.5 text-[#E6F8FF] cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => {
                hudSound.playDetentClick();
                onStepTrack(1);
              }}
              aria-label="Next track"
              className="p-0.5 text-[#00F0FF] cursor-pointer"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        </div>

        <form onSubmit={handleCommandSubmit} className="relative flex items-center">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="ASK STX AI"
            className="w-full pl-3 pr-10 py-1.5 bg-[#020408] border border-[#00F0FF]/40 focus:border-[#00F0FF] outline-none font-mono-hud text-[11px] tracking-[0.12em] text-[#E6F8FF] placeholder:text-[#E6F8FF]/55"
          />
          <button
            type="submit"
            aria-label="Open STX AI Hologram"
            className="absolute right-1.5 w-6 h-6 rounded-full border-2 border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_8px_rgba(0,240,255,0.55)] flex items-center justify-center cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#E6F8FF]" />
          </button>
        </form>

        {/* 6-Channel Quick System Toggles */}
        <div className="grid grid-cols-6 gap-1">
          {toggleItems.map((item) => {
            const active = toggles[item.key];
            const isAlert = item.key === 'lock' || item.key === 'mute';
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onToggleControl(item.key)}
                className={`flex flex-col items-center justify-center py-1 border font-mono-hud text-[7.5px] tracking-wider transition-colors cursor-pointer ${
                  active
                    ? isAlert
                      ? 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-[#FFE5EA]'
                      : 'border-[#00F0FF] bg-[#00F0FF]/18 text-[#E6F8FF]'
                    : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/45'
                }`}
              >
                {item.icon}
                <span className="mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => openModule('BRIEF')}
            className="w-full flex items-center justify-between text-left group cursor-pointer gap-2"
          >
            <div className="min-w-0">
              <div className="font-mono-hud text-[9.5px] font-bold tracking-[0.12em] text-[#E6F8FF] group-hover:text-[#00F0FF] transition-colors">
                NEXT CLEAR · {nextBrief.time}
              </div>
              <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/60 truncate">
                {nextBrief.title}
              </div>
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                openModule('HEALTH');
              }}
              className="font-mono-hud text-[8.5px] tracking-widest text-[#00F0FF] border border-[#00F0FF]/35 px-1.5 py-0.5 shrink-0"
            >
              HEALTH
            </span>
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#190910] overflow-hidden">
                <div
                  className="h-full bg-[#FF2A4B]"
                  style={{ width: `${telemetry.batteryPct}%` }}
                />
              </div>
              <span className="font-mono-hud text-[8px] text-[#FF2A4B] w-14 text-right">
                {telemetry.isCharging ? '⚡' : 'PWR'} {telemetry.batteryPct}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#05141C] overflow-hidden">
                <div
                  className="h-full bg-[#00F0FF]"
                  style={{
                    width: `${
                      toggles.wifi && telemetry.online
                        ? Math.min(100, Math.max(25, Math.round(telemetry.downlinkMbps * 4)))
                        : 4
                    }%`,
                  }}
                />
              </div>
              <span className="font-mono-hud text-[8px] text-[#00F0FF] w-14 text-right">
                {toggles.wifi && telemetry.online ? telemetry.netType : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BOTTOM QUICK-LAUNCH ARC DOCK */}
      <section className="relative h-[88px] sm:h-[98px] shrink-0 flex flex-col items-center justify-end overflow-hidden">
        <svg
          viewBox="0 0 360 110"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          <path
            d="M 18 106 A 162 96 0 0 1 342 106"
            fill="rgba(3, 6, 11, 0.78)"
            stroke="rgba(0, 240, 255, 0.35)"
            strokeWidth="1.2"
          />
          <path
            d="M 46 106 A 134 78 0 0 1 314 106"
            fill="none"
            stroke="rgba(255, 42, 75, 0.35)"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
          <path
            d="M 90 106 A 90 52 0 0 1 270 106"
            fill="none"
            stroke="rgba(0, 240, 255, 0.55)"
            strokeWidth="1.2"
          />
        </svg>

        <div className="relative z-10 mb-0.5 flex flex-col items-center">
          <button
            type="button"
            onClick={() => openModule('STX')}
            aria-label="Open STX AI Hologram"
            className="w-3.5 h-3.5 rounded-full bg-[#FF2A4B] shadow-[0_0_10px_#FF2A4B] border border-white/50 cursor-pointer hover:scale-125 transition-transform"
          />
          <span className="font-mono-hud text-[7.5px] tracking-[0.2em] text-[#E6F8FF]/65 mt-0.5">
            STX AI
          </span>
        </div>

        <div className="relative z-10 w-full flex items-end justify-between px-2 pb-1">
          <button
            type="button"
            onClick={() => openModule('WIFI')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[#9FEFFF] hover:text-white cursor-pointer"
          >
            <Globe className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8px] tracking-widest">WIFI</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('SEARCH')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 -translate-y-1.5 text-[#9FEFFF] hover:text-white cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8px] tracking-widest">SEARCH</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('VAULT')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 -translate-y-2.5 text-[#9FEFFF] hover:text-white cursor-pointer"
          >
            <FolderLock className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8px] tracking-widest">VAULT</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('CAMERA')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 -translate-y-1.5 text-[#9FEFFF] hover:text-white cursor-pointer"
          >
            <Camera className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8px] tracking-widest">CAMERA</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('APPS')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[#E6F8FF] hover:text-[#00F0FF] cursor-pointer"
          >
            <Grid className="w-4 h-4 text-[#FF2A4B]" />
            <span className="font-mono-hud text-[8px] tracking-widest">APPS</span>
          </button>
        </div>
      </section>

      {/* STX AI HOLOGRAPHIC ASSISTANT OVERLAY */}
      <AnimatePresence>
        {overlayMode === 'stx' && (
          <motion.div
            key="portrait-stx-overlay"
            initial={{ opacity: 0, scale: 0.975 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-2 z-30 border border-[#00F0FF]/45 bg-[#020408]/96 flex flex-col p-2.5 shadow-[0_0_32px_rgba(0,0,0,0.95)]"
          >
            <div className="flex items-center justify-between border-b border-[#00F0FF]/20 pb-1.5 mb-1 shrink-0">
              <span className="font-display text-xs font-bold tracking-[0.18em] text-[#E6F8FF]">
                STX AI HOLOGRAM
              </span>
              <button
                type="button"
                onClick={() => setOverlayMode('none')}
                className="p-1 border border-[#00F0FF]/35 text-[#00F0FF] hover:bg-[#00F0FF]/15 cursor-pointer"
                aria-label="Close STX AI"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <StxHologram
                listening={voiceActive}
                onToggleListening={onToggleVoice}
                lastResponse={lastStxMsg}
                onSendCommand={onSendStxCommand}
              />
            </div>
          </motion.div>
        )}

        {/* IN-PORTRAIT MODULE CAROUSEL OVERLAY */}
        {overlayMode === 'module' && (
          <motion.div
            key="portrait-module-overlay"
            initial={{ opacity: 0, scale: 0.975 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-2 z-30 border border-[#00F0FF]/40 bg-[#020408]/96 flex flex-col p-2 shadow-[0_0_32px_rgba(0,0,0,0.95)]"
          >
          <div className="flex items-center justify-between px-1 pb-1.5 shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {selectedApp && onStepBackApp && (
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playDetentClick();
                    onStepBackApp();
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 border border-[#00F0FF]/45 text-[#00F0FF] font-mono-hud text-[9px] cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>APPS</span>
                </button>
              )}
              <span className="font-display text-xs font-bold tracking-[0.16em] text-[#00F0FF] truncate">
                {activeWedge}
                {selectedApp ? ` // ${selectedApp.name}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOverlayMode('none')}
              className="p-1 border border-[#00F0FF]/35 text-[#00F0FF] hover:bg-[#00F0FF]/15 cursor-pointer shrink-0"
              aria-label="Close module"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-h-0">
            <CenterCarousel
              activeWedge={activeWedge}
              dialOptions={dialOptions}
              activeSubId={activeSubId}
              onSelectSubOption={onSelectSubOption}
              onLaunchApp={onLaunchApp}
              selectedApp={selectedApp}
              apps={apps}
              onToggleAppSetting={onToggleAppSetting}
              onClearAppCache={onClearAppCache}
              toggles={toggles}
              onToggleControl={onToggleControl}
              networks={networks}
              onConnectNetwork={onConnectNetwork}
              briefings={briefings}
              onToggleBriefing={onToggleBriefing}
              stxLogs={stxLogs}
              onSendStxCommand={onSendStxCommand}
              voiceActive={voiceActive}
              onToggleVoice={onToggleVoice}
              telemetry={telemetry}
              onEnableSensors={onEnableSensors}
              onResetSteps={onResetSteps}
              onScanBluetooth={onScanBluetooth}
              cameraMode={cameraMode}
              cameraZoom={cameraZoom}
              liveCameraEnabled={liveCameraEnabled}
              onToggleLiveCamera={onToggleLiveCamera}
              shutterFlash={shutterFlash}
            />
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
