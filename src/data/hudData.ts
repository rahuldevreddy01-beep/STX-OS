import { AppItem, BriefingEntry, DialOption, VaultItem, WifiNetwork } from '../types/hud';

export const ROOT_WEDGE_OPTIONS: DialOption[] = [
  { id: 'BRIEF', label: 'BRIEF', shortCode: '01', subtitle: 'Schedule & Weather' },
  { id: 'APPS', label: 'APPS', shortCode: '02', subtitle: 'Installed Launcher' },
  { id: 'HEALTH', label: 'HEALTH', shortCode: '03', subtitle: 'Biometrics & ECG' },
  { id: 'VAULT', label: 'VAULT', shortCode: '04', subtitle: 'Encrypted Archive' },
  { id: 'CAMERA', label: 'CAMERA', shortCode: '05', subtitle: 'Optical & Thermal' },
  { id: 'SEARCH', label: 'SEARCH', shortCode: '06', subtitle: 'System Index' },
  { id: 'WIFI', label: 'WIFI', shortCode: '07', subtitle: 'RF Network Matrix' },
  { id: 'STX', label: 'STX AI', shortCode: '08', subtitle: 'Hologram Assistant' },
];

export const INITIAL_WIFI_NETWORKS: WifiNetwork[] = [
  {
    ssid: 'STARK_LABS_6E',
    band: '6 GHz',
    signal: 96,
    security: 'WPA3-ENT',
    latencyMs: 4,
    connected: true,
  },
  {
    ssid: 'MALIBU_SAT_UPLINK',
    band: '5 GHz',
    signal: 84,
    security: 'WPA3-ENT',
    latencyMs: 11,
    connected: false,
  },
  {
    ssid: 'STX_MESH_LOCAL',
    band: '5 GHz',
    signal: 78,
    security: 'WPA3',
    latencyMs: 14,
    connected: false,
  },
  {
    ssid: 'WORKSHOP_TELEMETRY',
    band: '2.4 GHz',
    signal: 62,
    security: 'WPA3',
    latencyMs: 22,
    connected: false,
  },
];

export const INITIAL_BRIEFINGS: BriefingEntry[] = [
  {
    id: 'b1',
    time: '09:30',
    title: 'ARC CAPACITOR CALIBRATION',
    location: 'BAY 04 · LOCAL',
    priority: 'NOMINAL',
  },
  {
    id: 'b2',
    time: '13:00',
    title: 'FLIGHT TELEMETRY SYNC',
    location: 'UPLINK SAT-07',
    priority: 'HIGH',
  },
  {
    id: 'b3',
    time: '18:15',
    title: 'NEXT CLEAR WINDOW',
    location: 'ALL CHANNELS',
    priority: 'CLEAR',
  },
];

export const INITIAL_LAUNCHER_APPS: AppItem[] = [
  {
    id: 'app-stx',
    name: 'STX AI',
    packageId: 'os.stark.stx',
    category: 'CORE',
    status: 'ONLINE',
    pinnedToDock: true,
    notificationsEnabled: true,
    backgroundSync: true,
    permissions: 'MIC · SYS · NET',
    targetWedge: 'STX',
  },
  {
    id: 'app-netlink',
    name: 'NETLINK',
    packageId: 'os.stark.browser',
    category: 'COMMS',
    status: 'TLS 1.3',
    pinnedToDock: true,
    notificationsEnabled: true,
    backgroundSync: false,
    permissions: 'NET · STORAGE',
    targetWedge: 'SEARCH',
  },
  {
    id: 'app-comms',
    name: 'COMMS',
    packageId: 'os.stark.dialer',
    category: 'COMMS',
    badgeCount: 2,
    status: 'ENCRYPTED',
    pinnedToDock: false,
    notificationsEnabled: true,
    backgroundSync: true,
    permissions: 'CALL · CONTACTS · MIC',
  },
  {
    id: 'app-vault',
    name: 'VAULT',
    packageId: 'os.stark.vault',
    category: 'CORE',
    status: 'AES-512',
    pinnedToDock: true,
    notificationsEnabled: false,
    backgroundSync: false,
    permissions: 'BIOMETRIC · HSM',
    targetWedge: 'VAULT',
  },
  {
    id: 'app-optics',
    name: 'OPTICS',
    packageId: 'os.stark.camera',
    category: 'MEDIA',
    status: 'RAW 4K',
    pinnedToDock: true,
    notificationsEnabled: false,
    backgroundSync: false,
    permissions: 'CAM · GYRO · GPS',
    targetWedge: 'CAMERA',
  },
  {
    id: 'app-navgrid',
    name: 'NAVGRID',
    packageId: 'os.stark.radar',
    category: 'UTILITY',
    status: 'GPS LOCK',
    pinnedToDock: false,
    notificationsEnabled: true,
    backgroundSync: true,
    permissions: 'LOCATION · COMPASS',
  },
  {
    id: 'app-sonic',
    name: 'SONIC',
    packageId: 'os.stark.audio',
    category: 'MEDIA',
    status: 'LOSSLESS',
    pinnedToDock: false,
    notificationsEnabled: false,
    backgroundSync: true,
    permissions: 'AUDIO · BT',
  },
  {
    id: 'app-vitals',
    name: 'VITALS',
    packageId: 'os.stark.bio',
    category: 'UTILITY',
    status: '72 BPM',
    pinnedToDock: false,
    notificationsEnabled: true,
    backgroundSync: true,
    permissions: 'SENSORS · HEALTH',
    targetWedge: 'HEALTH',
  },
];

export const VAULT_FILES: VaultItem[] = [
  {
    id: 'v1',
    code: 'MK-VI-ARC',
    title: 'PALLADIUM_ALT_ELEMENT.CAD',
    size: '42.8 MB',
    encryption: 'Q-AES-512',
    updated: '2026.11.18',
    preview: 'Synthesized triangular prism lattice containment spec. Thermal efficiency +34.2% under peak output.',
  },
  {
    id: 'v2',
    code: 'STX-NET',
    title: 'NEURAL_WEIGHTS_V4.BIN',
    size: '1.14 GB',
    encryption: 'ZERO-KNOWLEDGE',
    updated: '2026.11.18',
    preview: 'Local quantized command inference weights. Sub-18ms response latency with offline fallback.',
  },
  {
    id: 'v3',
    code: 'FOLD-HUD',
    title: 'HINGE_SHADER_PIPELINE.GLSL',
    size: '884 KB',
    encryption: 'AES-256-GCM',
    updated: '2026.11.17',
    preview: 'Directional progressive blur kernel + chromatic aberration split tuned for 120Hz foldable OLED.',
  },
  {
    id: 'v4',
    code: 'SAT-KEY',
    title: 'ORBITAL_UPLINK_KEYS.PEM',
    size: '16.4 KB',
    encryption: 'HSM-LOCKED',
    updated: '2026.11.15',
    preview: 'Rotating asymmetric keypair for Malibu ground station and Stark LEO relay nodes.',
  },
];

export const STX_TICKER_LINES = [
  '• STX AI READY · ALL LOCAL CHANNELS CALIBRATED',
  '• ARC REACTOR CORE AT 97% OUTPUT · THERMAL NOMINAL 31°C',
  '• FOLDABLE HINGE SENSORS SYNCHRONIZED · 120HZ HUD READY',
  '• NEXT CLEAR SCHEDULE WINDOW DETECTED · NO CRITICAL ALERTS',
];

export const AMBIENT_TRACKS = [
  { title: 'STARK EXPO · SYNTH 01', freq: '432 HZ · LOSSLESS', duration: '03:48' },
  { title: 'MALIBU WORKSHOP · PULSE', freq: '440 HZ · BINAURAL', duration: '04:12' },
  { title: 'ORBITAL TELEMETRY · DRIFT', freq: '528 HZ · SPATIAL', duration: '05:04' },
];

export const HEALTH_DIAL_OPTIONS: DialOption[] = [
  { id: 'h-ecg', label: 'ECG LIVE', shortCode: '01', subtitle: '72 BPM · Sinus' },
  { id: 'h-hrv', label: 'HRV', shortCode: '02', subtitle: '68 ms Recovery' },
  { id: 'h-sleep', label: 'SLEEP', shortCode: '03', subtitle: '7h 42m Deep' },
  { id: 'h-steps', label: 'STEPS', shortCode: '04', subtitle: '8,412 Today' },
  { id: 'h-spo2', label: 'SPO2', shortCode: '05', subtitle: '99% Oxygen' },
  { id: 'h-vo2', label: 'VO2 MAX', shortCode: '06', subtitle: '54.2 Optimal' },
];

export const WIFI_DIAL_OPTIONS: DialOption[] = [
  { id: 'w-overview', label: 'SIGNAL', shortCode: '01', subtitle: '96% Link Status' },
  { id: 'w-networks', label: 'NETWORKS', shortCode: '02', subtitle: '4 SSIDs Found' },
  { id: 'w-band', label: '6GHZ RF', shortCode: '03', subtitle: 'Channel 69 · 160MHz' },
  { id: 'w-security', label: 'WPA3-ENT', shortCode: '04', subtitle: 'TLS / DNS Guard' },
  { id: 'w-toggle', label: 'RF PWR', shortCode: '05', subtitle: 'Toggle Radio', accent: 'crimson', isAction: true },
];

export const CAMERA_DIAL_OPTIONS: DialOption[] = [
  { id: 'c-optical', label: 'OPTICAL', shortCode: '01', subtitle: 'RAW 4K Lens' },
  { id: 'c-thermal', label: 'THERMAL', shortCode: '02', subtitle: 'IR Spectrum' },
  { id: 'c-night', label: 'NIGHT', shortCode: '03', subtitle: 'Low-Light Gain' },
  { id: 'c-live', label: 'LIVE CAM', shortCode: '04', subtitle: 'Hardware Feed', accent: 'cyan' },
  { id: 'c-zoom', label: 'ZOOM', shortCode: '05', subtitle: 'Cycle Magnification', isAction: true },
  { id: 'c-shutter', label: 'CAPTURE', shortCode: '06', subtitle: 'Snap Frame', accent: 'crimson', isAction: true },
];

export const BRIEF_DIAL_OPTIONS: DialOption[] = [
  { id: 'b-agenda', label: 'AGENDA', shortCode: '01', subtitle: 'Today Timeline' },
  { id: 'b-weather', label: 'WEATHER', shortCode: '02', subtitle: '31°C Malibu' },
  { id: 'b-alerts', label: 'ALERTS', shortCode: '03', subtitle: 'Priority Queue' },
];

export const STX_DIAL_OPTIONS: DialOption[] = [
  { id: 's-holo', label: 'STX AI', shortCode: '01', subtitle: 'Hologram Link' },
  { id: 's-console', label: 'COMMANDS', shortCode: '02', subtitle: 'Action Log' },
  { id: 's-diag', label: 'DIAGNOSE', shortCode: '03', subtitle: 'System Scan', isAction: true },
  { id: 's-voice', label: 'VOICE', shortCode: '04', subtitle: 'Mic Listen', accent: 'crimson', isAction: true },
];
