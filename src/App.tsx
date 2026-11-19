import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Maximize2, Minimize2, RotateCw, ShieldAlert } from 'lucide-react';
import { LandscapeHubView } from './components/LandscapeHubView';
import { LandscapeToolView } from './components/LandscapeToolView';
import { PortraitView } from './components/PortraitView';
import { StxHologram } from './components/StxHologram';
import {
  BRIEF_DIAL_OPTIONS,
  CAMERA_DIAL_OPTIONS,
  HEALTH_DIAL_OPTIONS,
  INITIAL_BRIEFINGS,
  INITIAL_LAUNCHER_APPS,
  INITIAL_WIFI_NETWORKS,
  STX_DIAL_OPTIONS,
  STX_TICKER_LINES,
  VAULT_FILES,
  WIFI_DIAL_OPTIONS,
} from './data/hudData';
import {
  AppItem,
  BriefingEntry,
  DialOption,
  HudMode,
  QuickToggles,
  StxLogEntry,
  WedgeId,
  WifiNetwork,
} from './types/hud';
import { hudSound } from './utils/soundFx';

export default function App() {
  const [mode, setMode] = useState<HudMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640 && window.innerHeight > window.innerWidth) {
      return 'portrait';
    }
    return 'landscape-hub';
  });
  const [activeWedge, setActiveWedge] = useState<WedgeId>('APPS');
  const [activeSubId, setActiveSubId] = useState<string>('app-stx');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const [pulseTrigger, setPulseTrigger] = useState(0);

  const [now, setNow] = useState<Date>(() => new Date());
  const [tickerIdx, setTickerIdx] = useState(0);
  const [telemetryCounter, setTelemetryCounter] = useState(659296346);
  const [batteryPct] = useState(97);
  const [memPct, setMemPct] = useState(15);

  const [apps, setApps] = useState<AppItem[]>(INITIAL_LAUNCHER_APPS);
  const [toggles, setToggles] = useState<QuickToggles>({
    wifi: true,
    bluetooth: true,
    flashlight: false,
    lock: false,
    sync: true,
    mute: false,
  });
  const [networks, setNetworks] = useState<WifiNetwork[]>(INITIAL_WIFI_NETWORKS);
  const [briefings, setBriefings] = useState<BriefingEntry[]>(INITIAL_BRIEFINGS);

  const [isPlaying, setIsPlaying] = useState(true);
  const [trackIndex, setTrackIndex] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<'OPTICAL' | 'THERMAL' | 'NIGHT'>('OPTICAL');
  const [cameraZoom, setCameraZoom] = useState(1.0);
  const [liveCameraEnabled, setLiveCameraEnabled] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  const [stxLogs, setStxLogs] = useState<StxLogEntry[]>([
    {
      id: 's1',
      sender: 'STX',
      text: 'STX AI holographic core online. Rotate the dial or issue a command.',
      timestamp: 'LOCAL',
    },
  ]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );

  const lastOrientationRef = useRef<'portrait' | 'landscape' | null>(
    typeof window !== 'undefined'
      ? window.innerHeight > window.innerWidth
        ? 'portrait'
        : 'landscape'
      : null
  );

  useEffect(() => {
    const handleResizeOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const nextOrient: 'portrait' | 'landscape' = h > w ? 'portrait' : 'landscape';
      if (lastOrientationRef.current !== nextOrient) {
        lastOrientationRef.current = nextOrient;
        if (Math.min(w, h) < 640) {
          setMode((prev) => {
            if (nextOrient === 'portrait' && prev === 'landscape-hub') return 'portrait';
            if (nextOrient === 'landscape' && prev === 'portrait') return 'landscape-hub';
            return prev;
          });
        }
      }
    };
    window.addEventListener('resize', handleResizeOrientation);
    return () => window.removeEventListener('resize', handleResizeOrientation);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
      setTelemetryCounter((prev) => prev + Math.floor(Math.random() * 6 + 1));
      setMemPct((prev) => (prev === 15 ? 16 : 15));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTickerIdx((prev) => (prev + 1) % STX_TICKER_LINES.length);
    }, 5500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    hudSound.muted = toggles.mute;
  }, [toggles.mute]);

  const handleToggleFullscreen = useCallback(async () => {
    hudSound.playDetentClick();
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void> | void;
      };
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch {
      // Ignore fullscreen rejection (e.g. restricted iframe policies)
    }
  }, []);

  const triggerHingeTransition = useCallback(
    (nextMode: HudMode, _direction: 'horizontal' | 'vertical' = 'horizontal') => {
      hudSound.playDetentClick();
      setMode(nextMode);
    },
    []
  );

  const getDefaultSubId = useCallback(
    (wedge: WedgeId): string => {
      switch (wedge) {
        case 'HEALTH':
          return HEALTH_DIAL_OPTIONS[0].id;
        case 'WIFI':
          return WIFI_DIAL_OPTIONS[0].id;
        case 'CAMERA':
          return CAMERA_DIAL_OPTIONS[0].id;
        case 'BRIEF':
          return BRIEF_DIAL_OPTIONS[0].id;
        case 'STX':
          return STX_DIAL_OPTIONS[0].id;
        case 'VAULT':
          return VAULT_FILES[0].id;
        case 'APPS':
        case 'SEARCH':
        default:
          return apps[0]?.id ?? 'app-stx';
      }
    },
    [apps]
  );

  const selectedApp = useMemo(
    () => (selectedAppId ? apps.find((a) => a.id === selectedAppId) ?? null : null),
    [apps, selectedAppId]
  );

  const dialOptions: DialOption[] = useMemo(() => {
    if (activeWedge === 'APPS' && selectedApp) {
      return [
        {
          id: 'app-set-open',
          label: selectedApp.targetWedge ? 'OPEN' : 'RUN',
          shortCode: '01',
          subtitle: `Launch ${selectedApp.name}`,
          accent: 'cyan',
          isAction: true,
        },
        {
          id: 'app-set-pin',
          label: selectedApp.pinnedToDock ? 'UNPIN' : 'PIN DOCK',
          shortCode: '02',
          subtitle: 'Toggle Arc Dock Pin',
          isAction: true,
        },
        {
          id: 'app-set-alerts',
          label: selectedApp.notificationsEnabled ? 'ALERTS ON' : 'ALERTS OFF',
          shortCode: '03',
          subtitle: 'Notification Channel',
          isAction: true,
        },
        {
          id: 'app-set-sync',
          label: selectedApp.backgroundSync ? 'SYNC ON' : 'SYNC OFF',
          shortCode: '04',
          subtitle: 'Background Telemetry',
          isAction: true,
        },
        {
          id: 'app-set-cache',
          label: 'PURGE',
          shortCode: '05',
          subtitle: 'Clear App Cache',
          accent: 'crimson',
          isAction: true,
        },
        {
          id: 'app-set-back',
          label: '< BACK',
          shortCode: '06',
          subtitle: 'Return to App List',
          accent: 'crimson',
          isAction: true,
        },
      ];
    }

    switch (activeWedge) {
      case 'HEALTH':
        return HEALTH_DIAL_OPTIONS;
      case 'WIFI':
        return WIFI_DIAL_OPTIONS;
      case 'CAMERA':
        return CAMERA_DIAL_OPTIONS;
      case 'BRIEF':
        return BRIEF_DIAL_OPTIONS;
      case 'STX':
        return STX_DIAL_OPTIONS;
      case 'VAULT':
        return VAULT_FILES.map((v, i) => ({
          id: v.id,
          label: v.code,
          shortCode: `0${i + 1}`,
          subtitle: v.size,
        }));
      case 'APPS':
      case 'SEARCH':
      default:
        return apps.map((a, i) => ({
          id: a.id,
          label: a.name,
          shortCode: `0${i + 1}`,
          subtitle: a.status,
          accent: a.pinnedToDock ? 'cyan' : undefined,
        }));
    }
  }, [activeWedge, apps, selectedApp]);

  const handleSelectRootWedge = useCallback(
    (wedge: WedgeId, openTool = false) => {
      setActiveWedge(wedge);
      setSelectedAppId(null);
      setActiveSubId(getDefaultSubId(wedge));
      setPulseTrigger((p) => p + 1);
      if (openTool && mode === 'landscape-hub') {
        triggerHingeTransition('landscape-tool', 'horizontal');
      }
    },
    [getDefaultSubId, mode, triggerHingeTransition]
  );

  const handleSelectSubOption = useCallback(
    (id: string, activate = false) => {
      setActiveSubId(id);
      setPulseTrigger((p) => p + 1);

      if (!activate) {
        if (activeWedge === 'CAMERA') {
          if (id === 'c-optical') setCameraMode('OPTICAL');
          if (id === 'c-thermal') setCameraMode('THERMAL');
          if (id === 'c-night') setCameraMode('NIGHT');
        }
        return;
      }

      if (activeWedge === 'APPS' && selectedApp) {
        if (id === 'app-set-back') {
          setSelectedAppId(null);
          setActiveSubId(selectedApp.id);
          return;
        }
        if (id === 'app-set-open') {
          if (selectedApp.targetWedge) {
            setSelectedAppId(null);
            setActiveWedge(selectedApp.targetWedge);
            setActiveSubId(getDefaultSubId(selectedApp.targetWedge));
          }
          return;
        }
        if (id === 'app-set-pin') {
          setApps((prev) =>
            prev.map((a) =>
              a.id === selectedApp.id ? { ...a, pinnedToDock: !a.pinnedToDock } : a
            )
          );
          return;
        }
        if (id === 'app-set-alerts') {
          setApps((prev) =>
            prev.map((a) =>
              a.id === selectedApp.id
                ? { ...a, notificationsEnabled: !a.notificationsEnabled }
                : a
            )
          );
          return;
        }
        if (id === 'app-set-sync') {
          setApps((prev) =>
            prev.map((a) =>
              a.id === selectedApp.id ? { ...a, backgroundSync: !a.backgroundSync } : a
            )
          );
          return;
        }
        if (id === 'app-set-cache') {
          setApps((prev) =>
            prev.map((a) => (a.id === selectedApp.id ? { ...a, status: 'PURGED' } : a))
          );
          return;
        }
      }

      if (activeWedge === 'APPS' || activeWedge === 'SEARCH') {
        const target = apps.find((a) => a.id === id);
        if (target) {
          setSelectedAppId(target.id);
          setActiveSubId('app-set-open');
          return;
        }
      }

      if (activeWedge === 'WIFI' && id === 'w-toggle') {
        setToggles((p) => ({ ...p, wifi: !p.wifi }));
        return;
      }

      if (activeWedge === 'CAMERA') {
        if (id === 'c-optical') setCameraMode('OPTICAL');
        if (id === 'c-thermal') setCameraMode('THERMAL');
        if (id === 'c-night') setCameraMode('NIGHT');
        if (id === 'c-live') setLiveCameraEnabled((v) => !v);
        if (id === 'c-zoom') setCameraZoom((z) => (z >= 2.5 ? 1.0 : +(z + 0.5).toFixed(1)));
        if (id === 'c-shutter') {
          hudSound.playChime();
          setShutterFlash(true);
          setTimeout(() => setShutterFlash(false), 160);
        }
      }

      if (activeWedge === 'STX') {
        if (id === 's-voice') setVoiceActive((v) => !v);
        if (id === 's-diag') {
          setStxLogs((prev) => [
            ...prev.slice(-12),
            {
              id: `s-${Date.now()}`,
              sender: 'STX',
              text: `Diagnostics clean: Core ${batteryPct}%, Memory ${memPct}%, RF link 96%.`,
              timestamp: 'NOW',
            },
          ]);
        }
      }
    },
    [activeWedge, apps, batteryPct, getDefaultSubId, memPct, selectedApp]
  );

  const handleStepBackLevel = useCallback(() => {
    if (selectedApp) {
      setSelectedAppId(null);
      setActiveSubId(selectedApp.id);
      return;
    }
    triggerHingeTransition('landscape-hub', 'horizontal');
  }, [selectedApp, triggerHingeTransition]);

  const handleToggleControl = useCallback((key: keyof QuickToggles) => {
    setToggles((prev) => {
      const nextVal = !prev[key];
      if (key !== 'mute' || !nextVal) {
        hudSound.playDetentClick();
      }
      return { ...prev, [key]: nextVal };
    });
  }, []);

  const handleToggleAppSetting = useCallback(
    (appId: string, field: 'pinnedToDock' | 'notificationsEnabled' | 'backgroundSync') => {
      hudSound.playDetentClick();
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, [field]: !a[field] } : a))
      );
    },
    []
  );

  const handleClearAppCache = useCallback((appId: string) => {
    hudSound.playChime();
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: 'PURGED' } : a)));
  }, []);

  const handleConnectNetwork = useCallback((ssid: string) => {
    hudSound.playChime();
    setNetworks((prev) => prev.map((n) => ({ ...n, connected: n.ssid === ssid })));
  }, []);

  const handleToggleBriefing = useCallback((id: string) => {
    hudSound.playDetentClick();
    setBriefings((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, priority: b.priority === 'CLEAR' ? 'NOMINAL' : 'CLEAR' }
          : b
      )
    );
  }, []);

  const handleSendStxCommand = useCallback(
    (rawCmd: string) => {
      hudSound.playChime();
      const cmd = rawCmd.trim();
      const lower = cmd.toLowerCase();
      const stamp = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      let reply = `Directive "${cmd}" executed. All subsystems nominal.`;

      if (lower.includes('wifi')) {
        setToggles((p) => ({ ...p, wifi: !p.wifi }));
        reply = 'Wi-Fi RF link state toggled.';
      } else if (lower.includes('bluetooth') || lower === 'bt') {
        setToggles((p) => ({ ...p, bluetooth: !p.bluetooth }));
        reply = 'Bluetooth tactical radio toggled.';
      } else if (lower.includes('health') || lower.includes('heart')) {
        setActiveWedge('HEALTH');
        setSelectedAppId(null);
        setActiveSubId('h-ecg');
        if (mode === 'landscape-hub' || mode === 'stx-cover') {
          triggerHingeTransition('landscape-tool', 'horizontal');
        }
        reply = 'Opening biometric telemetry: 72 BPM Sinus Rhythm.';
      } else if (lower.includes('app')) {
        setActiveWedge('APPS');
        setSelectedAppId(null);
        setActiveSubId(apps[0]?.id ?? 'app-stx');
        if (mode === 'landscape-hub' || mode === 'stx-cover') {
          triggerHingeTransition('landscape-tool', 'horizontal');
        }
        reply = 'Opening launcher matrix. Rotate the half-dial to configure apps.';
      } else if (lower.includes('vault')) {
        setActiveWedge('VAULT');
        setSelectedAppId(null);
        setActiveSubId(VAULT_FILES[0].id);
        if (mode === 'landscape-hub' || mode === 'stx-cover') {
          triggerHingeTransition('landscape-tool', 'horizontal');
        }
        reply = 'Vault archive unlocked for inspection.';
      } else if (lower.includes('diag')) {
        reply = `Core power ${batteryPct}%, memory ${memPct}%, 6GHz link 4ms.`;
      }

      setStxLogs((prev) => [
        ...prev.slice(-14),
        { id: `u-${Date.now()}`, sender: 'USER', text: cmd, timestamp: stamp },
        { id: `s-${Date.now() + 1}`, sender: 'STX', text: reply, timestamp: stamp },
      ]);
    },
    [apps, batteryPct, memPct, mode, now, triggerHingeTransition]
  );

  const handleStepCarousel = useCallback(
    (dir: -1 | 1) => {
      if (mode === 'landscape-tool') {
        const idx = Math.max(
          0,
          dialOptions.findIndex((o) => o.id === activeSubId)
        );
        const nextIdx = (idx + dir + dialOptions.length) % dialOptions.length;
        if (dialOptions[nextIdx]) {
          handleSelectSubOption(dialOptions[nextIdx].id, false);
        }
      } else {
        setTrackIndex((i) => (i + dir + 3) % 3);
      }
    },
    [activeSubId, dialOptions, handleSelectSubOption, mode]
  );

  const handleCycleMode = () => {
    if (mode === 'portrait') {
      triggerHingeTransition('landscape-hub', 'horizontal');
    } else if (mode === 'landscape-hub') {
      triggerHingeTransition('landscape-tool', 'horizontal');
    } else if (mode === 'landscape-tool') {
      triggerHingeTransition('stx-cover', 'vertical');
    } else {
      triggerHingeTransition('portrait', 'vertical');
    }
  };

  const greeting = useMemo(() => {
    const hr = now.getHours();
    if (hr < 12) return 'GOOD MORNING';
    if (hr < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, [now]);

  const telemetryCode = String(telemetryCounter).padStart(10, '0');
  const notifCount = briefings.filter((b) => b.priority === 'HIGH').length;
  const lastStxMsg =
    [...stxLogs].reverse().find((l) => l.sender === 'STX')?.text ?? 'STX AI ready.';

  const containerClass =
    mode === 'portrait'
      ? 'w-full h-full sm:max-w-[430px] sm:h-[min(calc(100dvh-56px),860px)] sm:rounded-[28px] sm:border sm:border-[#00F0FF]/25'
      : mode === 'stx-cover'
        ? 'w-[min(94vw,420px)] h-[min(78dvh,420px)] rounded-[20px] sm:rounded-[24px] border border-[#00F0FF]/35'
        : 'w-full h-full rounded-none border-0';

  return (
    <div className="relative h-dvh w-screen overflow-hidden hud-obsidian-bg flex flex-col items-center justify-center">
      <div className="relative z-20 flex-1 w-full flex items-center justify-center min-h-0">
        <div
          className={`relative overflow-hidden bg-[#020306]/92 shadow-[0_0_48px_rgba(0,0,0,0.95)] transition-[width,height,border-radius] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${containerClass}`}
        >
          <div className="pointer-events-none absolute inset-0 hud-scanlines z-10" />

          {toggles.flashlight && (
            <div
              className="pointer-events-none absolute inset-0 z-30 border-4 border-[#E6F8FF]/75 shadow-[inset_0_0_75px_rgba(230,248,255,0.38)]"
              aria-hidden="true"
            />
          )}

          <div className="relative z-20 h-full w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, scale: 0.988 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.992 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full"
              >
                {mode === 'portrait' && (
              <PortraitView
                now={now}
                greeting={greeting}
                tickerLine={STX_TICKER_LINES[tickerIdx]}
                batteryPct={batteryPct}
                memPct={memPct}
                activeWedge={activeWedge}
                dialOptions={dialOptions}
                activeSubId={activeSubId}
                onSelectRootWedge={handleSelectRootWedge}
                onSelectSubOption={handleSelectSubOption}
                onStepBackApp={() => {
                  if (selectedApp) {
                    setSelectedAppId(null);
                    setActiveSubId(selectedApp.id);
                  }
                }}
                selectedApp={selectedApp}
                apps={apps}
                onToggleAppSetting={handleToggleAppSetting}
                onClearAppCache={handleClearAppCache}
                toggles={toggles}
                onToggleControl={handleToggleControl}
                networks={networks}
                onConnectNetwork={handleConnectNetwork}
                briefings={briefings}
                onToggleBriefing={handleToggleBriefing}
                stxLogs={stxLogs}
                onSendStxCommand={handleSendStxCommand}
                voiceActive={voiceActive}
                onToggleVoice={() => setVoiceActive((v) => !v)}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                trackIndex={trackIndex}
                onStepTrack={handleStepCarousel}
                cameraMode={cameraMode}
                cameraZoom={cameraZoom}
                liveCameraEnabled={liveCameraEnabled}
                onToggleLiveCamera={() => setLiveCameraEnabled((v) => !v)}
                shutterFlash={shutterFlash}
                notifCount={notifCount}
              />
            )}

            {mode === 'landscape-hub' && (
              <LandscapeHubView
                now={now}
                greeting={greeting}
                batteryPct={batteryPct}
                memPct={memPct}
                telemetryCode={telemetryCode}
                activeWedge={activeWedge}
                onSelectWedge={handleSelectRootWedge}
                toggles={toggles}
                onToggleControl={handleToggleControl}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                trackIndex={trackIndex}
                onStepTrack={handleStepCarousel}
                voiceActive={voiceActive}
                onToggleVoice={() => {
                  hudSound.playChime();
                  setVoiceActive((v) => !v);
                }}
                pulseTrigger={pulseTrigger}
              />
            )}

            {mode === 'landscape-tool' && (
              <LandscapeToolView
                now={now}
                batteryPct={batteryPct}
                memPct={memPct}
                activeWedge={activeWedge}
                dialOptions={dialOptions}
                activeSubId={activeSubId}
                onSelectSubOption={handleSelectSubOption}
                onStepBackLevel={handleStepBackLevel}
                selectedApp={selectedApp}
                apps={apps}
                onToggleAppSetting={handleToggleAppSetting}
                onClearAppCache={handleClearAppCache}
                toggles={toggles}
                onToggleControl={handleToggleControl}
                networks={networks}
                onConnectNetwork={handleConnectNetwork}
                briefings={briefings}
                onToggleBriefing={handleToggleBriefing}
                stxLogs={stxLogs}
                onSendStxCommand={handleSendStxCommand}
                onStepTrack={handleStepCarousel}
                voiceActive={voiceActive}
                onToggleVoice={() => {
                  hudSound.playChime();
                  setVoiceActive((v) => !v);
                }}
                cameraMode={cameraMode}
                cameraZoom={cameraZoom}
                liveCameraEnabled={liveCameraEnabled}
                onToggleLiveCamera={() => setLiveCameraEnabled((v) => !v)}
                shutterFlash={shutterFlash}
                pulseTrigger={pulseTrigger}
              />
            )}

            {mode === 'stx-cover' && (
              <div className="flex flex-col h-full w-full p-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#00F0FF]/15 shrink-0">
                  <button
                    type="button"
                    onClick={() => triggerHingeTransition('landscape-hub', 'vertical')}
                    className="flex items-center gap-1 font-display text-xs font-bold tracking-[0.16em] text-[#E6F8FF] hover:text-[#00F0FF] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#00F0FF]" />
                    <span>STX AI</span>
                  </button>
                  <span className="font-mono-hud text-[9.5px] text-[#00F0FF]">
                    {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} · {batteryPct}%
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <StxHologram
                    listening={voiceActive}
                    onToggleListening={() => setVoiceActive((v) => !v)}
                    lastResponse={lastStxMsg}
                    onSendCommand={handleSendStxCommand}
                  />
                </div>
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </div>

          {toggles.lock && (
            <div className="absolute inset-0 z-40 bg-[#020306]/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-4 p-6 text-center">
              <ShieldAlert className="w-9 h-9 text-[#FF2A4B] glow-crimson" />
              <div>
                <div className="font-display text-base font-bold tracking-[0.2em] text-[#E6F8FF]">
                  STARK OS LOCKED
                </div>
                <div className="font-mono-hud text-[10px] tracking-widest text-[#00F0FF]/75 mt-1">
                  BIOMETRIC AUTHENTICATION REQUIRED
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  hudSound.playChime();
                  setToggles((p) => ({ ...p, lock: false }));
                }}
                className="px-5 py-2 border border-[#00F0FF] bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 font-display text-xs tracking-[0.18em] text-[#E6F8FF] cursor-pointer"
              >
                UNLOCK CORE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MINIMAL NATIVE-STYLE BOTTOM LAUNCHER MODE BAR */}
      <div className="relative z-40 h-[44px] w-full flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 bg-[#020306]/90 border-t border-[#00F0FF]/15 shrink-0 overflow-x-auto hud-scroll">
        <button
          type="button"
          onClick={handleCycleMode}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 border border-[#00F0FF]/45 bg-[#040A12] hover:border-[#00F0FF] font-mono-hud text-[10px] tracking-[0.14em] text-[#E6F8FF] shrink-0 cursor-pointer"
        >
          <RotateCw className="w-3 h-3 text-[#00F0FF]" />
          <span className="hidden sm:inline">FOLD / ROTATE</span>
          <span className="sm:hidden">MODE</span>
        </button>

        <div className="flex items-center gap-1 font-mono-hud text-[9.5px] shrink-0">
          {(
            [
              { id: 'portrait', label: 'PORTRAIT', dir: 'vertical' },
              { id: 'landscape-hub', label: 'HUB', dir: 'horizontal' },
              { id: 'landscape-tool', label: 'HALF-DIAL', dir: 'horizontal' },
              { id: 'stx-cover', label: 'STX AI', dir: 'vertical' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => triggerHingeTransition(m.id, m.dir)}
              className={`px-2 sm:px-2.5 py-1 border transition-colors cursor-pointer ${
                mode === m.id
                  ? m.id === 'stx-cover' || m.id === 'landscape-tool'
                    ? 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-white'
                    : 'border-[#00F0FF] bg-[#00F0FF]/20 text-white'
                  : 'border-transparent text-[#E6F8FF]/55 hover:text-[#E6F8FF]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Website'}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 border font-mono-hud text-[10px] tracking-[0.14em] shrink-0 transition-colors cursor-pointer ${
            isFullscreen
              ? 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-white hover:bg-[#FF2A4B]/30'
              : 'border-[#00F0FF]/45 bg-[#040A12] text-[#E6F8FF] hover:border-[#00F0FF]'
          }`}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3 h-3 text-[#FF2A4B]" />
          ) : (
            <Maximize2 className="w-3 h-3 text-[#00F0FF]" />
          )}
          <span className="hidden sm:inline">{isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}</span>
        </button>
      </div>
    </div>
  );
}
