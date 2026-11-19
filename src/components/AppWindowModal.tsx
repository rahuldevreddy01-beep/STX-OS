import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BatteryCharging,
  Bluetooth,
  Compass,
  Delete,
  Flashlight,
  Globe,
  HardDrive,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Music,
  Pause,
  Phone,
  PhoneOff,
  Play,
  RefreshCw,
  Send,
  Settings,
  Sliders,
  Smartphone,
  Sun,
  Terminal,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { AMBIENT_TRACKS } from '../data/hudData';
import {
  AppItem,
  DeviceTelemetry,
  OsPreferences,
  QuickToggles,
  WifiNetwork,
} from '../types/hud';
import { hudSound } from '../utils/soundFx';
import { CompassRadarDial } from './MicroGauge';

interface AppWindowModalProps {
  app: AppItem;
  apps: AppItem[];
  onClose: () => void;
  onOpenAppDial: (app: AppItem) => void;
  telemetry: DeviceTelemetry;
  toggles: QuickToggles;
  onToggleControl: (key: keyof QuickToggles) => void;
  networks: WifiNetwork[];
  onConnectNetwork: (ssid: string) => void;
  prefs: OsPreferences;
  onUpdatePrefs: (patch: Partial<OsPreferences>) => void;
  onEnableSensors: () => Promise<boolean>;
  onResetSteps: () => void;
  onScanBluetooth: () => Promise<string | null>;
  onRequestGps: () => void;
  onTriggerHaptic: (ms?: number | number[]) => void;
  onClearAppCache: (appId: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  trackIndex: number;
  onStepTrack: (dir: -1 | 1) => void;
}

function getHeadingLabel(deg: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export const AppWindowModal: React.FC<AppWindowModalProps> = ({
  app,
  apps,
  onClose,
  onOpenAppDial,
  telemetry,
  toggles,
  onToggleControl,
  networks,
  onConnectNetwork,
  prefs,
  onUpdatePrefs,
  onEnableSensors,
  onResetSteps,
  onScanBluetooth,
  onRequestGps,
  onTriggerHaptic,
  onClearAppCache,
  isPlaying,
  onTogglePlay,
  trackIndex,
  onStepTrack,
}) => {
  const [maximized, setMaximized] = useState(false);

  // Settings tab
  const [settingsTab, setSettingsTab] = useState<
    'network' | 'display' | 'sensors' | 'battery' | 'sound' | 'about'
  >('sensors');

  // Phone state
  const [dialNumber, setDialNumber] = useState('');
  const [activeCall, setActiveCall] = useState<{ number: string; sec: number } | null>(null);

  // Messages state
  const [threads, setThreads] = useState([
    {
      id: 't1',
      name: 'PEPPER POTTS',
      msgs: [
        { from: 'THEM', text: 'Board briefing starts at 13:00. Telemetry link ready?', time: '12:41' },
        { from: 'ME', text: 'Confirmed. Stark OS HUD online.', time: '12:43' },
      ],
    },
    {
      id: 't2',
      name: 'HAPPY HOGAN',
      msgs: [{ from: 'THEM', text: 'Perimeter sensors green at Malibu Bay.', time: '11:18' }],
    },
    {
      id: 't3',
      name: 'STARK LABS OPS',
      msgs: [{ from: 'THEM', text: 'Firmware v15.2 OTA verified on local node.', time: '09:05' }],
    },
  ]);
  const [activeThreadId, setActiveThreadId] = useState('t1');
  const [msgDraft, setMsgDraft] = useState('');

  // Browser state
  const [browserUrl, setBrowserUrl] = useState('https://en.m.wikipedia.org/wiki/Iron_Man');
  const [urlInput, setUrlInput] = useState('https://en.m.wikipedia.org/wiki/Iron_Man');

  // Terminal state
  const [termInput, setTermInput] = useState('');
  const [termLines, setTermLines] = useState<string[]>([
    'STARK-OS ZSH v15.2 // SANDBOX SHELL',
    'Type "help" for real device telemetry commands.',
  ]);

  // Calc state
  const [calcExpr, setCalcExpr] = useState('0');

  // Clock stopwatch state
  const [swRunning, setSwRunning] = useState(false);
  const [swMs, setSwMs] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);

  // Notes state
  const [noteText, setNoteText] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('stark_os_notes') ||
        'STARK OS FIELD NOTES\n- Verify gyro & pedometer calibration\n- Test full-edge torch in dark environment'
      );
    } catch {
      return '';
    }
  });

  // Active call timer
  useEffect(() => {
    if (!activeCall) return;
    const id = window.setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, sec: prev.sec + 1 } : null));
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeCall]);

  // Stopwatch interval
  useEffect(() => {
    if (!swRunning) return;
    const start = performance.now() - swMs;
    const id = window.setInterval(() => {
      setSwMs(performance.now() - start);
    }, 50);
    return () => window.clearInterval(id);
  }, [swRunning]);

  const handleSaveNotes = (val: string) => {
    setNoteText(val);
    try {
      localStorage.setItem('stark_os_notes', val);
    } catch {
      // ignore
    }
  };

  const runTerminalCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = termInput.trim();
    if (!raw) return;
    const cmd = raw.toLowerCase();
    let out: string[] = [];
    if (cmd === 'help') {
      out = ['Commands: help, battery, sensors, net, apps, uptime, date, clear'];
    } else if (cmd === 'clear') {
      setTermLines([]);
      setTermInput('');
      return;
    } else if (cmd === 'battery') {
      out = [
        `LEVEL: ${telemetry.batteryPct}% | STATE: ${telemetry.isCharging ? 'CHARGING' : 'DISCHARGING'} | API: ${telemetry.batterySupported ? 'HARDWARE' : 'ESTIMATED'}`,
      ];
    } else if (cmd === 'sensors') {
      out = [
        `STEPS: ${telemetry.steps} | ACCEL: ${telemetry.accelMag} m/s²`,
        `GYRO: HEADING ${telemetry.headingDeg}° (${getHeadingLabel(telemetry.headingDeg)}) | PITCH ${telemetry.pitchDeg}° | ROLL ${telemetry.rollDeg}°`,
      ];
    } else if (cmd === 'net') {
      out = [
        `STATUS: ${telemetry.online ? 'ONLINE' : 'OFFLINE'} | LINK: ${telemetry.netType} | SPEED: ${telemetry.downlinkMbps} Mbps | RTT: ${telemetry.rttMs} ms`,
        `BT: ${telemetry.btStatus}`,
      ];
    } else if (cmd === 'apps') {
      out = [apps.map((a) => `${a.name}(${a.packageId})`).join(' · ')];
    } else if (cmd === 'uptime') {
      out = [`UPTIME: ${formatUptime(telemetry.uptimeSec)} | CORES: ${telemetry.cpuCores}`];
    } else if (cmd === 'date') {
      out = [new Date().toString()];
    } else {
      out = [`zsh: command executed -> ${raw}`];
    }
    setTermLines((prev) => [...prev.slice(-24), `$ ${raw}`, ...out]);
    setTermInput('');
  };

  const handleCalcPress = (btn: string) => {
    onTriggerHaptic(8);
    hudSound.playDetentClick();
    if (btn === 'C') {
      setCalcExpr('0');
      return;
    }
    if (btn === 'DEL') {
      setCalcExpr((p) => (p.length > 1 ? p.slice(0, -1) : '0'));
      return;
    }
    if (btn === '=') {
      try {
        const sanitized = calcExpr.replace(/[^0-9+\-*/.%()]/g, '');
        const res = Function(`"use strict"; return (${sanitized})`)();
        setCalcExpr(Number.isFinite(res) ? String(+Number(res).toFixed(6)) : 'ERR');
      } catch {
        setCalcExpr('ERR');
      }
      return;
    }
    setCalcExpr((p) => (p === '0' || p === 'ERR' ? btn : p + btn));
  };

  const renderWindowBody = () => {
    const kind = app.windowApp ?? 'settings';

    // 1. NATIVE ANDROID SETTINGS
    if (kind === 'settings') {
      const tabs = [
        { id: 'sensors', label: 'SENSORS', icon: <Activity className="w-3.5 h-3.5" /> },
        { id: 'network', label: 'NET & BT', icon: <Wifi className="w-3.5 h-3.5" /> },
        { id: 'display', label: 'DISPLAY', icon: <Sun className="w-3.5 h-3.5" /> },
        { id: 'battery', label: 'BATTERY', icon: <BatteryCharging className="w-3.5 h-3.5" /> },
        { id: 'sound', label: 'SOUND', icon: <Volume2 className="w-3.5 h-3.5" /> },
        { id: 'about', label: 'DEVICE', icon: <Smartphone className="w-3.5 h-3.5" /> },
      ] as const;

      return (
        <div className="flex flex-col sm:flex-row h-full gap-2.5 min-h-0">
          {/* Sidebar / Top Tabs */}
          <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto hud-scroll sm:w-36 shrink-0 pb-1 sm:pb-0 sm:border-r border-[#00F0FF]/15 sm:pr-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onTriggerHaptic(8);
                  hudSound.playDetentClick();
                  setSettingsTab(t.id);
                }}
                className={`flex items-center gap-2 px-2.5 py-2 border font-mono-hud text-[9.5px] tracking-wider whitespace-nowrap shrink-0 cursor-pointer ${
                  settingsTab === t.id
                    ? 'border-[#00F0FF] bg-[#00F0FF]/18 text-white'
                    : 'border-[#00F0FF]/20 bg-[#040912] text-[#9FEFFF]/70 hover:border-[#00F0FF]/50'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="flex-1 min-h-0 overflow-y-auto hud-scroll space-y-2.5 pr-1">
            {settingsTab === 'sensors' && (
              <>
                <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono-hud text-[9px] text-[#00F0FF]">MOBILE MOTION SENSORS</div>
                    <div className="font-display text-sm font-bold text-white mt-0.5">
                      PEDOMETER & GYROSCOPE
                    </div>
                    <div className="font-mono-hud text-[9px] text-[#E6F8FF]/65 mt-0.5">
                      {telemetry.stepActive || telemetry.gyroActive
                        ? 'LIVE HARDWARE STREAM ACTIVE'
                        : telemetry.sensorNeedsPermission
                          ? 'PERMISSION REQUIRED ON THIS DEVICE'
                          : 'LISTENING FOR DEVICE MOTION'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        onTriggerHaptic(15);
                        await onEnableSensors();
                      }}
                      className="px-2.5 py-1.5 border border-[#00F0FF] bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 font-mono-hud text-[9.5px] text-white cursor-pointer"
                    >
                      CALIBRATE / ENABLE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onTriggerHaptic(10);
                        onResetSteps();
                      }}
                      className="px-2.5 py-1.5 border border-[#FF2A4B]/50 bg-[#FF2A4B]/10 hover:bg-[#FF2A4B]/25 font-mono-hud text-[9.5px] text-[#FFB4C0] cursor-pointer"
                    >
                      RESET STEPS
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 border border-[#00F0FF]/20 bg-[#040912]">
                    <div className="font-mono-hud text-[8.5px] text-[#00F0FF]">TODAY STEPS</div>
                    <div className="font-mono-hud text-lg font-bold text-white tabular-nums mt-0.5">
                      {telemetry.steps.toLocaleString()}
                    </div>
                    <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55">
                      {(telemetry.steps * 0.00075).toFixed(2)} KM
                    </div>
                  </div>
                  <div className="p-2.5 border border-[#00F0FF]/20 bg-[#040912]">
                    <div className="font-mono-hud text-[8.5px] text-[#00F0FF]">COMPASS DIR</div>
                    <div className="font-mono-hud text-lg font-bold text-white tabular-nums mt-0.5">
                      {getHeadingLabel(telemetry.headingDeg)} {telemetry.headingDeg}°
                    </div>
                    <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55">MAGNETOMETER</div>
                  </div>
                  <div className="p-2.5 border border-[#00F0FF]/20 bg-[#040912]">
                    <div className="font-mono-hud text-[8.5px] text-[#00F0FF]">PITCH / ROLL</div>
                    <div className="font-mono-hud text-lg font-bold text-white tabular-nums mt-0.5">
                      {telemetry.pitchDeg}° / {telemetry.rollDeg}°
                    </div>
                    <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55">3-AXIS GYRO</div>
                  </div>
                  <div className="p-2.5 border border-[#00F0FF]/20 bg-[#040912]">
                    <div className="font-mono-hud text-[8.5px] text-[#00F0FF]">ACCEL FORCE</div>
                    <div className="font-mono-hud text-lg font-bold text-white tabular-nums mt-0.5">
                      {telemetry.accelMag}
                    </div>
                    <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55">m/s²</div>
                  </div>
                </div>
              </>
            )}

            {settingsTab === 'network' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono-hud text-[9px] text-[#00F0FF]">WI-FI / RADIO</div>
                      <div className="font-mono-hud text-xs font-bold text-white">
                        {telemetry.online ? `${telemetry.netType} · ${telemetry.downlinkMbps} Mbps` : 'OFFLINE'}
                      </div>
                      <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55">
                        RTT {telemetry.rttMs}ms
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleControl('wifi')}
                      className={`px-3 py-1.5 border font-mono-hud text-[9.5px] cursor-pointer ${
                        toggles.wifi
                          ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-white'
                          : 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-[#FF2A4B]'
                      }`}
                    >
                      {toggles.wifi ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono-hud text-[9px] text-[#00F0FF]">BLUETOOTH</div>
                      <div className="font-mono-hud text-xs font-bold text-white truncate">
                        {telemetry.btStatus}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onScanBluetooth()}
                        className="px-2 py-1.5 border border-[#00F0FF]/60 bg-[#00F0FF]/15 font-mono-hud text-[9px] text-white cursor-pointer"
                      >
                        {telemetry.btScanning ? 'SCAN...' : 'PAIR'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleControl('bluetooth')}
                        className={`px-2.5 py-1.5 border font-mono-hud text-[9px] cursor-pointer ${
                          toggles.bluetooth
                            ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-white'
                            : 'border-[#FF2A4B] text-[#FF2A4B]'
                        }`}
                      >
                        {toggles.bluetooth ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="font-mono-hud text-[9px] text-[#00F0FF]">SAVED ACCESS POINTS</div>
                  {networks.map((n) => (
                    <button
                      key={n.ssid}
                      type="button"
                      onClick={() => onConnectNetwork(n.ssid)}
                      className={`w-full flex items-center justify-between px-3 py-2 border text-left cursor-pointer ${
                        n.connected && toggles.wifi
                          ? 'border-[#00F0FF] bg-[#00F0FF]/14'
                          : 'border-[#00F0FF]/20 bg-[#040912]'
                      }`}
                    >
                      <div>
                        <div className="font-mono-hud text-xs text-white">{n.ssid}</div>
                        <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/55">
                          {n.band} · {n.security} · {n.latencyMs}ms
                        </div>
                      </div>
                      <span className="font-mono-hud text-[10px] text-[#00F0FF]">{n.signal}%</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {settingsTab === 'display' && (
              <div className="space-y-2.5">
                <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                      <Flashlight className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <span>TORCH & FULL-EDGE SCREEN FLASH</span>
                    </div>
                    <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/60 mt-0.5">
                      {telemetry.torchHardwareActive
                        ? 'HARDWARE CAMERA LED + SCREEN EDGE TORCH ACTIVE'
                        : 'ACTIVATES REAR TORCH (IF SUPPORTED) + ALL SCREEN EDGES'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleControl('flashlight')}
                    className={`px-3 py-1.5 border font-mono-hud text-[9.5px] cursor-pointer ${
                      toggles.flashlight
                        ? 'border-white bg-white text-[#020306] font-bold'
                        : 'border-[#00F0FF]/45 text-[#00F0FF]'
                    }`}
                  >
                    {toggles.flashlight ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] space-y-2">
                  <div className="flex justify-between font-mono-hud text-[10px]">
                    <span className="text-[#E6F8FF]">HUD BRIGHTNESS</span>
                    <span className="text-[#00F0FF]">{prefs.brightnessPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={45}
                    max={100}
                    value={prefs.brightnessPct}
                    onChange={(e) => onUpdatePrefs({ brightnessPct: Number(e.target.value) })}
                    className="w-full accent-[#00F0FF] cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ keepAwake: !prefs.keepAwake })}
                    className={`p-3 border flex items-center justify-between cursor-pointer ${
                      prefs.keepAwake
                        ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-white'
                        : 'border-[#00F0FF]/20 bg-[#040912] text-[#E6F8FF]/65'
                    }`}
                  >
                    <span className="font-mono-hud text-[10px]">
                      KEEP SCREEN AWAKE ({telemetry.wakeLockActive ? 'LOCKED' : 'WAKE API'})
                    </span>
                    <span className="font-mono-hud text-[10px] font-bold">
                      {prefs.keepAwake ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ scanlinesEnabled: !prefs.scanlinesEnabled })}
                    className={`p-3 border flex items-center justify-between cursor-pointer ${
                      prefs.scanlinesEnabled
                        ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-white'
                        : 'border-[#00F0FF]/20 bg-[#040912] text-[#E6F8FF]/65'
                    }`}
                  >
                    <span className="font-mono-hud text-[10px]">OPTICAL SCANLINES</span>
                    <span className="font-mono-hud text-[10px] font-bold">
                      {prefs.scanlinesEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {settingsTab === 'battery' && (
              <div className="space-y-2.5">
                <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex items-center justify-between">
                  <div>
                    <div className="font-mono-hud text-[9px] text-[#00F0FF]">
                      {telemetry.batterySupported ? 'LIVE HARDWARE BATTERY' : 'SYSTEM POWER PROFILE'}
                    </div>
                    <div className="font-display text-2xl font-bold text-white mt-0.5">
                      {telemetry.batteryPct}%{' '}
                      <span className="text-xs font-mono-hud text-[#00F0FF]">
                        {telemetry.isCharging ? '⚡ CHARGING' : 'DISCHARGING'}
                      </span>
                    </div>
                  </div>
                  <BatteryCharging
                    className={`w-8 h-8 ${telemetry.isCharging ? 'text-[#00F0FF]' : 'text-[#E6F8FF]/60'}`}
                  />
                </div>
                <div className="h-2.5 bg-[#071620] border border-[#00F0FF]/25 overflow-hidden">
                  <div
                    className={`h-full ${telemetry.batteryPct < 20 ? 'bg-[#FF2A4B]' : 'bg-[#00F0FF]'}`}
                    style={{ width: `${telemetry.batteryPct}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono-hud text-[10px]">
                  <div className="p-2.5 border border-[#00F0FF]/20 bg-[#040912]">
                    <div className="text-[#E6F8FF]/55">CHARGE TIME</div>
                    <div className="text-white font-bold mt-0.5">
                      {telemetry.isCharging
                        ? telemetry.chargingTimeSec
                          ? `${Math.round(telemetry.chargingTimeSec / 60)} MIN`
                          : 'CALCULATING'
                        : 'NOT PLUGGED IN'}
                    </div>
                  </div>
                  <div className="p-2.5 border border-[#00F0FF]/20 bg-[#040912]">
                    <div className="text-[#E6F8FF]/55">SYNC / WAKE LOCK</div>
                    <div className="text-[#00F0FF] font-bold mt-0.5">
                      {telemetry.wakeLockActive ? 'ACTIVE' : 'STANDBY'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'sound' && (
              <div className="space-y-2.5">
                <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex items-center justify-between">
                  <div>
                    <div className="font-mono-hud text-xs font-bold text-white">HUD AUDIO & SFX</div>
                    <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/60">
                      Tactile dial clicks and chime synthesizer
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleControl('mute')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border font-mono-hud text-[9.5px] cursor-pointer ${
                      !toggles.mute
                        ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-white'
                        : 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-[#FF2A4B]'
                    }`}
                  >
                    {toggles.mute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{toggles.mute ? 'MUTED' : 'ACTIVE'}</span>
                  </button>
                </div>

                <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono-hud text-xs font-bold text-white">ANDROID HAPTICS</div>
                    <div className="font-mono-hud text-[8.5px] text-[#E6F8FF]/60">
                      Vibration motor feedback on dial & taps
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onTriggerHaptic([20, 40, 20])}
                      className="px-2.5 py-1.5 border border-[#00F0FF]/45 font-mono-hud text-[9px] text-[#00F0FF] cursor-pointer"
                    >
                      TEST BUZZ
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdatePrefs({ hapticsEnabled: !prefs.hapticsEnabled })}
                      className={`px-3 py-1.5 border font-mono-hud text-[9.5px] cursor-pointer ${
                        prefs.hapticsEnabled
                          ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-white'
                          : 'border-[#E6F8FF]/25 text-[#E6F8FF]/55'
                      }`}
                    >
                      {prefs.hapticsEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'about' && (
              <div className="space-y-2 font-mono-hud text-[10px]">
                <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] space-y-1.5">
                  <div className="flex justify-between border-b border-[#00F0FF]/10 pb-1">
                    <span className="text-[#E6F8FF]/55">OS BUILD</span>
                    <span className="text-[#00F0FF] font-bold">STARK OS 15.2 TACTICAL</span>
                  </div>
                  <div className="flex justify-between border-b border-[#00F0FF]/10 pb-1">
                    <span className="text-[#E6F8FF]/55">CPU LOGICAL CORES</span>
                    <span className="text-white">{telemetry.cpuCores} CORES</span>
                  </div>
                  <div className="flex justify-between border-b border-[#00F0FF]/10 pb-1">
                    <span className="text-[#E6F8FF]/55">DEVICE MEMORY</span>
                    <span className="text-white">
                      {telemetry.deviceMemGb ? `${telemetry.deviceMemGb} GB` : 'SANDBOXED'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#00F0FF]/10 pb-1">
                    <span className="text-[#E6F8FF]/55">VIEWPORT</span>
                    <span className="text-white">
                      {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#E6F8FF]/55">SESSION UPTIME</span>
                    <span className="text-[#00F0FF]">{formatUptime(telemetry.uptimeSec)}</span>
                  </div>
                </div>

                <div className="p-3 border border-[#00F0FF]/20 bg-[#040912]">
                  <div className="text-[#00F0FF] mb-1.5 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>APP CACHE & STORAGE</span>
                  </div>
                  <div className="space-y-1">
                    {apps.slice(0, 6).map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-1 border-b border-[#00F0FF]/10">
                        <span className="text-white">
                          {a.name} <span className="text-[#E6F8FF]/45">({a.storageMb ?? 24} MB)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onClearAppCache(a.id)}
                          className="px-2 py-0.5 border border-[#FF2A4B]/50 text-[#FFB4C0] text-[8.5px] cursor-pointer"
                        >
                          PURGE
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 2. PHONE DIALER APP
    if (kind === 'phone') {
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      return (
        <div className="flex flex-col sm:flex-row h-full gap-3 min-h-0">
          <div className="flex-1 flex flex-col justify-between border border-[#00F0FF]/20 bg-[#040912] p-3">
            <div className="flex items-center justify-between border-b border-[#00F0FF]/15 pb-2">
              <span className="font-mono-hud text-lg font-bold tracking-[0.15em] text-white truncate">
                {activeCall ? activeCall.number : dialNumber || 'ENTER NUMBER'}
              </span>
              {!activeCall && dialNumber && (
                <button
                  type="button"
                  onClick={() => setDialNumber((p) => p.slice(0, -1))}
                  className="p-1 text-[#00F0FF] cursor-pointer"
                  aria-label="Backspace"
                >
                  <Delete className="w-4 h-4" />
                </button>
              )}
            </div>

            {activeCall ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full border-2 border-[#00F0FF] flex items-center justify-center animate-pulse">
                  <Phone className="w-7 h-7 text-[#00F0FF]" />
                </div>
                <div className="font-display text-sm tracking-widest text-white">
                  ENCRYPTED VOLTE CALL
                </div>
                <div className="font-mono-hud text-xs text-[#00F0FF]">
                  {formatUptime(activeCall.sec)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playDetentClick();
                    setActiveCall(null);
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-[#FF2A4B] text-white font-mono-hud text-xs tracking-widest cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>END CALL</span>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5 my-2 flex-1">
                  {keys.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        onTriggerHaptic(8);
                        hudSound.playDetentClick();
                        setDialNumber((p) => (p.length < 15 ? p + k : p));
                      }}
                      className="border border-[#00F0FF]/25 bg-[#03060B] hover:border-[#00F0FF] font-mono-hud text-base font-bold text-[#E6F8FF] py-2 cursor-pointer"
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    hudSound.playChime();
                    setActiveCall({ number: dialNumber || 'STARK TOWER', sec: 0 });
                  }}
                  className="w-full py-2 bg-[#00F0FF]/20 border border-[#00F0FF] hover:bg-[#00F0FF]/35 font-display text-xs tracking-[0.2em] text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>CALL IN-HUD</span>
                </button>
              </>
            )}
          </div>

          <div className="sm:w-52 border border-[#00F0FF]/20 bg-[#040912] p-2.5 overflow-y-auto hud-scroll space-y-1.5 shrink-0">
            <div className="font-mono-hud text-[9px] text-[#00F0FF] mb-1">RECENT CALLS</div>
            {[
              { name: 'PEPPER POTTS', num: '+1 310 555 0194', time: '10m ago' },
              { name: 'HAPPY HOGAN', num: '+1 310 555 0142', time: '2h ago' },
              { name: 'RHODEY', num: '+1 202 555 0188', time: 'Yesterday' },
            ].map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  hudSound.playChime();
                  setActiveCall({ number: c.name, sec: 0 });
                }}
                className="w-full p-2 border border-[#00F0FF]/15 hover:border-[#00F0FF] text-left cursor-pointer"
              >
                <div className="font-mono-hud text-[10px] font-bold text-white">{c.name}</div>
                <div className="font-mono-hud text-[8.5px] text-[#00F0FF]/70">{c.num}</div>
                <div className="font-mono-hud text-[8px] text-[#E6F8FF]/45">{c.time}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 3. MESSAGES APP
    if (kind === 'messages') {
      const currentThread = threads.find((t) => t.id === activeThreadId) ?? threads[0];
      const sendMsg = (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgDraft.trim()) return;
        const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        setThreads((prev) =>
          prev.map((t) =>
            t.id === currentThread.id
              ? { ...t, msgs: [...t.msgs, { from: 'ME', text: msgDraft.trim(), time: stamp }] }
              : t
          )
        );
        setMsgDraft('');
        hudSound.playDetentClick();
      };
      return (
        <div className="flex flex-col sm:flex-row h-full gap-2.5 min-h-0">
          <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:w-44 shrink-0">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveThreadId(t.id)}
                className={`p-2 border text-left shrink-0 cursor-pointer ${
                  t.id === currentThread.id
                    ? 'border-[#00F0FF] bg-[#00F0FF]/15'
                    : 'border-[#00F0FF]/20 bg-[#040912]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono-hud text-[10px] font-bold text-white">
                  <MessageSquare className="w-3 h-3 text-[#00F0FF]" />
                  <span>{t.name}</span>
                </div>
                <div className="font-tactical text-[11px] text-[#E6F8FF]/60 truncate max-w-[140px]">
                  {t.msgs[t.msgs.length - 1]?.text}
                </div>
              </button>
            ))}
          </div>
          <div className="flex-1 flex flex-col border border-[#00F0FF]/20 bg-[#040912] p-2.5 min-h-0">
            <div className="flex-1 overflow-y-auto hud-scroll space-y-2 pr-1">
              {currentThread.msgs.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2 border max-w-[85%] ${
                    m.from === 'ME'
                      ? 'ml-auto border-[#00F0FF]/50 bg-[#00F0FF]/12 text-white'
                      : 'border-[#00F0FF]/20 bg-[#020408] text-[#9FEFFF]'
                  }`}
                >
                  <div className="font-tactical text-xs">{m.text}</div>
                  <div className="font-mono-hud text-[8px] text-[#E6F8FF]/45 mt-0.5 text-right">{m.time}</div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMsg} className="flex gap-1.5 pt-2 border-t border-[#00F0FF]/15 mt-2">
              <input
                type="text"
                value={msgDraft}
                onChange={(e) => setMsgDraft(e.target.value)}
                placeholder="RCS ENCRYPTED MESSAGE..."
                className="flex-1 px-2.5 py-1.5 bg-[#020408] border border-[#00F0FF]/35 outline-none font-mono-hud text-[11px] text-white"
              />
              <button
                type="submit"
                className="px-3 border border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF] cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      );
    }

    // 4. IN-APP CHROME / NETLINK BROWSER (Never leaves fullscreen!)
    if (kind === 'browser') {
      const loadUrl = (e: React.FormEvent) => {
        e.preventDefault();
        let next = urlInput.trim();
        if (!next) return;
        if (!/^https?:\/\//i.test(next)) {
          next = next.includes('.') ? `https://${next}` : `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(next)}`;
        }
        setBrowserUrl(next);
        setUrlInput(next);
      };
      return (
        <div className="flex flex-col h-full gap-2 min-h-0">
          <form onSubmit={loadUrl} className="flex items-center gap-1.5 shrink-0">
            <Globe className="w-4 h-4 text-[#00F0FF] shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="ENTER URL OR SEARCH WIKI..."
              className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#040912] border border-[#00F0FF]/40 font-mono-hud text-[11px] text-white outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 border border-[#00F0FF] bg-[#00F0FF]/15 font-mono-hud text-[10px] text-white cursor-pointer shrink-0"
            >
              GO
            </button>
          </form>
          <div className="flex items-center gap-1.5 overflow-x-auto hud-scroll shrink-0">
            {[
              { label: 'WIKIPEDIA', url: 'https://en.m.wikipedia.org/wiki/Main_Page' },
              { label: 'ARCS & PHYSICS', url: 'https://en.m.wikipedia.org/wiki/Fusion_power' },
              { label: 'ARCHIVE.ORG', url: 'https://archive.org' },
            ].map((bm) => (
              <button
                key={bm.label}
                type="button"
                onClick={() => {
                  setBrowserUrl(bm.url);
                  setUrlInput(bm.url);
                }}
                className="px-2 py-0.5 border border-[#00F0FF]/30 bg-[#040912] font-mono-hud text-[9px] text-[#9FEFFF] whitespace-nowrap cursor-pointer"
              >
                {bm.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 border border-[#00F0FF]/25 bg-white overflow-hidden">
            <iframe
              title="In-HUD NetLink Browser"
              src={browserUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      );
    }

    // 5. MAPS / NAVGRID (Live GPS + Compass + Gyro Horizon)
    if (kind === 'maps') {
      return (
        <div className="flex flex-col h-full gap-2.5 min-h-0 overflow-y-auto hud-scroll">
          <div className="p-3 border border-[#00F0FF]/25 bg-[#040912] flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono-hud text-[9px] text-[#00F0FF]">NAVGRID GPS & ORIENTATION</div>
              <div className="font-mono-hud text-sm font-bold text-white mt-0.5">
                {telemetry.gpsCoords
                  ? `${telemetry.gpsCoords.lat}, ${telemetry.gpsCoords.lon} (±${telemetry.gpsCoords.accuracy}m)`
                  : `STATUS: ${telemetry.gpsStatus}`}
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestGps}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#00F0FF] bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 font-mono-hud text-[9.5px] text-white cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>{telemetry.gpsStatus === 'LOCKING' ? 'LOCKING...' : 'ACQUIRE GPS'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
            <div className="p-4 border border-[#00F0FF]/20 bg-[#040912] flex flex-col items-center justify-center gap-2">
              <Compass className="w-4 h-4 text-[#00F0FF]" />
              <CompassRadarDial headingDeg={telemetry.headingDeg} size={86} />
            </div>
            <div className="p-4 border border-[#00F0FF]/20 bg-[#040912] flex flex-col items-center justify-center gap-2">
              <div className="font-mono-hud text-[9px] text-[#00F0FF]">ARTIFICIAL HORIZON (GYRO)</div>
              <div className="relative w-28 h-28 rounded-full border border-[#00F0FF]/55 overflow-hidden flex items-center justify-center bg-[#020408]">
                <div
                  className="w-32 h-[2px] bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] transition-transform duration-100"
                  style={{
                    transform: `translateY(${Math.max(-36, Math.min(36, telemetry.pitchDeg))}px) rotate(${-telemetry.rollDeg}deg)`,
                  }}
                />
                <div className="absolute w-3 h-3 rounded-full border border-[#FF2A4B]" />
              </div>
              <div className="font-mono-hud text-[10px] text-white">
                PITCH {telemetry.pitchDeg}° · ROLL {telemetry.rollDeg}°
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 6. TERMINAL APP
    if (kind === 'terminal') {
      return (
        <div className="flex flex-col h-full border border-[#00F0FF]/25 bg-[#020408] p-2.5 font-mono-hud text-[11px] min-h-0">
          <div className="flex-1 overflow-y-auto hud-scroll space-y-1 text-[#9FEFFF]">
            {termLines.map((line, i) => (
              <div key={i} className={line.startsWith('$') ? 'text-[#00F0FF] font-bold' : ''}>
                {line}
              </div>
            ))}
          </div>
          <form onSubmit={runTerminalCmd} className="flex items-center gap-2 pt-2 border-t border-[#00F0FF]/20 mt-2">
            <Terminal className="w-3.5 h-3.5 text-[#FF2A4B] shrink-0" />
            <input
              type="text"
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              placeholder="help | sensors | battery | net | clear"
              className="flex-1 bg-transparent outline-none text-white"
            />
          </form>
        </div>
      );
    }

    // 7. CALCULATOR APP
    if (kind === 'calc') {
      const btns = ['C', 'DEL', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '(', ')'];
      return (
        <div className="flex flex-col h-full max-w-sm mx-auto w-full gap-2">
          <div className="p-3 border border-[#00F0FF]/35 bg-[#040912] text-right font-mono-hud text-2xl font-bold text-white truncate">
            {calcExpr}
          </div>
          <div className="grid grid-cols-4 gap-1.5 flex-1">
            {btns.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => handleCalcPress(b)}
                className="border border-[#00F0FF]/25 bg-[#040912] hover:border-[#00F0FF] font-mono-hud text-sm font-bold text-[#E6F8FF] cursor-pointer"
              >
                {b}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleCalcPress('=')}
              className="col-span-4 py-2 border border-[#00F0FF] bg-[#00F0FF]/20 hover:bg-[#00F0FF]/35 font-mono-hud text-base font-bold text-white cursor-pointer"
            >
              =
            </button>
          </div>
        </div>
      );
    }

    // 8. CLOCK / STOPWATCH APP
    if (kind === 'clock') {
      const mins = String(Math.floor(swMs / 60000)).padStart(2, '0');
      const secs = String(Math.floor((swMs % 60000) / 1000)).padStart(2, '0');
      const cs = String(Math.floor((swMs % 1000) / 10)).padStart(2, '0');
      return (
        <div className="flex flex-col h-full items-center justify-between gap-3 py-2">
          <div className="text-center">
            <div className="font-mono-hud text-[9px] text-[#00F0FF] tracking-[0.2em]">TACTICAL CHRONOMETER</div>
            <div className="font-mono-hud text-4xl font-bold text-white tabular-nums mt-1">
              {mins}:{secs}.<span className="text-[#00F0FF]">{cs}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSwRunning((r) => !r)}
              className="px-4 py-1.5 border border-[#00F0FF] bg-[#00F0FF]/20 font-mono-hud text-xs text-white cursor-pointer"
            >
              {swRunning ? 'PAUSE' : 'START'}
            </button>
            <button
              type="button"
              onClick={() => setLaps((p) => [swMs, ...p])}
              className="px-4 py-1.5 border border-[#00F0FF]/40 font-mono-hud text-xs text-[#9FEFFF] cursor-pointer"
            >
              LAP
            </button>
            <button
              type="button"
              onClick={() => {
                setSwRunning(false);
                setSwMs(0);
                setLaps([]);
              }}
              className="px-4 py-1.5 border border-[#FF2A4B]/50 font-mono-hud text-xs text-[#FFB4C0] cursor-pointer"
            >
              RESET
            </button>
          </div>
          <div className="w-full flex-1 overflow-y-auto hud-scroll border border-[#00F0FF]/20 bg-[#040912] p-2 space-y-1 font-mono-hud text-[10px]">
            {laps.length === 0 ? (
              <div className="text-[#E6F8FF]/45 text-center py-4">NO LAPS RECORDED</div>
            ) : (
              laps.map((l, idx) => (
                <div key={idx} className="flex justify-between border-b border-[#00F0FF]/10 pb-1">
                  <span className="text-[#00F0FF]">LAP {laps.length - idx}</span>
                  <span className="text-white">{(l / 1000).toFixed(2)}s</span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // 9. MUSIC / SONIC APP
    if (kind === 'music') {
      const track = AMBIENT_TRACKS[trackIndex % AMBIENT_TRACKS.length];
      return (
        <div className="flex flex-col h-full items-center justify-center gap-4 p-3">
          <div className="w-20 h-20 rounded-full border-2 border-[#00F0FF] flex items-center justify-center bg-[#00F0FF]/10">
            <Music className="w-8 h-8 text-[#00F0FF]" />
          </div>
          <div className="text-center">
            <div className="font-display text-base font-bold text-white">{track.title}</div>
            <div className="font-mono-hud text-[10px] text-[#00F0FF] mt-1">{track.freq}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onStepTrack(-1)}
              className="px-3 py-1.5 border border-[#00F0FF]/40 font-mono-hud text-xs text-[#00F0FF] cursor-pointer"
            >
              PREV
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className="px-5 py-2 border border-[#00F0FF] bg-[#00F0FF]/20 font-mono-hud text-xs text-white flex items-center gap-1.5 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              type="button"
              onClick={() => onStepTrack(1)}
              className="px-3 py-1.5 border border-[#00F0FF]/40 font-mono-hud text-xs text-[#00F0FF] cursor-pointer"
            >
              NEXT
            </button>
          </div>
        </div>
      );
    }

    // 10. NOTES APP
    return (
      <div className="flex flex-col h-full gap-2">
        <div className="font-mono-hud text-[9.5px] text-[#00F0FF]">
          AUTO-SAVED TO DEVICE STORAGE
        </div>
        <textarea
          value={noteText}
          onChange={(e) => handleSaveNotes(e.target.value)}
          className="flex-1 w-full p-3 bg-[#040912] border border-[#00F0FF]/30 focus:border-[#00F0FF] outline-none font-mono-hud text-xs text-[#E6F8FF] resize-none"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020306]/75 flex items-center justify-center p-2 sm:p-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={`relative flex flex-col border border-[#00F0FF]/60 bg-[#03060D] shadow-[0_0_50px_rgba(0,240,255,0.18)] ${
          maximized
            ? 'w-full h-full'
            : 'w-full max-w-3xl h-[min(86dvh,560px)]'
        }`}
      >
        {/* Corner Brackets */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00F0FF]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00F0FF]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#FF2A4B]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00F0FF]" />

        {/* Window Titlebar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#00F0FF]/25 bg-[#040914] shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Settings className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
            <span className="font-display text-xs font-bold tracking-[0.16em] text-white truncate">
              {app.name}
            </span>
            <span className="hidden sm:inline font-mono-hud text-[9px] text-[#00F0FF]/70 truncate">
              // {app.packageId}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAppDial(app)}
              className="flex items-center gap-1 px-2 py-1 border border-[#00F0FF]/40 hover:border-[#00F0FF] font-mono-hud text-[9px] text-[#9FEFFF] cursor-pointer"
              title="Open App Sub-Dial"
            >
              <Sliders className="w-3 h-3" />
              <span className="hidden sm:inline">APP DIAL</span>
            </button>
            <button
              type="button"
              onClick={() => setMaximized((m) => !m)}
              className="p-1 border border-[#00F0FF]/35 text-[#00F0FF] hover:bg-[#00F0FF]/15 cursor-pointer"
              aria-label={maximized ? 'Restore window' : 'Maximize window'}
            >
              {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 border border-[#FF2A4B]/60 text-[#FF2A4B] hover:bg-[#FF2A4B]/20 cursor-pointer"
              aria-label="Close app window"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Window Content */}
        <div className="flex-1 min-h-0 p-2.5 sm:p-4 overflow-hidden">{renderWindowBody()}</div>
      </motion.div>
    </div>
  );
};
