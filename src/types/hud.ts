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
  permissions: string;
  targetWedge?: WedgeId;
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
