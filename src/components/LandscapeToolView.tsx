import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, SkipBack, SkipForward } from 'lucide-react';
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
import { TimelineRuler } from './TimelineRuler';

interface LandscapeToolViewProps {
  now: Date;
  batteryPct: number;
  memPct: number;
  activeWedge: WedgeId;
  dialOptions: DialOption[];
  activeSubId: string;
  onSelectSubOption: (id: string, activate?: boolean) => void;
  onStepBackLevel: () => void;
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
  onStepTrack: (dir: -1 | 1) => void;
  voiceActive: boolean;
  onToggleVoice: () => void;
  cameraMode: 'OPTICAL' | 'THERMAL' | 'NIGHT';
  cameraZoom: number;
  liveCameraEnabled: boolean;
  onToggleLiveCamera: () => void;
  shutterFlash: boolean;
  pulseTrigger: number;
}

export const LandscapeToolView: React.FC<LandscapeToolViewProps> = ({
  now,
  batteryPct,
  memPct,
  activeWedge,
  dialOptions,
  activeSubId,
  onSelectSubOption,
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
  cameraMode,
  cameraZoom,
  liveCameraEnabled,
  onToggleLiveCamera,
  shutterFlash,
  pulseTrigger,
}) => {
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const activeIdx = Math.max(0, dialOptions.findIndex((o) => o.id === activeSubId)) + 1;
  const totalCount = Math.max(1, dialOptions.length);
  const currentOpt = dialOptions[activeIdx - 1] ?? dialOptions[0];

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {/* 1. TOP TIMELINE RULER + BACK BREADCRUMB + CLOCK */}
      <div className="shrink-0 flex items-center justify-between pr-4">
        <div className="flex items-center gap-2 pl-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              hudSound.playDetentClick();
              onStepBackLevel();
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 border border-[#00F0FF]/45 bg-[#04080E]/90 hover:border-[#00F0FF] font-mono-hud text-[9.5px] tracking-widest text-[#00F0FF] cursor-pointer"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>{selectedApp ? activeWedge : 'HUB'}</span>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <TimelineRuler now={now} compact />
        </div>

        <div className="hidden sm:flex items-center gap-2 font-mono-hud text-[10px] tracking-[0.14em] text-[#E6F8FF]/85 shrink-0 pl-2">
          <span className="text-[#00F0FF] font-bold">{timeStr}</span>
          <span>·</span>
          <span>{batteryPct}%</span>
        </div>
      </div>

      {/* 2. FULL-WIDTH CENTER CAROUSEL + RIGHT HALF-DIAL */}
      <div className="relative flex-1 min-h-0 flex items-stretch overflow-hidden pb-2 pt-1 pl-2 sm:pl-4">
        {/* CENTER CAROUSEL TAKES ENTIRE LEFT-TO-CENTER SPACE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, x: -24 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="flex-1 min-w-0 flex flex-col min-h-0"
        >
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

          {/* Clean Compact Carousel Stepper Bar (Zero useless decorative waves) */}
          <div className="h-[34px] shrink-0 mx-4 mt-1 flex items-center justify-between px-3 border border-[#00F0FF]/20 bg-[#03060B]/85">
            <span className="font-mono-hud text-[9.5px] tracking-[0.14em] text-[#00F0FF]/85 truncate">
              {currentOpt?.label}
              {currentOpt?.subtitle ? ` · ${currentOpt.subtitle}` : ''}
            </span>

            <div className="flex items-center gap-2 shrink-0">
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

        {/* RIGHT SIDE HALF-DIAL (Half visible, scrollable, with working center BACK button!) */}
        <motion.div
          layoutId="stark-rotary-dial"
          initial={{ x: -140, scale: 0.92 }}
          animate={{ x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          className="w-[27%] sm:w-[24%] relative flex items-center justify-end overflow-hidden shrink-0"
        >
          {/* Shift right 34% so left half-arc + full center BACK button stay comfortably inside the edge */}
          <div className="translate-x-[34%] sm:translate-x-[36%]">
            <ArcReactorCore
              variant="half-dial"
              options={dialOptions}
              activeOptionId={activeSubId}
              onSelectOption={onSelectSubOption}
              onCenterBack={onStepBackLevel}
              centerHint="BACK"
              size={280}
              pulseTrigger={pulseTrigger}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
