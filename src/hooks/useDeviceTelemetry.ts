import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceTelemetry } from '../types/hud';

interface BatteryManagerLike extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface NetworkInfoLike extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  type?: string;
}

function getTodayKey() {
  const d = new Date();
  return `stark_steps_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadSavedSteps(): number {
  try {
    const raw = localStorage.getItem(getTodayKey());
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function useDeviceTelemetry(options: {
  flashlightOn: boolean;
  keepAwakeOn: boolean;
  hapticsOn: boolean;
  bluetoothOn: boolean;
}) {
  const { flashlightOn, keepAwakeOn, hapticsOn, bluetoothOn } = options;

  const [telemetry, setTelemetry] = useState<DeviceTelemetry>(() => {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & {
      connection?: NetworkInfoLike;
      deviceMemory?: number;
    }) : null;
    const dm = typeof window !== 'undefined' ? (window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceMotionEvent : undefined;

    return {
      batteryPct: 100,
      isCharging: false,
      chargingTimeSec: null,
      dischargingTimeSec: null,
      batterySupported: typeof navigator !== 'undefined' && 'getBattery' in navigator,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      netType: (nav?.connection?.effectiveType ?? nav?.connection?.type ?? '4g').toUpperCase(),
      downlinkMbps: nav?.connection?.downlink ?? 10,
      rttMs: nav?.connection?.rtt ?? 24,
      steps: typeof window !== 'undefined' ? loadSavedSteps() : 0,
      stepActive: false,
      sensorSupported: typeof window !== 'undefined' && ('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window),
      sensorNeedsPermission: typeof dm?.requestPermission === 'function',
      headingDeg: 225,
      pitchDeg: 0,
      rollDeg: 0,
      accelMag: 9.81,
      gyroActive: false,
      gpsCoords: null,
      gpsStatus: 'IDLE',
      wakeLockActive: false,
      torchHardwareActive: false,
      btScanning: false,
      btDeviceName: null,
      btStatus: bluetoothOn ? 'STANDBY' : 'DISABLED',
      uptimeSec: 0,
      cpuCores: nav?.hardwareConcurrency ?? 4,
      deviceMemGb: nav?.deviceMemory ?? null,
    };
  });

  const torchTrackRef = useRef<MediaStreamTrack | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const lastStepTsRef = useRef(0);
  const prevMagRef = useRef(9.81);
  const lastSensorCommitRef = useRef(0);
  const sensorValsRef = useRef({ heading: 225, pitch: 0, roll: 0, mag: 9.81 });

  // 1. Session uptime timer
  useEffect(() => {
    const id = window.setInterval(() => {
      setTelemetry((prev) => ({ ...prev, uptimeSec: prev.uptimeSec + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // 2. Real Battery & Charging API
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;

    let battery: BatteryManagerLike | null = null;
    let mounted = true;

    const syncBattery = () => {
      if (!battery || !mounted) return;
      setTelemetry((prev) => ({
        ...prev,
        batterySupported: true,
        batteryPct: Math.round(battery!.level * 100),
        isCharging: battery!.charging,
        chargingTimeSec: Number.isFinite(battery!.chargingTime) ? battery!.chargingTime : null,
        dischargingTimeSec: Number.isFinite(battery!.dischargingTime) ? battery!.dischargingTime : null,
      }));
    };

    nav
      .getBattery()
      .then((b) => {
        if (!mounted) return;
        battery = b;
        syncBattery();
        b.addEventListener('levelchange', syncBattery);
        b.addEventListener('chargingchange', syncBattery);
        b.addEventListener('chargingtimechange', syncBattery);
        b.addEventListener('dischargingtimechange', syncBattery);
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (battery) {
        battery.removeEventListener('levelchange', syncBattery);
        battery.removeEventListener('chargingchange', syncBattery);
        battery.removeEventListener('chargingtimechange', syncBattery);
        battery.removeEventListener('dischargingtimechange', syncBattery);
      }
    };
  }, []);

  // 3. Real Online/Offline & Network Information API
  useEffect(() => {
    const nav = navigator as Navigator & { connection?: NetworkInfoLike };
    const syncNetwork = () => {
      setTelemetry((prev) => ({
        ...prev,
        online: navigator.onLine,
        netType: (nav.connection?.effectiveType ?? nav.connection?.type ?? (navigator.onLine ? 'WIFI/4G' : 'OFFLINE')).toUpperCase(),
        downlinkMbps: nav.connection?.downlink ?? (navigator.onLine ? prev.downlinkMbps : 0),
        rttMs: nav.connection?.rtt ?? (navigator.onLine ? prev.rttMs : 0),
      }));
    };

    syncNetwork();
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
    nav.connection?.addEventListener?.('change', syncNetwork);

    return () => {
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
      nav.connection?.removeEventListener?.('change', syncNetwork);
    };
  }, []);

  // 4. Real DeviceMotion (Accelerometer Pedometer) & DeviceOrientation (Gyroscope & Compass)
  const attachSensorListeners = useCallback(() => {
    const handleOrientation = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const hasVal = e.alpha !== null || e.beta !== null || e.gamma !== null;
      if (!hasVal) return;

      const heading =
        typeof e.webkitCompassHeading === 'number'
          ? Math.round(e.webkitCompassHeading)
          : e.alpha !== null
            ? Math.round((360 - e.alpha) % 360)
            : sensorValsRef.current.heading;
      const pitch = e.beta !== null ? Math.round(e.beta) : 0;
      const roll = e.gamma !== null ? Math.round(e.gamma) : 0;

      sensorValsRef.current.heading = heading;
      sensorValsRef.current.pitch = pitch;
      sensorValsRef.current.roll = roll;

      const now = performance.now();
      if (now - lastSensorCommitRef.current > 120) {
        lastSensorCommitRef.current = now;
        setTelemetry((prev) => ({
          ...prev,
          gyroActive: true,
          headingDeg: heading,
          pitchDeg: pitch,
          rollDeg: roll,
        }));
      }
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity ?? e.acceleration;
      if (!acc) return;
      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;
      const mag = Math.sqrt(x * x + y * y + z * z);
      sensorValsRef.current.mag = +mag.toFixed(2);

      // Peak-detection step algorithm (gravity ~9.81; walking peaks > 11.4 m/s^2 with >=320ms debounce)
      const now = performance.now();
      const delta = mag - prevMagRef.current;
      prevMagRef.current = mag;

      if (mag > 11.4 && delta > 1.35 && now - lastStepTsRef.current > 320) {
        lastStepTsRef.current = now;
        setTelemetry((prev) => {
          const nextSteps = prev.steps + 1;
          try {
            localStorage.setItem(getTodayKey(), String(nextSteps));
          } catch {
            // ignore
          }
          return {
            ...prev,
            steps: nextSteps,
            stepActive: true,
            accelMag: sensorValsRef.current.mag,
          };
        });
      } else if (now - lastSensorCommitRef.current > 180) {
        lastSensorCommitRef.current = now;
        setTelemetry((prev) => ({
          ...prev,
          stepActive: true,
          accelMag: sensorValsRef.current.mag,
        }));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  useEffect(() => {
    const dm = (window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceMotionEvent;
    if (typeof dm?.requestPermission === 'function') {
      // Wait for explicit user gesture on iOS Safari
      return;
    }
    return attachSensorListeners();
  }, [attachSensorListeners]);

  const enableMotionSensors = useCallback(async () => {
    try {
      const dm = (window as unknown as {
        DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
      }).DeviceMotionEvent;
      const dor = (window as unknown as {
        DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
      }).DeviceOrientationEvent;

      if (typeof dm?.requestPermission === 'function') {
        await dm.requestPermission();
      }
      if (typeof dor?.requestPermission === 'function') {
        await dor.requestPermission();
      }
      attachSensorListeners();
      setTelemetry((prev) => ({
        ...prev,
        sensorNeedsPermission: false,
        gyroActive: true,
        stepActive: true,
      }));
      return true;
    } catch {
      return false;
    }
  }, [attachSensorListeners]);

  const resetSteps = useCallback(() => {
    try {
      localStorage.setItem(getTodayKey(), '0');
    } catch {
      // ignore
    }
    setTelemetry((prev) => ({ ...prev, steps: 0 }));
  }, []);

  // 5. Real Hardware Camera Torch (alongside full-screen edge torch)
  useEffect(() => {
    let cancelled = false;

    const turnOffTorch = () => {
      if (torchTrackRef.current) {
        try {
          torchTrackRef.current.stop();
        } catch {
          // ignore
        }
        torchTrackRef.current = null;
      }
      setTelemetry((prev) => (prev.torchHardwareActive ? { ...prev, torchHardwareActive: false } : prev));
    };

    if (!flashlightOn) {
      turnOffTorch();
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then(async (stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const track = stream.getVideoTracks()[0];
          if (!track) return;
          torchTrackRef.current = track;
          const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
          if (caps && 'torch' in caps && caps.torch) {
            await track.applyConstraints({
              advanced: [{ torch: true } as MediaTrackConstraintSet],
            });
            if (!cancelled) {
              setTelemetry((prev) => ({ ...prev, torchHardwareActive: true }));
            }
          } else {
            // No hardware LED torch available on this device; keep screen-edge torch only
            track.stop();
            torchTrackRef.current = null;
          }
        })
        .catch(() => {
          // Camera permission declined or desktop without rear torch — screen-edge torch still shines
        });
    }

    return () => {
      cancelled = true;
      turnOffTorch();
    };
  }, [flashlightOn]);

  // 6. Real Screen Wake Lock API
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    let cancelled = false;

    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
      }
      setTelemetry((prev) => (prev.wakeLockActive ? { ...prev, wakeLockActive: false } : prev));
    };

    if (!keepAwakeOn || !nav.wakeLock) {
      releaseLock();
      return;
    }

    nav.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
        setTelemetry((prev) => ({ ...prev, wakeLockActive: true }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      releaseLock();
    };
  }, [keepAwakeOn]);

  // 7. Sync Bluetooth status label
  useEffect(() => {
    setTelemetry((prev) => ({
      ...prev,
      btStatus: !bluetoothOn ? 'DISABLED' : prev.btDeviceName ? `PAIRED · ${prev.btDeviceName}` : 'READY',
    }));
  }, [bluetoothOn]);

  // 8. Real Web Bluetooth Scan
  const scanBluetooth = useCallback(async () => {
    const nav = navigator as Navigator & {
      bluetooth?: {
        requestDevice: (opts: { acceptAllDevices: boolean }) => Promise<{ name?: string; id: string }>;
      };
    };

    if (!nav.bluetooth) {
      setTelemetry((prev) => ({
        ...prev,
        btScanning: false,
        btStatus: 'WEB BT UNSUPPORTED ON BROWSER',
      }));
      return null;
    }

    setTelemetry((prev) => ({ ...prev, btScanning: true, btStatus: 'SCANNING...' }));
    try {
      const dev = await nav.bluetooth.requestDevice({ acceptAllDevices: true });
      const label = dev.name || `BT-${dev.id.slice(0, 6).toUpperCase()}`;
      setTelemetry((prev) => ({
        ...prev,
        btScanning: false,
        btDeviceName: label,
        btStatus: `PAIRED · ${label}`,
      }));
      return label;
    } catch {
      setTelemetry((prev) => ({
        ...prev,
        btScanning: false,
        btStatus: prev.btDeviceName ? `PAIRED · ${prev.btDeviceName}` : 'READY (SCAN CANCELLED)',
      }));
      return null;
    }
  }, []);

  // 9. Real Geolocation Lock
  const requestGpsLock = useCallback(() => {
    if (!navigator.geolocation) {
      setTelemetry((prev) => ({ ...prev, gpsStatus: 'DENIED' }));
      return;
    }
    setTelemetry((prev) => ({ ...prev, gpsStatus: 'LOCKING' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTelemetry((prev) => ({
          ...prev,
          gpsStatus: 'LOCKED',
          gpsCoords: {
            lat: +pos.coords.latitude.toFixed(5),
            lon: +pos.coords.longitude.toFixed(5),
            accuracy: Math.round(pos.coords.accuracy),
          },
        }));
      },
      () => {
        setTelemetry((prev) => ({ ...prev, gpsStatus: 'DENIED' }));
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 10. Real Android Haptic Feedback
  const triggerHaptic = useCallback(
    (ms: number | number[] = 10) => {
      if (!hapticsOn || typeof navigator === 'undefined' || !navigator.vibrate) return;
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    },
    [hapticsOn]
  );

  return {
    telemetry,
    enableMotionSensors,
    resetSteps,
    scanBluetooth,
    requestGpsLock,
    triggerHaptic,
  };
}
