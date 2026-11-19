import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, SkipBack, SkipForward } from 'lucide-react';
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
  onStepTrack: (dir: -1 | 1) => void;
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
  onStepTrack,
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
  const activeIdx = Math.max(0, dialOptions.findIndex((o) => o.id === activeSubId)) + 1;
  const totalCount = Math.max(1, dialOptions.length);
  const currentOpt = dialOptions[activeIdx - 1] ?? dialOptions[0];

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

          {/* Mobile Portrait Horizontal Notch Strip (when narrow < 540px so half-dial doesn't crush cards) */}
          {isNarrowPortrait && (
            <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto hud-scroll px-1 py-1">
              {dialOptions.map((opt) => {
                const isSel = opt.id === activeSubId;
                const isCrimson = opt.accent === 'crimson';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      hudSound.playDetentClick();
                      onSelectSubOption(opt.id, isSel || opt.isAction);
                    }}
                    className={`px-2.5 py-1 border font-mono-hud text-[9.5px] tracking-wider whitespace-nowrap shrink-0 cursor-pointer ${
                      isSel
                        ? isCrimson
                          ? 'border-[#FF2A4B] bg-[#FF2A4B]/20 text-white'
                          : 'border-[#00F0FF] bg-[#00F0FF]/20 text-white'
                        : 'border-[#00F0FF]/25 bg-[#040A12] text-[#9FEFFF]/75'
                    }`}
                  >
                    {opt.shortCode} {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Compact Carousel Stepper Bar */}
          <div className="h-[34px] shrink-0 mx-1 sm:mx-3 mt-0.5 flex items-center justify-between px-2.5 sm:px-3 border border-[#00F0FF]/20 bg-[#03060B]/85">
            <span className="font-mono-hud text-[9px] sm:text-[9.5px] tracking-[0.12em] text-[#00F0FF]/85 truncate pr-2">
              {currentOpt?.label}
              {currentOpt?.subtitle ? ` · ${currentOpt.subtitle}` : ''}
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  hudSound.playDetentClick();
                  onStepTrack(-1);
                }}
                aria-label="Previous card"
                className="p-1 text-[#00F0FF] hover:text-white cursor-pointer"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono-hud text-[10px] text-[#E6F8FF] tabular-nums">
                {String(activeIdx).padStart(2, '0')}/{String(totalCount).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => {
                  hudSound.playDetentClick();
                  onStepTrack(1);
                }}
                aria-label="Next card"
                className="p-1 text-[#00F0FF] hover:text-white cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
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
