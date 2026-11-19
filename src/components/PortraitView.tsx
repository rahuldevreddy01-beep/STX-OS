import React, { useState } from 'react';
import {
  Camera,
  FolderLock,
  Globe,
  Grid,
  Search,
  Signal,
  Wifi,
  X,
} from 'lucide-react';
import { ROOT_WEDGE_OPTIONS } from '../data/hudData';
import {
  AppItem,
  BriefingEntry,
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
  batteryPct: number;
  memPct: number;
  activeWedge: WedgeId;
  dialOptions: DialOption[];
  activeSubId: string;
  onSelectRootWedge: (wedge: WedgeId, openTool?: boolean) => void;
  onSelectSubOption: (id: string, activate?: boolean) => void;
  selectedApp: AppItem | null;
  apps: AppItem[];
  onToggleAppSetting: (
    appId: string,
    field: 'pinnedToDock' | 'notificationsEnabled' | 'backgroundSync'
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
  batteryPct,
  memPct,
  activeWedge,
  dialOptions,
  activeSubId,
  onSelectRootWedge,
  onSelectSubOption,
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

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now
    .toLocaleDateString([], { month: 'short', day: '2-digit', weekday: 'short' })
    .toUpperCase();

  const nextBrief = briefings.find((b) => b.priority !== 'CLEAR') ?? briefings[briefings.length - 1];
  const lastStxMsg =
    [...stxLogs].reverse().find((l) => l.sender === 'STX')?.text ??
    'STX AI ready for voice or text command.';

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

  return (
    <div className="relative flex flex-col justify-between h-full w-full px-3.5 pt-2.5 pb-2 overflow-hidden">
      {/* 1. TOP STATUS BAR */}
      <header className="flex items-center justify-between text-[10px] font-mono-hud tracking-widest shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#E6F8FF]">{timeStr}</span>
          <span className="text-[#00F0FF]/60 text-[9px]">{dateStr}</span>
        </div>

        <div className="flex items-center gap-2">
          <Wifi className={`w-3 h-3 ${toggles.wifi ? 'text-[#00F0FF]' : 'text-[#FF2A4B]/60'}`} />
          <Signal className="w-3 h-3 text-[#00F0FF]" />
          <span className="text-[#E6F8FF] font-semibold">{batteryPct}%</span>
          <button
            type="button"
            onClick={() => openModule('STX')}
            className="px-1.5 py-0.5 border border-[#00F0FF]/50 bg-[#00F0FF]/12 text-[#00F0FF] text-[8px] font-bold tracking-[0.18em] cursor-pointer hover:bg-[#00F0FF]/25 transition-colors"
          >
            STX AI
          </button>
        </div>
      </header>

      {/* 2. UPPER HERO — CONCENTRIC ARC REACTOR WHEEL */}
      <section className="relative flex flex-col items-center justify-center shrink-0 my-0.5">
        <div className="relative flex items-center justify-center w-full">
          <div className="absolute left-1 bottom-1 z-10">
            <CircularMicroGauge
              value={batteryPct}
              label={`${batteryPct}%`}
              subLabel="PWR"
              accent="cyan"
              size={54}
            />
          </div>

          <ArcReactorCore
            variant="portrait"
            options={ROOT_WEDGE_OPTIONS}
            activeOptionId={activeWedge}
            onSelectOption={(id) => openModule(id as WedgeId)}
            size={218}
          />

          <div className="absolute right-1 bottom-1 z-10">
            <CircularMicroGauge
              value={memPct}
              label={`${memPct}%`}
              subLabel="MEM"
              accent="crimson"
              size={54}
            />
          </div>
        </div>

        <div className="w-full flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-[#00F0FF]/20">
          <div className="flex items-center gap-1.5 font-mono-hud">
            <span className="text-base font-bold text-[#E6F8FF] leading-none">31°</span>
            <span className="text-[8px] text-[#00F0FF]/70 tracking-wider">CLEAR</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono-hud text-[8.5px] tracking-[0.16em] text-[#E6F8FF]/85">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" />
            <span>STX AI CONNECTED • LOCAL</span>
          </div>

          <button
            type="button"
            onClick={() => openModule('BRIEF')}
            className="flex items-center gap-1 font-mono-hud text-[10px] text-[#E6F8FF] cursor-pointer hover:text-[#00F0FF]"
          >
            <span className="text-[8px] text-[#E6F8FF]/55 tracking-wider">ALRT</span>
            <span className="font-bold text-[#00F0FF]">{notifCount}</span>
          </button>
        </div>
      </section>

      {/* 3. MIDDLE COMMAND & BRIEFING DECK */}
      <section className="relative flex-1 min-h-0 flex flex-col justify-between py-1.5 px-2.5 border border-[#00F0FF]/20 bg-[#03060B]/70 backdrop-blur-sm my-1">
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00F0FF]" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00F0FF]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#FF2A4B]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00F0FF]" />

        <div>
          <h1 className="font-display text-sm sm:text-base font-bold tracking-[0.08em] text-[#E6F8FF] text-glow-cyan leading-tight">
            {greeting}, SANJU
          </h1>
          <p className="font-mono-hud text-[9px] tracking-[0.1em] text-[#00F0FF]/85 truncate mt-0.5">
            {lastReply ?? tickerLine}
          </p>
        </div>

        <form onSubmit={handleCommandSubmit} className="relative flex items-center my-1">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="ASK STX AI"
            className="w-full pl-3 pr-10 py-1.5 bg-[#020408] border border-[#00F0FF]/40 focus:border-[#00F0FF] outline-none font-mono-hud text-[11px] tracking-[0.14em] text-[#E6F8FF] placeholder:text-[#E6F8FF]/55"
          />
          <button
            type="submit"
            aria-label="Open STX AI Hologram"
            className="absolute right-1.5 w-6 h-6 rounded-full border-2 border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_10px_rgba(0,240,255,0.65)] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          >
            <span className="w-2 h-2 rounded-full bg-[#E6F8FF]" />
          </button>
        </form>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => openModule('BRIEF')}
            className="w-full flex items-center justify-between text-left group cursor-pointer"
          >
            <div>
              <div className="font-mono-hud text-[9.5px] font-bold tracking-[0.14em] text-[#E6F8FF] group-hover:text-[#00F0FF] transition-colors">
                NEXT CLEAR · {nextBrief.time}
              </div>
              <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/60 truncate max-w-[215px]">
                {nextBrief.title}
              </div>
            </div>
            <span className="font-mono-hud text-[8.5px] tracking-widest text-[#00F0FF]">
              HEALTH
            </span>
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#190910] overflow-hidden flex gap-0.5">
                <div className="h-full bg-[#FF2A4B] glow-crimson" style={{ width: '78%' }} />
                <div className="h-full bg-[#FF2A4B]/45" style={{ width: '10%' }} />
              </div>
              <span className="font-mono-hud text-[8px] text-[#FF2A4B] w-9 text-right">
                PWR {batteryPct}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#05141C] overflow-hidden flex gap-0.5">
                <div className="h-full bg-[#00F0FF] glow-cyan" style={{ width: '64%' }} />
                <div className="h-full bg-[#00F0FF]/40" style={{ width: '18%' }} />
              </div>
              <span className="font-mono-hud text-[8px] text-[#00F0FF] w-9 text-right">
                NET {toggles.wifi ? '96' : '00'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BOTTOM QUICK-LAUNCH ARC DOCK */}
      <section className="relative h-[106px] shrink-0 flex flex-col items-center justify-end overflow-hidden">
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

        <div className="relative z-10 mb-1 flex flex-col items-center">
          <button
            type="button"
            onClick={() => openModule('STX')}
            aria-label="Open STX AI Hologram"
            className="w-3.5 h-3.5 rounded-full bg-[#FF2A4B] shadow-[0_0_12px_#FF2A4B] border border-white/50 cursor-pointer hover:scale-125 transition-transform"
          />
          <span className="font-mono-hud text-[7.5px] tracking-[0.2em] text-[#E6F8FF]/65 mt-0.5">
            STX AI
          </span>
        </div>

        <div className="relative z-10 w-full flex items-end justify-between px-2 pb-1">
          <button
            type="button"
            onClick={() => openModule('WIFI')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[#9FEFFF] hover:text-white transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8.5px] tracking-widest">WIFI</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('SEARCH')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 -translate-y-2 text-[#9FEFFF] hover:text-white transition-transform hover:-translate-y-2.5 cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8.5px] tracking-widest">SEARCH</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('VAULT')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 -translate-y-3 text-[#9FEFFF] hover:text-white transition-transform hover:-translate-y-3.5 cursor-pointer"
          >
            <FolderLock className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8.5px] tracking-widest">VAULT</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('CAMERA')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 -translate-y-2 text-[#9FEFFF] hover:text-white transition-transform hover:-translate-y-2.5 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-mono-hud text-[8.5px] tracking-widest">CAMERA</span>
          </button>

          <button
            type="button"
            onClick={() => openModule('APPS')}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[#E6F8FF] hover:text-[#00F0FF] transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Grid className="w-4 h-4 text-[#FF2A4B]" />
            <span className="font-mono-hud text-[8.5px] tracking-widest">APPS</span>
          </button>
        </div>
      </section>

      {/* STX AI HOLOGRAPHIC ASSISTANT OVERLAY */}
      {overlayMode === 'stx' && (
        <div className="absolute inset-x-2.5 bottom-2.5 top-10 z-30 border border-[#00F0FF]/45 bg-[#020408]/95 backdrop-blur-xl flex flex-col p-2.5 shadow-[0_0_40px_rgba(0,0,0,0.95)]">
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
        </div>
      )}

      {/* IN-PORTRAIT MODULE CAROUSEL OVERLAY */}
      {overlayMode === 'module' && (
        <div className="absolute inset-x-2 bottom-2 top-10 z-30 border border-[#00F0FF]/40 bg-[#020408]/95 backdrop-blur-xl flex flex-col p-2 shadow-[0_0_40px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between px-2 pb-1.5 shrink-0">
            <span className="font-display text-xs font-bold tracking-[0.18em] text-[#00F0FF]">
              {activeWedge}
              {selectedApp ? ` // ${selectedApp.name}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setOverlayMode('none')}
              className="p-1 border border-[#00F0FF]/35 text-[#00F0FF] hover:bg-[#00F0FF]/15 cursor-pointer"
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
              batteryPct={batteryPct}
              memPct={memPct}
              cameraMode={cameraMode}
              cameraZoom={cameraZoom}
              liveCameraEnabled={liveCameraEnabled}
              onToggleLiveCamera={onToggleLiveCamera}
              shutterFlash={shutterFlash}
            />
          </div>
        </div>
      )}
    </div>
  );
};
