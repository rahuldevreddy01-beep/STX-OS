export type HudMode = 'portrait' | 'landscape-hub' | 'landscape-tool' | 'stx-cover';

export type WedgeId =
  | 'BRIEF'
  | 'APPS'
  | 'HEALTH'
  | 'VAULT'
  | 'CAMERA'
  | 'SEARCH'
  | 'WIFI'
  | 'STX';

export interface DialOption {
  id: string;
  label: string;
  shortCode: string;
  subtitle?: string;
  accent?: 'cyan' | 'crimson';
  isAction?: boolean;
}

export interface QuickToggles {
  wifi: boolean;
  bluetooth: boolean;
  flashlight: boolean;
  lock: boolean;
  sync: boolean;
  mute: boolean;
}

export type WindowAppKind =
  | 'settings'
  | 'phone'
  | 'messages'
  | 'browser'
  | 'maps'
  | 'music'
  | 'terminal'
  | 'calc'
  | 'clock'
  | 'notes';

export interface AppItem {
  id: string;
  name: string;
  packageId: string;
  category: 'CORE' | 'COMMS' | 'MEDIA' | 'UTILITY';
  badgeCount?: number;
  status: string;
  pinnedToDock: boolean;
  notificationsEnabled: boolean;
  backgroundSync: boolean;
  batteryOpt?: 'OPTIMIZED' | 'UNRESTRICTED';
  permissions: string;
  storageMb?: number;
  version?: string;
  targetWedge?: WedgeId;
  windowApp?: WindowAppKind;
}

export interface WifiNetwork {
  ssid: string;
  band: '6 GHz' | '5 GHz' | '2.4 GHz';
  signal: number;
  security: 'WPA3-ENT' | 'WPA3' | 'OPEN';
  latencyMs: number;
  connected: boolean;
}

export interface BriefingEntry {
  id: string;
  time: string;
  title: string;
  location: string;
  priority: 'HIGH' | 'NOMINAL' | 'CLEAR';
}

export interface VaultItem {
  id: string;
  code: string;
  title: string;
  size: string;
  encryption: string;
  updated: string;
  preview: string;
}

export interface StxLogEntry {
  id: string;
  sender: 'USER' | 'STX';
  text: string;
  timestamp: string;
}

export interface OsPreferences {
  hapticsEnabled: boolean;
  brightnessPct: number;
  scanlinesEnabled: boolean;
  keepAwake: boolean;
}

export interface DeviceTelemetry {
  batteryPct: number;
  isCharging: boolean;
  chargingTimeSec: number | null;
  dischargingTimeSec: number | null;
  batterySupported: boolean;
  online: boolean;
  netType: string;
  downlinkMbps: number;
  rttMs: number;
  steps: number;
  stepActive: boolean;
  sensorSupported: boolean;
  sensorNeedsPermission: boolean;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  accelMag: number;
  gyroActive: boolean;
  gpsCoords: { lat: number; lon: number; accuracy: number } | null;
  gpsStatus: 'IDLE' | 'LOCKING' | 'LOCKED' | 'DENIED';
  wakeLockActive: boolean;
  torchHardwareActive: boolean;
  btScanning: boolean;
  btDeviceName: string | null;
  btStatus: string;
  uptimeSec: number;
  cpuCores: number;
  deviceMemGb: number | null;
}
