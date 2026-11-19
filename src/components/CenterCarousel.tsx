import React, { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BatteryCharging,
  Bell,
  Bluetooth,
  Camera,
  Check,
  Compass,
  ExternalLink,
  FolderLock,
  Grid,
  Lock,
  Pin,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  Unlock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { VAULT_FILES } from '../data/hudData';
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
import { CircularMicroGauge, CompassRadarDial } from './MicroGauge';
import { StxHologram } from './StxHologram';

interface CenterCarouselProps {
  activeWedge: WedgeId;
  dialOptions: DialOption[];
  activeSubId: string;
  onSelectSubOption: (id: string, activate?: boolean) => void;
  onLaunchApp?: (app: AppItem) => void;
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
  telemetry: DeviceTelemetry;
  onEnableSensors: () => Promise<boolean>;
  onResetSteps: () => void;
  onScanBluetooth: () => Promise<string | null>;
  cameraMode: 'OPTICAL' | 'THERMAL' | 'NIGHT';
  cameraZoom: number;
  liveCameraEnabled: boolean;
  onToggleLiveCamera: () => void;
  shutterFlash: boolean;
}

const LiveEcgStrip: React.FC<{ bpm?: number }> = memo(({ bpm = 72 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 260, h: 50 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(140, canvas.clientWidth || 260);
      const h = Math.max(40, canvas.clientHeight || 50);
      sizeRef.current = { w, h };
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    if (ro) ro.observe(canvas);

    let rafId = 0;
    let offset = 0;
    let lastTs = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { w, h } = sizeRef.current;

      offset += (bpm / 60) * 108 * dt;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const baseY = h * 0.65;
      ctx.strokeStyle = 'rgba(255, 42, 75, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(w, baseY);
      ctx.stroke();

      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const phase = ((x + offset) % 88) / 88;
        let y = baseY;
        if (phase > 0.12 && phase < 0.2) {
          y -= Math.sin(((phase - 0.12) / 0.08) * Math.PI) * 5;
        } else if (phase >= 0.28 && phase < 0.32) {
          y += 5;
        } else if (phase >= 0.32 && phase < 0.37) {
          y -= Math.sin(((phase - 0.32) / 0.05) * Math.PI) * (h * 0.48);
        } else if (phase >= 0.37 && phase < 0.42) {
          y += Math.sin(((phase - 0.37) / 0.05) * Math.PI) * (h * 0.2);
        } else if (phase >= 0.52 && phase < 0.66) {
          y -= Math.sin(((phase - 0.52) / 0.14) * Math.PI) * 8;
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = 'rgba(255, 42, 75, 0.28)';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      ctx.strokeStyle = '#FF2A4B';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.restore();
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [bpm]);

  return <canvas ref={canvasRef} className="w-full h-[46px] sm:h-[54px] block" />;
});
LiveEcgStrip.displayName = 'LiveEcgStrip';

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let diff = index - activeIndex;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

function getHeadingDir(deg: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export const CenterCarousel: React.FC<CenterCarouselProps> = ({
  activeWedge,
  dialOptions,
  activeSubId,
  onSelectSubOption,
  onLaunchApp,
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
  telemetry,
  onEnableSensors,
  onResetSteps,
  onScanBluetooth,
  cameraMode,
  cameraZoom,
  liveCameraEnabled,
  onToggleLiveCamera,
  shutterFlash,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockedVaultIds, setUnlockedVaultIds] = useState<string[]>(['v1']);
  const [cacheToast, setCacheToast] = useState<string | null>(null);
  const [containerW, setContainerW] = useState(500);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const activeIdx = Math.max(
    0,
    dialOptions.findIndex((o) => o.id === activeSubId)
  );
  const connectedWifi = networks.find((n) => n.connected) ?? networks[0];
  const lastStxReply =
    [...stxLogs].reverse().find((l) => l.sender === 'STX')?.text ??
    'STX AI neural link ready.';

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setContainerW(el.clientWidth || 500);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeWedge === 'CAMERA' && liveCameraEnabled && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {});
    }
    return () => {
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
    };
  }, [activeWedge, liveCameraEnabled]);

  const handleCardPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    swipeRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCardPointerUp = (e: React.PointerEvent) => {
    if (!swipeRef.current) return;
    const dx = e.clientX - swipeRef.current.x;
    const dy = e.clientY - swipeRef.current.y;
    swipeRef.current = null;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2 && dialOptions.length > 1) {
      const dir = dx < 0 ? 1 : -1;
      const nextIdx = (activeIdx + dir + dialOptions.length) % dialOptions.length;
      if (dialOptions[nextIdx]) {
        hudSound.playDetentClick();
        onSelectSubOption(dialOptions[nextIdx].id, false);
      }
    }
  };

  const renderCardContent = (opt: DialOption, isFront: boolean) => {
    // A. LEVEL-3 DEEP APP SETTINGS DIAL ("dial inside dial inside dial")
    if (activeWedge === 'APPS' && selectedApp) {
      const liveApp = apps.find((a) => a.id === selectedApp.id) ?? selectedApp;
      return (
        <div className="flex flex-col justify-between h-full gap-2 overflow-y-auto hud-scroll pr-0.5">
          <div className="flex items-start justify-between border-b border-[#00F0FF]/15 pb-1.5 sm:pb-2 shrink-0 gap-2">
            <div className="min-w-0">
              <div className="font-mono-hud text-[9px] tracking-[0.16em] text-[#00F0FF]/80 truncate">
                {liveApp.packageId} · v{liveApp.version ?? '1.0'}
              </div>
              <h3 className="font-display text-sm sm:text-lg font-bold tracking-[0.1em] text-[#E6F8FF] text-glow-cyan mt-0.5 truncate">
                {liveApp.name} // {opt.label}
              </h3>
            </div>
            {onLaunchApp && (
              <button
                type="button"
                onClick={() => onLaunchApp(liveApp)}
                className="flex items-center gap-1 px-2.5 py-1 border border-[#00F0FF] bg-[#00F0FF]/18 hover:bg-[#00F0FF]/35 font-mono-hud text-[9px] text-white shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>OPEN POPUP</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 flex-1 content-center">
            <button
              type="button"
              onClick={() => onToggleAppSetting(liveApp.id, 'pinnedToDock')}
              className={`flex items-center justify-between px-2.5 py-2 border text-left cursor-pointer ${
                liveApp.pinnedToDock
                  ? 'border-[#00F0FF] bg-[#00F0FF]/14 text-[#E6F8FF]'
                  : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/60'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[9.5px]">
                <Pin className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
                PIN ARC DOCK
              </span>
              <span className="font-mono-hud text-[9.5px] font-bold">
                {liveApp.pinnedToDock ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleAppSetting(liveApp.id, 'notificationsEnabled')}
              className={`flex items-center justify-between px-2.5 py-2 border text-left cursor-pointer ${
                liveApp.notificationsEnabled
                  ? 'border-[#00F0FF] bg-[#00F0FF]/14 text-[#E6F8FF]'
                  : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/60'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[9.5px]">
                <Bell className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
                ALERTS
              </span>
              <span className="font-mono-hud text-[9.5px] font-bold">
                {liveApp.notificationsEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleAppSetting(liveApp.id, 'backgroundSync')}
              className={`flex items-center justify-between px-2.5 py-2 border text-left cursor-pointer ${
                liveApp.backgroundSync
                  ? 'border-[#00F0FF] bg-[#00F0FF]/14 text-[#E6F8FF]'
                  : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/60'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[9.5px]">
                <RefreshCw className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
                BG SYNC
              </span>
              <span className="font-mono-hud text-[9.5px] font-bold">
                {liveApp.backgroundSync ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleAppSetting(liveApp.id, 'batteryOpt')}
              className={`flex items-center justify-between px-2.5 py-2 border text-left cursor-pointer ${
                liveApp.batteryOpt === 'UNRESTRICTED'
                  ? 'border-[#00F0FF] bg-[#00F0FF]/14 text-[#E6F8FF]'
                  : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/70'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[9.5px]">
                <BatteryCharging className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
                BATT MODE
              </span>
              <span className="font-mono-hud text-[8.5px] font-bold">
                {liveApp.batteryOpt ?? 'OPTIMIZED'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClearAppCache(liveApp.id);
                setCacheToast('CACHE PURGED · 0 MB');
                setTimeout(() => setCacheToast(null), 2000);
              }}
              className="sm:col-span-2 flex items-center justify-between px-2.5 py-2 border border-[#FF2A4B]/45 bg-[#FF2A4B]/10 hover:bg-[#FF2A4B]/20 text-[#FFE5EA] cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[9.5px]">
                <Trash2 className="w-3.5 h-3.5 text-[#FF2A4B] shrink-0" />
                CLEAR APP CACHE ({liveApp.storageMb ?? 24} MB)
              </span>
              <span className="font-mono-hud text-[9.5px] text-[#FF2A4B]">
                {cacheToast ?? 'PURGE'}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#00F0FF]/15 font-mono-hud text-[9px] text-[#E6F8FF]/70 shrink-0">
            <span className="truncate">PERMS: {liveApp.permissions}</span>
            <button
              type="button"
              onClick={() => onSelectSubOption(opt.id, true)}
              className="px-2.5 py-1 border border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#E6F8FF] hover:bg-[#00F0FF]/30 cursor-pointer shrink-0"
            >
              EXEC: {opt.label}
            </button>
          </div>
        </div>
      );
    }

    // B. ANDROID APPS CAROUSEL CARDS (Click app to open Windowed Popup, or click IN-APP DIAL for Level 3!)
    if (activeWedge === 'APPS') {
      const app = apps.find((a) => a.id === opt.id) ?? apps[0];
      return (
        <div className="flex flex-col justify-between h-full gap-2 overflow-y-auto hud-scroll pr-0.5">
          <div className="flex items-start justify-between border-b border-[#00F0FF]/15 pb-1.5 sm:pb-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (onLaunchApp ? onLaunchApp(app) : onSelectSubOption(app.id, true))}
              className="min-w-0 text-left group cursor-pointer"
            >
              <div className="font-mono-hud text-[8.5px] sm:text-[9px] tracking-[0.16em] text-[#00F0FF]/75 truncate">
                {app.category} · {app.packageId}
              </div>
              <h3 className="font-display text-base sm:text-xl font-bold tracking-[0.12em] text-[#E6F8FF] group-hover:text-[#00F0FF] text-glow-cyan mt-0.5 truncate transition-colors">
                {app.name}
              </h3>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              {onLaunchApp && (
                <button
                  type="button"
                  onClick={() => onLaunchApp(app)}
                  className="flex items-center gap-1 px-2.5 py-1 border border-[#00F0FF] bg-[#00F0FF]/20 hover:bg-[#00F0FF]/35 font-mono-hud text-[9px] tracking-wider text-white cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>OPEN</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectSubOption(app.id, true)}
                className="flex items-center gap-1 px-2 py-1 border border-[#00F0FF]/45 bg-[#040A12] hover:border-[#00F0FF] font-mono-hud text-[9px] tracking-wider text-[#9FEFFF] cursor-pointer"
                title="App Deep Settings Dial"
              >
                <Sliders className="w-3 h-3" />
                <span className="hidden sm:inline">DIAL</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between font-mono-hud text-[10px] border-b border-[#00F0FF]/10 pb-1 gap-2">
              <span className="text-[#E6F8FF]/55">STATE</span>
              <span className="text-[#00F0FF] font-bold">{app.status}</span>
            </div>
            <div className="flex items-center justify-between font-mono-hud text-[10px] border-b border-[#00F0FF]/10 pb-1 gap-2">
              <span className="text-[#E6F8FF]/55 shrink-0">PERMISSIONS</span>
              <span className="text-[#E6F8FF] truncate">{app.permissions}</span>
            </div>
            <div className="flex items-center justify-between font-mono-hud text-[10px] border-b border-[#00F0FF]/10 pb-1 gap-2">
              <span className="text-[#E6F8FF]/55">BATTERY / STORAGE</span>
              <span className="text-[#9FEFFF]">
                {app.batteryOpt ?? 'OPTIMIZED'} · {app.storageMb ?? 24} MB
              </span>
            </div>
            <div className="flex items-center justify-between font-mono-hud text-[10px] gap-2">
              <span className="text-[#E6F8FF]/55">QUICK CONTROLS</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleAppSetting(app.id, 'pinnedToDock')}
                  className={`px-2 py-0.5 border text-[8.5px] cursor-pointer ${
                    app.pinnedToDock
                      ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10'
                      : 'border-[#E6F8FF]/25 text-[#E6F8FF]/55'
                  }`}
                >
                  {app.pinnedToDock ? 'PINNED' : 'PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAppSetting(app.id, 'notificationsEnabled')}
                  className={`px-2 py-0.5 border text-[8.5px] cursor-pointer ${
                    app.notificationsEnabled
                      ? 'border-[#00F0FF]/60 text-[#E6F8FF]'
                      : 'border-[#FF2A4B]/50 text-[#FF2A4B]'
                  }`}
                >
                  {app.notificationsEnabled ? 'ALERTS ON' : 'MUTED'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-[#00F0FF]/15 shrink-0 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Grid className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
              <span className="font-mono-hud text-[8.5px] text-[#E6F8FF]/65 truncate">
                TAP OPEN FOR WINDOWED APP
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectSubOption(app.id, true)}
              className="font-mono-hud text-[9px] text-[#FF2A4B] font-bold hover:underline cursor-pointer shrink-0"
            >
              APP SETTINGS →
            </button>
          </div>
        </div>
      );
    }

    // C. HEALTH & REAL MOBILE SENSOR CARDS
    if (activeWedge === 'HEALTH') {
      if (opt.id === 'h-steps') {
        const distKm = (telemetry.steps * 0.00075).toFixed(2);
        const kcal = Math.round(telemetry.steps * 0.042);
        const goalPct = Math.min(100, Math.round((telemetry.steps / 10000) * 100));
        return (
          <div className="flex flex-col justify-between h-full gap-2 overflow-y-auto hud-scroll pr-0.5">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Activity className="w-4 h-4 text-[#00F0FF] shrink-0" />
                <span className="font-display text-sm sm:text-base font-bold tracking-[0.12em] text-[#E6F8FF] truncate">
                  REAL PEDOMETER
                </span>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="font-mono-hud text-xl sm:text-2xl font-bold text-[#E6F8FF] tabular-nums">
                  {telemetry.steps.toLocaleString()}
                </span>
                <span className="font-mono-hud text-[9px] text-[#00F0FF]">STEPS</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 font-mono-hud text-[9px] text-[#E6F8FF]/70">
              <span>
                {telemetry.stepActive
                  ? 'ACCELEROMETER LIVE'
                  : telemetry.sensorNeedsPermission
                    ? 'TAP ENABLE FOR MOBILE SENSORS'
                    : 'MOBILE MOTION READY'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onEnableSensors()}
                  className="px-2 py-0.5 border border-[#00F0FF]/55 text-[#00F0FF] cursor-pointer"
                >
                  CALIBRATE
                </button>
                <button
                  type="button"
                  onClick={onResetSteps}
                  className="px-2 py-0.5 border border-[#FF2A4B]/50 text-[#FFB4C0] cursor-pointer"
                >
                  RESET
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono-hud text-[8.5px] text-[#00F0FF]">
                <span>DAILY 10K GOAL</span>
                <span>{goalPct}%</span>
              </div>
              <div className="h-2 bg-[#071620] border border-[#00F0FF]/25 overflow-hidden">
                <div className="h-full bg-[#00F0FF]" style={{ width: `${goalPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 shrink-0">
              <div className="border-l border-[#00F0FF]/25 pl-2">
                <div className="font-mono-hud text-[8px] text-[#E6F8FF]/50">DISTANCE</div>
                <div className="font-mono-hud text-[11px] font-bold text-[#E6F8FF]">{distKm} KM</div>
              </div>
              <div className="border-l border-[#00F0FF]/25 pl-2">
                <div className="font-mono-hud text-[8px] text-[#E6F8FF]/50">CALORIES</div>
                <div className="font-mono-hud text-[11px] font-bold text-[#E6F8FF]">{kcal} KCAL</div>
              </div>
              <div className="border-l border-[#00F0FF]/25 pl-2">
                <div className="font-mono-hud text-[8px] text-[#E6F8FF]/50">ACCEL FORCE</div>
                <div className="font-mono-hud text-[11px] font-bold text-[#00F0FF]">
                  {telemetry.accelMag} m/s²
                </div>
              </div>
              <div className="border-l border-[#00F0FF]/25 pl-2">
                <div className="font-mono-hud text-[8px] text-[#E6F8FF]/50">BATTERY</div>
                <div className="font-mono-hud text-[11px] font-bold text-[#E6F8FF]">
                  {telemetry.batteryPct}%
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (opt.id === 'h-gyro') {
        return (
          <div className="flex flex-col justify-between h-full gap-2 overflow-y-auto hud-scroll pr-0.5">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#00F0FF]" />
                <span className="font-display text-sm sm:text-base font-bold tracking-[0.12em] text-white">
                  GYRO & COMPASS
                </span>
              </div>
              <button
                type="button"
                onClick={() => onEnableSensors()}
                className="px-2 py-0.5 border border-[#00F0FF]/55 font-mono-hud text-[9px] text-[#00F0FF] cursor-pointer"
              >
                {telemetry.gyroActive ? 'LIVE GYRO' : 'ENABLE GYRO'}
              </button>
            </div>

            <div className="flex items-center justify-around py-1">
              <CompassRadarDial headingDeg={telemetry.headingDeg} size={74} />
              <div className="flex flex-col items-center gap-1">
                <div className="relative w-20 h-20 rounded-full border border-[#00F0FF]/50 overflow-hidden flex items-center justify-center bg-[#020408]">
                  <div
                    className="w-24 h-[2px] bg-[#00F0FF] transition-transform duration-100"
                    style={{
                      transform: `translateY(${Math.max(-24, Math.min(24, telemetry.pitchDeg))}px) rotate(${-telemetry.rollDeg}deg)`,
                    }}
                  />
                  <div className="absolute w-2.5 h-2.5 rounded-full border border-[#FF2A4B]" />
                </div>
                <span className="font-mono-hud text-[8.5px] text-[#9FEFFF]">HORIZON</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#00F0FF]/15 font-mono-hud">
              <div>
                <div className="text-[8px] text-[#E6F8FF]/50">HEADING</div>
                <div className="text-xs font-bold text-white">
                  {getHeadingDir(telemetry.headingDeg)} {telemetry.headingDeg}°
                </div>
              </div>
              <div>
                <div className="text-[8px] text-[#E6F8FF]/50">PITCH</div>
                <div className="text-xs font-bold text-[#00F0FF]">{telemetry.pitchDeg}°</div>
              </div>
              <div>
                <div className="text-[8px] text-[#E6F8FF]/50">ROLL</div>
                <div className="text-xs font-bold text-[#FF2A4B]">{telemetry.rollDeg}°</div>
              </div>
            </div>
          </div>
        );
      }

      const metricMap: Record<
        string,
        { val: string; unit: string; sub: string; bpm: number; rows: [string, string][] }
      > = {
        'h-ecg': {
          val: '72',
          unit: 'BPM',
          sub: 'HEART RATE · SINUS RHYTHM',
          bpm: 72,
          rows: [
            ['HRV', '68 ms'],
            ['STEPS', `${telemetry.steps}`],
            ['SPO2', '99%'],
            ['PWR', `${telemetry.batteryPct}%`],
          ],
        },
        'h-hrv': {
          val: '68',
          unit: 'MS',
          sub: 'AUTONOMIC RECOVERY HIGH',
          bpm: 64,
          rows: [
            ['RMSSD', '71 ms'],
            ['STRESS', 'LOW 14%'],
            ['READINESS', '94%'],
            ['TEMP', '36.6°C'],
          ],
        },
        'h-sleep': {
          val: '7:42',
          unit: 'HRS',
          sub: 'DEEP 2H 18M · REM 1H 54M',
          bpm: 56,
          rows: [
            ['EFFICIENCY', '93%'],
            ['LATENCY', '9 MIN'],
            ['HR DROP', '-14 BPM'],
            ['SCORE', '91 / 100'],
          ],
        },
        'h-spo2': {
          val: '99',
          unit: '%',
          sub: 'BLOOD OXYGEN SATURATION',
          bpm: 68,
          rows: [
            ['STEPS', `${telemetry.steps}`],
            ['RESP RATE', '14 /MIN'],
            ['PERFUSION', '4.2%'],
            ['STATUS', 'OPTIMAL'],
          ],
        },
      };
      const m = metricMap[opt.id] ?? metricMap['h-ecg'];

      return (
        <div className="flex flex-col justify-between h-full gap-2 overflow-y-auto hud-scroll pr-0.5">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Activity className="w-4 h-4 text-[#FF2A4B] shrink-0" />
              <span className="font-display text-sm sm:text-base font-bold tracking-[0.12em] text-[#E6F8FF] truncate">
                {opt.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="font-mono-hud text-xl sm:text-2xl font-bold text-[#E6F8FF]">
                {m.val}
              </span>
              <span className="font-mono-hud text-[9px] text-[#00F0FF]">{m.unit}</span>
            </div>
          </div>

          <div className="font-mono-hud text-[9px] sm:text-[9.5px] tracking-[0.12em] text-[#E6F8FF]/65 truncate shrink-0">
            {m.sub}
          </div>

          <div className="border-y border-[#FF2A4B]/20 py-1 shrink-0">
            {isFront ? (
              <LiveEcgStrip bpm={m.bpm} />
            ) : (
              <div className="h-[46px] sm:h-[54px] flex items-center">
                <div className="w-full h-[1.5px] bg-[#FF2A4B]/50" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 shrink-0">
            {m.rows.map(([k, v]) => (
              <div key={k} className="border-l border-[#00F0FF]/25 pl-2">
                <div className="font-mono-hud text-[8px] sm:text-[8.5px] text-[#E6F8FF]/50">{k}</div>
                <div className="font-mono-hud text-[10.5px] sm:text-[11px] font-bold text-[#E6F8FF] truncate">
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // D. WIFI & BLUETOOTH CAROUSEL CARDS (Real Network + Web Bluetooth)
    if (activeWedge === 'WIFI') {
      if (opt.id === 'w-bluetooth') {
        return (
          <div className="flex flex-col justify-between h-full gap-2.5 overflow-y-auto hud-scroll">
            <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-2 gap-2">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold tracking-[0.12em] text-white">
                  BLUETOOTH RADIO
                </h3>
                <p className="font-mono-hud text-[9px] text-[#00F0FF]">{telemetry.btStatus}</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleControl('bluetooth')}
                className={`flex items-center gap-1.5 px-2.5 py-1 border font-mono-hud text-[9.5px] cursor-pointer ${
                  toggles.bluetooth
                    ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-white'
                    : 'border-[#FF2A4B] bg-[#FF2A4B]/15 text-[#FF2A4B]'
                }`}
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>{toggles.bluetooth ? 'BT ON' : 'BT OFF'}</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-3 border border-[#00F0FF]/20 bg-[#03060B] p-4 text-center">
              <Bluetooth className="w-8 h-8 text-[#00F0FF]" />
              <div className="font-mono-hud text-xs text-white">
                {telemetry.btDeviceName
                  ? `ACTIVE LINK: ${telemetry.btDeviceName}`
                  : 'WEB BLUETOOTH READY FOR NEARBY PAIRING'}
              </div>
              <button
                type="button"
                onClick={() => onScanBluetooth()}
                className="px-4 py-2 border border-[#00F0FF] bg-[#00F0FF]/20 hover:bg-[#00F0FF]/35 font-mono-hud text-[10px] tracking-widest text-white cursor-pointer"
              >
                {telemetry.btScanning ? 'SCANNING...' : 'SCAN & PAIR DEVICE'}
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col justify-between h-full gap-2 overflow-y-auto hud-scroll pr-0.5">
          <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-1.5 sm:pb-2 gap-2 shrink-0">
            <div className="min-w-0">
              <h3 className="font-display text-sm sm:text-lg font-bold tracking-[0.12em] text-[#E6F8FF] text-glow-cyan truncate">
                WIFI // {opt.label}
              </h3>
              <p className="font-mono-hud text-[9px] sm:text-[9.5px] text-[#00F0FF]/80 truncate">
                {toggles.wifi && telemetry.online
                  ? `${telemetry.netType} · ${telemetry.downlinkMbps} Mbps · ${telemetry.rttMs}ms`
                  : 'RF LINK OFFLINE'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleControl('wifi')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 border font-mono-hud text-[9px] sm:text-[9.5px] tracking-widest cursor-pointer shrink-0 ${
                toggles.wifi && telemetry.online
                  ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#E6F8FF]'
                  : 'border-[#FF2A4B] bg-[#FF2A4B]/15 text-[#FF2A4B]'
              }`}
            >
              {toggles.wifi && telemetry.online ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span>{toggles.wifi && telemetry.online ? 'ONLINE' : 'OFFLINE'}</span>
            </button>
          </div>

          {opt.id === 'w-overview' || opt.id === 'w-band' || opt.id === 'w-toggle' ? (
            <>
              <div className="space-y-1.5 sm:space-y-2 flex-1 flex flex-col justify-center">
                <div className="flex justify-between font-mono-hud text-[10px] border-b border-[#00F0FF]/10 pb-1 gap-2">
                  <span className="text-[#E6F8FF]/55">DEVICE LINK</span>
                  <span className="text-[#E6F8FF] font-bold truncate">
                    {telemetry.online ? `${telemetry.netType} (${connectedWifi.ssid})` : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="flex justify-between font-mono-hud text-[10px] border-b border-[#00F0FF]/10 pb-1 gap-2">
                  <span className="text-[#E6F8FF]/55">DOWNLINK SPEED</span>
                  <span className="text-[#00F0FF]">{telemetry.downlinkMbps} MBPS</span>
                </div>
                <div className="flex justify-between font-mono-hud text-[10px] border-b border-[#00F0FF]/10 pb-1 gap-2">
                  <span className="text-[#E6F8FF]/55">LATENCY (RTT)</span>
                  <span className="text-[#E6F8FF]">{telemetry.rttMs} MS</span>
                </div>
                <div className="flex justify-between font-mono-hud text-[10px] gap-2">
                  <span className="text-[#E6F8FF]/55">BLUETOOTH</span>
                  <span className="text-[#00F0FF] truncate">{telemetry.btStatus}</span>
                </div>
              </div>

              <div className="flex items-center justify-around pt-1 border-t border-[#00F0FF]/15 shrink-0">
                <CircularMicroGauge
                  value={toggles.wifi && telemetry.online ? connectedWifi.signal : 0}
                  label={toggles.wifi && telemetry.online ? `${connectedWifi.signal}%` : 'OFF'}
                  subLabel="SIGNAL"
                  accent={toggles.wifi && telemetry.online ? 'cyan' : 'crimson'}
                  size={56}
                />
                <CircularMicroGauge
                  value={toggles.wifi && telemetry.online ? Math.max(10, 100 - telemetry.rttMs) : 0}
                  label={toggles.wifi && telemetry.online ? `${telemetry.rttMs}ms` : '--'}
                  subLabel="PING"
                  accent="crimson"
                  size={56}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5 flex-1 overflow-y-auto hud-scroll">
              {networks.map((net) => {
                const isConn = toggles.wifi && net.connected;
                return (
                  <button
                    key={net.ssid}
                    type="button"
                    disabled={!toggles.wifi}
                    onClick={() => onConnectNetwork(net.ssid)}
                    className={`w-full flex items-center justify-between px-2.5 sm:px-3 py-2 border text-left cursor-pointer disabled:opacity-40 gap-2 ${
                      isConn
                        ? 'border-[#00F0FF] bg-[#00F0FF]/14'
                        : 'border-[#00F0FF]/20 bg-[#05080D]/70 hover:border-[#00F0FF]/55'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-mono-hud text-[10.5px] sm:text-[11px] font-semibold text-[#E6F8FF] truncate">
                        {net.ssid}
                      </div>
                      <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55 truncate">
                        {net.band} · {net.security} · {net.latencyMs}ms
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono-hud text-[10px] text-[#00F0FF]">{net.signal}%</span>
                      {isConn && <Check className="w-3.5 h-3.5 text-[#00F0FF]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // E. STX AI HOLOGRAPHIC ASSISTANT
    if (activeWedge === 'STX') {
      if (opt.id === 's-console') {
        return (
          <div className="flex flex-col justify-between h-full gap-2">
            <div className="font-display text-xs sm:text-sm font-bold tracking-[0.14em] text-[#E6F8FF] border-b border-[#00F0FF]/15 pb-1.5 shrink-0">
              STX AI // COMMAND LOG
            </div>
            <div className="flex-1 overflow-y-auto hud-scroll space-y-2 pr-1">
              {stxLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`px-2.5 sm:px-3 py-2 border text-xs ${
                    entry.sender === 'STX'
                      ? 'border-[#00F0FF]/30 bg-[#06131D]/75 text-[#E6F8FF]'
                      : 'border-[#FF2A4B]/35 bg-[#190810]/70 text-[#FFE5EA]'
                  }`}
                >
                  <div className="flex justify-between font-mono-hud text-[8.5px] mb-0.5">
                    <span className={entry.sender === 'STX' ? 'text-[#00F0FF]' : 'text-[#FF2A4B]'}>
                      {entry.sender === 'STX' ? 'STX AI' : 'SANJU'}
                    </span>
                    <span className="text-[#E6F8FF]/45">{entry.timestamp}</span>
                  </div>
                  <p className="font-tactical text-xs">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <StxHologram
          listening={voiceActive}
          onToggleListening={onToggleVoice}
          lastResponse={lastStxReply}
          onSendCommand={onSendStxCommand}
          compact
        />
      );
    }

    // F. BRIEFING MODULE
    if (activeWedge === 'BRIEF') {
      return (
        <div className="flex flex-col justify-between h-full gap-2">
          <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-1.5 sm:pb-2 shrink-0">
            <div>
              <div className="font-mono-hud text-[9px] sm:text-[9.5px] text-[#00F0FF]">
                {opt.label} · MALIBU CLEAR
              </div>
              <div className="font-display text-xl sm:text-2xl font-bold text-[#E6F8FF]">31°C</div>
            </div>
            <div className="font-mono-hud text-[9px] sm:text-[9.5px] text-right text-[#E6F8FF]/65">
              <div>STEPS: {telemetry.steps.toLocaleString()}</div>
              <div>DIR: {getHeadingDir(telemetry.headingDeg)} {telemetry.headingDeg}°</div>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 flex-1 overflow-y-auto hud-scroll">
            {briefings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onToggleBriefing(b.id)}
                className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 border border-[#00F0FF]/20 hover:border-[#00F0FF]/60 text-left cursor-pointer gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="font-mono-hud text-[10px] text-[#00F0FF] shrink-0">{b.time}</span>
                  <span
                    className={`font-tactical text-xs sm:text-sm font-semibold truncate ${
                      b.priority === 'CLEAR' ? 'line-through text-[#E6F8FF]/45' : 'text-[#E6F8FF]'
                    }`}
                  >
                    {b.title}
                  </span>
                </div>
                <span
                  className={`font-mono-hud text-[8.5px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 border shrink-0 ${
                    b.priority === 'HIGH'
                      ? 'border-[#FF2A4B]/60 text-[#FF2A4B]'
                      : 'border-[#00F0FF]/45 text-[#00F0FF]'
                  }`}
                >
                  {b.priority}
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // G. VAULT MODULE
    if (activeWedge === 'VAULT') {
      const file = VAULT_FILES.find((v) => v.id === opt.id) ?? VAULT_FILES[0];
      const isUnlocked = unlockedVaultIds.includes(file.id);
      return (
        <div className="flex flex-col justify-between h-full gap-2 overflow-y-auto hud-scroll pr-0.5">
          <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-1.5 sm:pb-2 gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FolderLock className="w-4 h-4 text-[#00F0FF] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono-hud text-[11px] sm:text-xs font-bold text-[#E6F8FF] truncate">
                  {file.title}
                </div>
                <div className="font-mono-hud text-[8.5px] sm:text-[9px] text-[#00F0FF]/75 truncate">
                  {file.code} · {file.size} · {file.encryption}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                hudSound.playDetentClick();
                setUnlockedVaultIds((prev) =>
                  prev.includes(file.id) ? prev.filter((id) => id !== file.id) : [...prev, file.id]
                );
              }}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 border font-mono-hud text-[8.5px] sm:text-[9px] cursor-pointer shrink-0 ${
                isUnlocked
                  ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/15'
                  : 'border-[#FF2A4B] text-[#FF2A4B] bg-[#FF2A4B]/15'
              }`}
            >
              {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{isUnlocked ? 'DECRYPTED' : 'DECRYPT'}</span>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center border border-[#00F0FF]/20 bg-[#03060B] p-3 sm:p-4">
            {isUnlocked ? (
              <p className="font-tactical text-xs sm:text-sm text-[#9FEFFF] leading-relaxed">
                {file.preview}
              </p>
            ) : (
              <span className="font-mono-hud text-[10px] sm:text-xs tracking-[0.18em] text-[#FF2A4B] text-center">
                ENCRYPTED PAYLOAD · TAP DECRYPT
              </span>
            )}
          </div>
        </div>
      );
    }

    // H. CAMERA MODULE
    if (activeWedge === 'CAMERA') {
      return (
        <div className="relative h-full w-full border border-[#00F0FF]/25 bg-[#020408] overflow-hidden flex flex-col justify-between p-2.5 sm:p-3">
          {shutterFlash && <div className="absolute inset-0 bg-white/80 z-30 pointer-events-none" />}
          {liveCameraEnabled && isFront ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover opacity-75"
              style={{ transform: `scale(${cameraZoom})` }}
            />
          ) : (
            <div
              className="absolute inset-0 pointer-events-none transition-transform duration-300"
              style={{
                background:
                  cameraMode === 'THERMAL'
                    ? 'radial-gradient(circle at 50% 45%, rgba(255,42,75,0.34), rgba(0,240,255,0.1) 48%, #020306 85%)'
                    : cameraMode === 'NIGHT'
                      ? 'radial-gradient(circle at 50% 45%, rgba(0,240,255,0.22), #02070A 82%)'
                      : 'radial-gradient(circle at 50% 45%, rgba(230,248,255,0.08), #020306 80%)',
                transform: `scale(${cameraZoom})`,
              }}
            />
          )}

          <div className="relative z-10 flex items-center justify-between font-mono-hud text-[9px] sm:text-[9.5px] text-[#00F0FF]">
            <span>MODE: {cameraMode}</span>
            <span className="text-[#FF2A4B]">{cameraZoom.toFixed(1)}X · ISO 400</span>
          </div>

          <div className="relative z-10 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border border-[#00F0FF]/55 flex items-center justify-center relative">
              <div className="w-7 h-7 sm:w-10 sm:h-10 border border-[#FF2A4B]/70 rotate-45" />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleLiveCamera}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 border border-[#00F0FF]/50 bg-[#020408]/85 font-mono-hud text-[9px] sm:text-[9.5px] text-[#E6F8FF] cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>{liveCameraEnabled ? 'STOP LENS' : 'ENABLE LIVE LENS'}</span>
            </button>
            <span className="hidden sm:inline font-mono-hud text-[9px] text-[#E6F8FF]/65">
              DIAL CONTROLS OPTICS
            </span>
          </div>
        </div>
      );
    }

    // I. SEARCH MODULE
    const q = searchQuery.trim().toLowerCase();
    const filteredApps = apps.filter(
      (a) => !q || a.name.toLowerCase().includes(q) || a.packageId.toLowerCase().includes(q)
    );
    return (
      <div className="flex flex-col gap-2 h-full">
        <div className="relative flex items-center shrink-0">
          <Search className="w-4 h-4 text-[#00F0FF] absolute left-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH ANDROID APPS..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-[#03060B] border border-[#00F0FF]/40 focus:border-[#00F0FF] outline-none font-mono-hud text-[11px] sm:text-xs text-[#E6F8FF]"
          />
        </div>
        <div className="flex-1 overflow-y-auto hud-scroll space-y-1.5">
          {filteredApps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => (onLaunchApp ? onLaunchApp(app) : onSelectSubOption(app.id, true))}
              className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 border border-[#00F0FF]/20 hover:border-[#00F0FF]/65 text-left cursor-pointer gap-2"
            >
              <span className="font-display text-xs text-[#E6F8FF] truncate">{app.name}</span>
              <span className="font-mono-hud text-[9px] sm:text-[9.5px] text-[#00F0FF] truncate">
                {app.packageId}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const stepX = containerW < 380 ? 52 : containerW < 540 ? 78 : 112;

  return (
    <div
      ref={containerRef}
      onPointerDown={handleCardPointerDown}
      onPointerUp={handleCardPointerUp}
      className="relative h-full w-full flex items-center justify-center overflow-hidden touch-pan-y"
      style={{ perspective: '1000px' }}
    >
      {dialOptions.map((opt, idx) => {
        const offset = getCircularOffset(idx, activeIdx, dialOptions.length);
        const absOffset = Math.abs(offset);
        if (absOffset > 2) return null;

        const isFront = offset === 0;
        const translateX = offset * stepX;
        const scale = isFront ? 1 : absOffset === 1 ? 0.88 : 0.78;
        const opacity = isFront ? 1 : absOffset === 1 ? 0.36 : 0.14;
        const rotateY = offset * -9;
        const zIndex = 30 - absOffset * 10;

        return (
          <motion.div
            key={opt.id}
            initial={false}
            animate={{
              x: translateX,
              scale,
              opacity,
              rotateY,
            }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 32,
              mass: 0.75,
            }}
            onClick={() => {
              if (!isFront) {
                hudSound.playDetentClick();
                onSelectSubOption(opt.id, false);
              }
            }}
            style={{
              zIndex,
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
            }}
            className={`absolute w-[90%] sm:w-[78%] md:w-[72%] h-[94%] sm:h-[92%] border bg-[#040810]/96 p-3 sm:p-5 flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.85)] ${
              isFront
                ? 'border-[#00F0FF]/50 pointer-events-auto'
                : 'border-[#00F0FF]/20 cursor-pointer pointer-events-auto'
            }`}
          >
            <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#00F0FF]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#00F0FF]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#FF2A4B]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-[#00F0FF]" />

            <div className="flex items-center justify-between mb-1.5 sm:mb-2 shrink-0 gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-mono-hud text-xs sm:text-sm font-bold text-[#E6F8FF] shrink-0">
                  {opt.shortCode}
                </span>
                <span className="font-mono-hud text-[8.5px] sm:text-[9.5px] tracking-[0.16em] text-[#00F0FF]/75 truncate">
                  {activeWedge}
                  {selectedApp ? ` // ${selectedApp.name}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full border border-[#FF2A4B] flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-[#FF2A4B]" />
                </span>
                <span className="px-1.5 py-0.5 border border-[#FF2A4B]/70 font-mono-hud text-[7.5px] sm:text-[8px] font-bold tracking-widest text-[#FF2A4B]">
                  LIVE
                </span>
              </div>
            </div>

            <div className={`flex-1 min-h-0 ${!isFront ? 'pointer-events-none select-none' : ''}`}>
              {renderCardContent(opt, isFront)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
