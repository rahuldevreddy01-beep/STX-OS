import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Bell,
  Camera,
  Check,
  ChevronRight,
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
  DialOption,
  QuickToggles,
  StxLogEntry,
  WedgeId,
  WifiNetwork,
} from '../types/hud';
import { hudSound } from '../utils/soundFx';
import { CircularMicroGauge } from './MicroGauge';
import { StxHologram } from './StxHologram';

interface CenterCarouselProps {
  activeWedge: WedgeId;
  dialOptions: DialOption[];
  activeSubId: string;
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
  batteryPct: number;
  memPct: number;
  cameraMode: 'OPTICAL' | 'THERMAL' | 'NIGHT';
  cameraZoom: number;
  liveCameraEnabled: boolean;
  onToggleLiveCamera: () => void;
  shutterFlash: boolean;
}

const LiveEcgStrip: React.FC<{ bpm?: number }> = ({ bpm = 72 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let offset = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(160, rect.width);
      const h = 58;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      offset += (bpm / 60) * 1.8;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 42, 75, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.lineTo(w, h * 0.65);
      ctx.stroke();

      ctx.strokeStyle = '#FF2A4B';
      ctx.lineWidth = 1.75;
      ctx.shadowColor = '#FF2A4B';
      ctx.shadowBlur = 7;
      ctx.beginPath();

      for (let x = 0; x <= w; x += 2) {
        const phase = ((x + offset) % 88) / 88;
        let y = h * 0.65;
        if (phase > 0.12 && phase < 0.2) {
          y -= Math.sin(((phase - 0.12) / 0.08) * Math.PI) * 5;
        } else if (phase >= 0.28 && phase < 0.32) {
          y += 5;
        } else if (phase >= 0.32 && phase < 0.37) {
          y -= Math.sin(((phase - 0.32) / 0.05) * Math.PI) * 28;
        } else if (phase >= 0.37 && phase < 0.42) {
          y += Math.sin(((phase - 0.37) / 0.05) * Math.PI) * 12;
        } else if (phase >= 0.52 && phase < 0.66) {
          y -= Math.sin(((phase - 0.52) / 0.14) * Math.PI) * 9;
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [bpm]);

  return <canvas ref={canvasRef} className="w-full h-[58px] block" />;
};

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let diff = index - activeIndex;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

export const CenterCarousel: React.FC<CenterCarouselProps> = ({
  activeWedge,
  dialOptions,
  activeSubId,
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
  batteryPct,
  memPct,
  cameraMode,
  cameraZoom,
  liveCameraEnabled,
  onToggleLiveCamera,
  shutterFlash,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockedVaultIds, setUnlockedVaultIds] = useState<string[]>(['v1']);
  const [cacheToast, setCacheToast] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeIdx = Math.max(
    0,
    dialOptions.findIndex((o) => o.id === activeSubId)
  );
  const connectedWifi = networks.find((n) => n.connected) ?? networks[0];
  const lastStxReply =
    [...stxLogs].reverse().find((l) => l.sender === 'STX')?.text ??
    'STX AI neural link ready.';

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

  const renderCardContent = (opt: DialOption, isFront: boolean) => {
    // A. DEEP APP SETTINGS (Level 2 inside APPS)
    if (activeWedge === 'APPS' && selectedApp) {
      const liveApp = apps.find((a) => a.id === selectedApp.id) ?? selectedApp;
      return (
        <div className="flex flex-col justify-between h-full gap-3">
          <div className="flex items-start justify-between border-b border-[#00F0FF]/15 pb-2.5">
            <div>
              <div className="font-mono-hud text-[9.5px] tracking-[0.18em] text-[#00F0FF]/80">
                {liveApp.packageId}
              </div>
              <h3 className="font-display text-xl font-bold tracking-[0.12em] text-[#E6F8FF] text-glow-cyan mt-0.5">
                {liveApp.name} // {opt.label}
              </h3>
            </div>
            <span className="font-mono-hud text-[10px] px-2 py-0.5 border border-[#00F0FF]/45 text-[#00F0FF]">
              {liveApp.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 flex-1 content-center">
            <button
              type="button"
              onClick={() => onToggleAppSetting(liveApp.id, 'pinnedToDock')}
              className={`flex items-center justify-between px-3 py-2.5 border text-left cursor-pointer ${
                liveApp.pinnedToDock
                  ? 'border-[#00F0FF] bg-[#00F0FF]/14 text-[#E6F8FF]'
                  : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/60'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[10px]">
                <Pin className="w-3.5 h-3.5 text-[#00F0FF]" />
                PIN ARC DOCK
              </span>
              <span className="font-mono-hud text-[9.5px] font-bold">
                {liveApp.pinnedToDock ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleAppSetting(liveApp.id, 'notificationsEnabled')}
              className={`flex items-center justify-between px-3 py-2.5 border text-left cursor-pointer ${
                liveApp.notificationsEnabled
                  ? 'border-[#00F0FF] bg-[#00F0FF]/14 text-[#E6F8FF]'
                  : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/60'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[10px]">
                <Bell className="w-3.5 h-3.5 text-[#00F0FF]" />
                ALERTS
              </span>
              <span className="font-mono-hud text-[9.5px] font-bold">
                {liveApp.notificationsEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleAppSetting(liveApp.id, 'backgroundSync')}
              className={`flex items-center justify-between px-3 py-2.5 border text-left cursor-pointer ${
                liveApp.backgroundSync
                  ? 'border-[#00F0FF] bg-[#00F0FF]/14 text-[#E6F8FF]'
                  : 'border-[#00F0FF]/20 bg-[#050910] text-[#E6F8FF]/60'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[10px]">
                <RefreshCw className="w-3.5 h-3.5 text-[#00F0FF]" />
                BG SYNC
              </span>
              <span className="font-mono-hud text-[9.5px] font-bold">
                {liveApp.backgroundSync ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClearAppCache(liveApp.id);
                setCacheToast('CACHE PURGED · 0 KB');
                setTimeout(() => setCacheToast(null), 2000);
              }}
              className="flex items-center justify-between px-3 py-2.5 border border-[#FF2A4B]/45 bg-[#FF2A4B]/10 hover:bg-[#FF2A4B]/20 text-[#FFE5EA] cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-mono-hud text-[10px]">
                <Trash2 className="w-3.5 h-3.5 text-[#FF2A4B]" />
                CLEAR CACHE
              </span>
              <span className="font-mono-hud text-[9.5px] text-[#FF2A4B]">EXEC</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#00F0FF]/15 font-mono-hud text-[9.5px] text-[#E6F8FF]/70">
            <span>PERMS: {liveApp.permissions}</span>
            <button
              type="button"
              onClick={() => onSelectSubOption(opt.id, true)}
              className="px-2.5 py-1 border border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#E6F8FF] hover:bg-[#00F0FF]/30 cursor-pointer"
            >
              {cacheToast ?? `RUN: ${opt.label}`}
            </button>
          </div>
        </div>
      );
    }

    // B. APPS CAROUSEL CARDS (Matches Screenshot 02 multi-card look!)
    if (activeWedge === 'APPS') {
      const app = apps.find((a) => a.id === opt.id) ?? apps[0];
      return (
        <div className="flex flex-col justify-between h-full gap-2.5">
          <div className="flex items-start justify-between border-b border-[#00F0FF]/15 pb-2">
            <div>
              <div className="font-mono-hud text-[9px] tracking-[0.2em] text-[#00F0FF]/75">
                {app.category} · {app.packageId}
              </div>
              <h3 className="font-display text-xl font-bold tracking-[0.12em] text-[#E6F8FF] text-glow-cyan mt-0.5">
                {app.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectSubOption(app.id, true)}
              className="flex items-center gap-1 px-2.5 py-1 border border-[#00F0FF] bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 font-mono-hud text-[9.5px] tracking-wider text-[#E6F8FF] cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>IN-APP DIAL</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Crisp Key-Value App Telemetry Rows (Filled padding, matches Screenshot!) */}
          <div className="space-y-2 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between font-mono-hud text-[10.5px] border-b border-[#00F0FF]/10 pb-1">
              <span className="text-[#E6F8FF]/55">STATE</span>
              <span className="text-[#00F0FF] font-bold">{app.status}</span>
            </div>
            <div className="flex items-center justify-between font-mono-hud text-[10.5px] border-b border-[#00F0FF]/10 pb-1">
              <span className="text-[#E6F8FF]/55">PERMISSIONS</span>
              <span className="text-[#E6F8FF]">{app.permissions}</span>
            </div>
            <div className="flex items-center justify-between font-mono-hud text-[10.5px] border-b border-[#00F0FF]/10 pb-1">
              <span className="text-[#E6F8FF]/55">ARC DOCK PIN</span>
              <button
                type="button"
                onClick={() => onToggleAppSetting(app.id, 'pinnedToDock')}
                className={`px-2 py-0.5 border text-[9px] cursor-pointer ${
                  app.pinnedToDock
                    ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10'
                    : 'border-[#E6F8FF]/25 text-[#E6F8FF]/55'
                }`}
              >
                {app.pinnedToDock ? 'PINNED' : 'UNPINNED'}
              </button>
            </div>
            <div className="flex items-center justify-between font-mono-hud text-[10.5px]">
              <span className="text-[#E6F8FF]/55">ALERTS / SYNC</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleAppSetting(app.id, 'notificationsEnabled')}
                  className={`px-2 py-0.5 border text-[9px] cursor-pointer ${
                    app.notificationsEnabled
                      ? 'border-[#00F0FF]/60 text-[#E6F8FF]'
                      : 'border-[#FF2A4B]/50 text-[#FF2A4B]'
                  }`}
                >
                  {app.notificationsEnabled ? 'ALERTS ON' : 'MUTED'}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAppSetting(app.id, 'backgroundSync')}
                  className={`px-2 py-0.5 border text-[9px] cursor-pointer ${
                    app.backgroundSync
                      ? 'border-[#00F0FF]/60 text-[#00F0FF]'
                      : 'border-[#E6F8FF]/20 text-[#E6F8FF]/45'
                  }`}
                >
                  {app.backgroundSync ? 'SYNC' : 'IDLE'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#00F0FF]/15">
            <div className="flex items-center gap-2">
              <Grid className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="font-mono-hud text-[9px] text-[#E6F8FF]/65">
                ROTATE DIAL TO BROWSE APPS
              </span>
            </div>
            {app.targetWedge && (
              <button
                type="button"
                onClick={() => onSelectSubOption(app.id, true)}
                className="font-mono-hud text-[9.5px] text-[#FF2A4B] font-bold hover:underline cursor-pointer"
              >
                CONFIGURE →
              </button>
            )}
          </div>
        </div>
      );
    }

    // C. HEALTH CAROUSEL CARDS (Each dial notch smoothly shows its own persistent card!)
    if (activeWedge === 'HEALTH') {
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
            ['RESTING', '58 BPM'],
            ['SPO2', '99%'],
            ['VO2 MAX', '54.2'],
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
        'h-steps': {
          val: '8,412',
          unit: 'STEPS',
          sub: '6.3 KM · 412 KCAL ACTIVE',
          bpm: 94,
          rows: [
            ['CADENCE', '114 SPM'],
            ['ELEVATION', '42 M'],
            ['PACE', '5:18 /KM'],
            ['GOAL', '84%'],
          ],
        },
        'h-spo2': {
          val: '99',
          unit: '%',
          sub: 'BLOOD OXYGEN SATURATION',
          bpm: 68,
          rows: [
            ['ALTITUDE', '18 M'],
            ['RESP RATE', '14 /MIN'],
            ['PERFUSION', '4.2%'],
            ['STATUS', 'OPTIMAL'],
          ],
        },
        'h-vo2': {
          val: '54.2',
          unit: 'ML/KG',
          sub: 'CARDIOVASCULAR CAPACITY',
          bpm: 82,
          rows: [
            ['AEROBIC', 'PEAK'],
            ['THRESHOLD', '168 BPM'],
            ['CORE PWR', `${batteryPct}%`],
            ['MEM', `${memPct}%`],
          ],
        },
      };
      const m = metricMap[opt.id] ?? metricMap['h-ecg'];

      return (
        <div className="flex flex-col justify-between h-full gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FF2A4B]" />
              <span className="font-display text-base font-bold tracking-[0.14em] text-[#E6F8FF]">
                {opt.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-hud text-2xl font-bold text-[#E6F8FF]">{m.val}</span>
              <span className="font-mono-hud text-[9.5px] text-[#00F0FF]">{m.unit}</span>
            </div>
          </div>

          <div className="font-mono-hud text-[9.5px] tracking-[0.14em] text-[#E6F8FF]/65">
            {m.sub}
          </div>

          <div className="border-y border-[#FF2A4B]/20 py-1.5">
            {isFront ? (
              <LiveEcgStrip bpm={m.bpm} />
            ) : (
              <div className="h-[58px] flex items-center">
                <div className="w-full h-[1.5px] bg-[#FF2A4B]/50" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {m.rows.map(([k, v]) => (
              <div key={k} className="border-l border-[#00F0FF]/25 pl-2">
                <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/50">{k}</div>
                <div className="font-mono-hud text-[11px] font-bold text-[#E6F8FF]">{v}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // D. WIFI CAROUSEL CARDS (Matches Screenshot_From_2026-11-19_12-19-49_40b8c24c.png!)
    if (activeWedge === 'WIFI') {
      return (
        <div className="flex flex-col justify-between h-full gap-2.5">
          <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-2">
            <div>
              <h3 className="font-display text-lg font-bold tracking-[0.14em] text-[#E6F8FF] text-glow-cyan">
                WIFI // {opt.label}
              </h3>
              <p className="font-mono-hud text-[9.5px] text-[#00F0FF]/80">
                {toggles.wifi
                  ? `${connectedWifi.ssid} · ${connectedWifi.band} · ${connectedWifi.latencyMs}ms`
                  : 'RF TRANSCEIVER DISABLED'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleControl('wifi')}
              className={`flex items-center gap-1.5 px-2.5 py-1 border font-mono-hud text-[9.5px] tracking-widest cursor-pointer ${
                toggles.wifi
                  ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#E6F8FF]'
                  : 'border-[#FF2A4B] bg-[#FF2A4B]/15 text-[#FF2A4B]'
              }`}
            >
              {toggles.wifi ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{toggles.wifi ? 'LINK UP' : 'OFFLINE'}</span>
            </button>
          </div>

          {opt.id === 'w-overview' || opt.id === 'w-band' || opt.id === 'w-toggle' ? (
            <>
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                <div className="flex justify-between font-mono-hud text-[10.5px] border-b border-[#00F0FF]/10 pb-1">
                  <span className="text-[#E6F8FF]/55">SSID</span>
                  <span className="text-[#E6F8FF] font-bold">{connectedWifi.ssid}</span>
                </div>
                <div className="flex justify-between font-mono-hud text-[10.5px] border-b border-[#00F0FF]/10 pb-1">
                  <span className="text-[#E6F8FF]/55">IPv4 ADDRESS</span>
                  <span className="text-[#00F0FF]">10.42.0.18</span>
                </div>
                <div className="flex justify-between font-mono-hud text-[10.5px] border-b border-[#00F0FF]/10 pb-1">
                  <span className="text-[#E6F8FF]/55">THROUGHPUT</span>
                  <span className="text-[#E6F8FF]">2.4 GBPS · {connectedWifi.band}</span>
                </div>
                <div className="flex justify-between font-mono-hud text-[10.5px]">
                  <span className="text-[#E6F8FF]/55">SECURITY</span>
                  <span className="text-[#00F0FF]">{connectedWifi.security}</span>
                </div>
              </div>

              <div className="flex items-center justify-around pt-1 border-t border-[#00F0FF]/15">
                <CircularMicroGauge
                  value={toggles.wifi ? connectedWifi.signal : 0}
                  label={toggles.wifi ? `${connectedWifi.signal}%` : 'OFF'}
                  subLabel="SIGNAL"
                  accent={toggles.wifi ? 'cyan' : 'crimson'}
                  size={64}
                />
                <CircularMicroGauge
                  value={toggles.wifi ? 92 : 0}
                  label={toggles.wifi ? `${connectedWifi.latencyMs}ms` : '--'}
                  subLabel="PING"
                  accent="crimson"
                  size={64}
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
                    className={`w-full flex items-center justify-between px-3 py-2 border text-left cursor-pointer disabled:opacity-40 ${
                      isConn
                        ? 'border-[#00F0FF] bg-[#00F0FF]/14'
                        : 'border-[#00F0FF]/20 bg-[#05080D]/70 hover:border-[#00F0FF]/55'
                    }`}
                  >
                    <div>
                      <div className="font-mono-hud text-[11px] font-semibold text-[#E6F8FF]">
                        {net.ssid}
                      </div>
                      <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55">
                        {net.band} · {net.security} · {net.latencyMs}ms
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
            <div className="font-display text-sm font-bold tracking-[0.14em] text-[#E6F8FF] border-b border-[#00F0FF]/15 pb-1.5">
              STX AI // COMMAND LOG
            </div>
            <div className="flex-1 overflow-y-auto hud-scroll space-y-2 pr-1">
              {stxLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`px-3 py-2 border text-xs ${
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
        <div className="flex flex-col justify-between h-full gap-2.5">
          <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-2">
            <div>
              <div className="font-mono-hud text-[9.5px] text-[#00F0FF]">
                {opt.label} · MALIBU CLEAR
              </div>
              <div className="font-display text-2xl font-bold text-[#E6F8FF]">31°C</div>
            </div>
            <div className="font-mono-hud text-[9.5px] text-right text-[#E6F8FF]/65">
              <div>WIND 12 KT WNW</div>
              <div>BARO 1016 HPA</div>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto hud-scroll">
            {briefings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onToggleBriefing(b.id)}
                className="w-full flex items-center justify-between px-3 py-2 border border-[#00F0FF]/20 hover:border-[#00F0FF]/60 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono-hud text-[10.5px] text-[#00F0FF]">{b.time}</span>
                  <span
                    className={`font-tactical text-sm font-semibold truncate ${
                      b.priority === 'CLEAR' ? 'line-through text-[#E6F8FF]/45' : 'text-[#E6F8FF]'
                    }`}
                  >
                    {b.title}
                  </span>
                </div>
                <span
                  className={`font-mono-hud text-[9px] px-2 py-0.5 border ${
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
        <div className="flex flex-col justify-between h-full gap-2.5">
          <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <FolderLock className="w-4 h-4 text-[#00F0FF] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono-hud text-xs font-bold text-[#E6F8FF] truncate">
                  {file.title}
                </div>
                <div className="font-mono-hud text-[9px] text-[#00F0FF]/75">
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
              className={`flex items-center gap-1 px-2.5 py-1 border font-mono-hud text-[9px] cursor-pointer ${
                isUnlocked
                  ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/15'
                  : 'border-[#FF2A4B] text-[#FF2A4B] bg-[#FF2A4B]/15'
              }`}
            >
              {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{isUnlocked ? 'DECRYPTED' : 'DECRYPT'}</span>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center border border-[#00F0FF]/20 bg-[#03060B] p-4">
            {isUnlocked ? (
              <p className="font-tactical text-sm text-[#9FEFFF] leading-relaxed">
                {file.preview}
              </p>
            ) : (
              <span className="font-mono-hud text-xs tracking-[0.22em] text-[#FF2A4B]">
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
        <div className="relative h-full w-full border border-[#00F0FF]/25 bg-[#020408] overflow-hidden flex flex-col justify-between p-3">
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
              className="absolute inset-0 pointer-events-none transition-all duration-300"
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

          <div className="relative z-10 flex items-center justify-between font-mono-hud text-[9.5px] text-[#00F0FF]">
            <span>MODE: {cameraMode}</span>
            <span className="text-[#FF2A4B]">{cameraZoom.toFixed(1)}X · ISO 400</span>
          </div>

          <div className="relative z-10 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border border-[#00F0FF]/55 flex items-center justify-center relative">
              <div className="w-10 h-10 border border-[#FF2A4B]/70 rotate-45" />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleLiveCamera}
              className="flex items-center gap-1.5 px-3 py-1 border border-[#00F0FF]/50 bg-[#020408]/85 font-mono-hud text-[9.5px] text-[#E6F8FF] cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>{liveCameraEnabled ? 'STOP LENS' : 'ENABLE LIVE LENS'}</span>
            </button>
            <span className="font-mono-hud text-[9px] text-[#E6F8FF]/65">
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
      <div className="flex flex-col gap-2.5 h-full">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#00F0FF] absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH APPS & PACKAGES..."
            className="w-full pl-9 pr-3 py-2 bg-[#03060B] border border-[#00F0FF]/40 focus:border-[#00F0FF] outline-none font-mono-hud text-xs text-[#E6F8FF]"
          />
        </div>
        <div className="flex-1 overflow-y-auto hud-scroll space-y-1.5">
          {filteredApps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelectSubOption(app.id, true)}
              className="w-full flex items-center justify-between px-3 py-2 border border-[#00F0FF]/20 hover:border-[#00F0FF]/65 text-left cursor-pointer"
            >
              <span className="font-display text-xs text-[#E6F8FF]">{app.name}</span>
              <span className="font-mono-hud text-[9.5px] text-[#00F0FF]">{app.packageId}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative h-full w-full flex items-center justify-center overflow-hidden"
      style={{ perspective: '1100px' }}
    >
      {dialOptions.map((opt, idx) => {
        const offset = getCircularOffset(idx, activeIdx, dialOptions.length);
        const absOffset = Math.abs(offset);
        if (absOffset > 2) return null;

        const isFront = offset === 0;
        const translateX = offset * 115;
        const scale = isFront ? 1 : absOffset === 1 ? 0.87 : 0.76;
        const opacity = isFront ? 1 : absOffset === 1 ? 0.34 : 0.14;
        const rotateY = offset * -10;
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
              stiffness: 290,
              damping: 28,
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
            }}
            className={`absolute w-[76%] sm:w-[72%] h-[92%] border bg-[#04070D]/92 backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.9)] ${
              isFront
                ? 'border-[#00F0FF]/45 pointer-events-auto'
                : 'border-[#00F0FF]/20 cursor-pointer pointer-events-auto'
            }`}
          >
            {/* Corner Brackets */}
            <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#00F0FF]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#00F0FF]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#FF2A4B]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-[#00F0FF]" />

            {/* Card Top Index + LIVE Badge */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono-hud text-sm font-bold text-[#E6F8FF]">
                  {opt.shortCode}
                </span>
                <span className="font-mono-hud text-[9.5px] tracking-[0.18em] text-[#00F0FF]/75">
                  {activeWedge}
                  {selectedApp ? ` // ${selectedApp.name}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-[#FF2A4B] flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-[#FF2A4B]" />
                </span>
                <span className="px-1.5 py-0.5 border border-[#FF2A4B]/70 font-mono-hud text-[8px] font-bold tracking-widest text-[#FF2A4B]">
                  LIVE
                </span>
              </div>
            </div>

            {/* Persistent Card Content — never unmounts/blinks while rotating */}
            <div className={`flex-1 min-h-0 ${!isFront ? 'pointer-events-none select-none' : ''}`}>
              {renderCardContent(opt, isFront)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
