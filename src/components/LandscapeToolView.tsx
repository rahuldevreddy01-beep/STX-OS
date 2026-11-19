import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
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
import { TimelineRuler } from './TimelineRuler';

interface LandscapeToolViewProps {
  now: Date;
  telemetry: DeviceTelemetry;
  activeWedge: WedgeId;
  dialOptions: DialOption[];
  activeSubId: string;
  onSelectSubOption: (id: string, activate?: boolean) => void;
  onLaunchApp: (app: AppItem) => void;
  onStepBackLevel: () => void;
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
  onEnableSensors: () => Promise<boolean>;
  onResetSteps: () => void;
  onScanBluetooth: () => Promise<string | null>;
  cameraMode: 'OPTICAL' | 'THERMAL' | 'NIGHT';
  cameraZoom: number;
  liveCameraEnabled: boolean;
  onToggleLiveCamera: () => void;
  shutterFlash: boolean;
  pulseTrigger: number;
}

export const LandscapeToolView: React.FC<LandscapeToolViewProps> = ({
  now,
  telemetry,
  activeWedge,
  dialOptions,
  activeSubId,
  onSelectSubOption,
  onLaunchApp,
  onStepBackLevel,
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
  onEnableSensors,
  onResetSteps,
  onScanBluetooth,
  cameraMode,
  cameraZoom,
  liveCameraEnabled,
  onToggleLiveCamera,
  shutterFlash,
  pulseTrigger,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageDims, setStageDims] = useState({ w: 800, h: 360 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      setStageDims({ w: el.clientWidth || 800, h: el.clientHeight || 360 });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNarrowPortrait = stageDims.w < 540;
  const dialSize = Math.max(175, Math.min(280, Math.floor(stageDims.h * 0.9)));

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {/* 1. TOP TIMELINE RULER + BACK BREADCRUMB + CLOCK */}
      <div className="shrink-0 flex items-center justify-between px-2.5 sm:px-4 pt-1">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              hudSound.playDetentClick();
              onStepBackLevel();
            }}
            className="flex items-center gap-1 px-2.5 py-1 border border-[#00F0FF]/45 bg-[#04080E]/90 hover:border-[#00F0FF] font-mono-hud text-[9.5px] tracking-widest text-[#00F0FF] cursor-pointer"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>{selectedApp ? activeWedge : 'HUB'}</span>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <TimelineRuler now={now} compact />
        </div>

        <div className="flex items-center gap-1.5 font-mono-hud text-[9.5px] sm:text-[10px] tracking-[0.12em] text-[#E6F8FF]/85 shrink-0 pl-1">
          <span className="text-[#00F0FF] font-bold">{timeStr}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            {telemetry.batteryPct}%{telemetry.isCharging ? '⚡' : ''}
          </span>
        </div>
      </div>

      {/* 2. CENTER CAROUSEL + RESPONSIVE DIAL */}
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 flex flex-col sm:flex-row items-stretch overflow-hidden pb-2 pt-1 px-2 sm:px-4 gap-1.5 sm:gap-0"
      >
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex-1 min-w-0 flex flex-col min-h-0"
        >
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

        {/* RIGHT SIDE HALF-DIAL (Rendered on >= 540px landscape/tablet screens, scaled to height) */}
        {!isNarrowPortrait && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ width: Math.round(dialSize * 0.66) }}
            className="relative flex items-center justify-end overflow-hidden shrink-0"
          >
            <div className="translate-x-[36%]">
              <ArcReactorCore
                variant="half-dial"
                options={dialOptions}
                activeOptionId={activeSubId}
                onSelectOption={onSelectSubOption}
                onCenterBack={onStepBackLevel}
                centerHint="BACK"
                size={dialSize}
                pulseTrigger={pulseTrigger}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
