import React, { memo, useEffect, useRef } from 'react';

interface HologramOrb3DProps {
  size: number;
  accent?: 'cyan' | 'crimson' | 'amber';
  active?: boolean;
  pulseTrigger?: number;
  pitchDeg?: number;
  rollDeg?: number;
}

interface ParticleSeed {
  theta: number;
  phi: number;
  rNorm: number;
  speed: number;
  phase: number;
  size: number;
  tint: number; // 0 = primary, 1 = white-hot, 2 = secondary
}

// 240 smooth Fibonacci micro-particles across volumetric shells (zero low-poly polygons)
const PARTICLE_COUNT = 240;
const PARTICLES: ParticleSeed[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
  const phi = Math.acos(Math.max(-1, Math.min(1, y)));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  const shell = i % 5;
  return {
    theta,
    phi,
    rNorm: 0.48 + shell * 0.115 + ((i * 17) % 10) * 0.008,
    speed: (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 7) * 0.07),
    phase: i * 0.37,
    size: i % 11 === 0 ? 1.85 : i % 3 === 0 ? 1.25 : 0.8,
    tint: i % 13 === 0 ? 2 : i % 4 === 0 ? 1 : 0,
  };
});

// Smooth 3D parametric ribbon loops for liquid plasma streams
const RIBBON_CONFIGS = [
  { tiltX: 0.88, tiltY: 0.25, tiltZ: 0.15, speed: 0.55, r: 0.88, waveFreq: 3, waveAmp: 0.08, width: 2.0, tint: 0 },
  { tiltX: -0.72, tiltY: 0.65, tiltZ: 1.05, speed: -0.48, r: 0.82, waveFreq: 2, waveAmp: 0.1, width: 1.8, tint: 1 },
  { tiltX: 0.34, tiltY: -0.92, tiltZ: -0.68, speed: 0.62, r: 0.94, waveFreq: 4, waveAmp: 0.06, width: 1.6, tint: 0 },
  { tiltX: 1.18, tiltY: -0.38, tiltZ: 0.72, speed: -0.4, r: 0.75, waveFreq: 2, waveAmp: 0.09, width: 1.5, tint: 2 },
  { tiltX: -0.45, tiltY: -0.5, tiltZ: 1.48, speed: 0.5, r: 0.9, waveFreq: 3, waveAmp: 0.07, width: 1.4, tint: 1 },
];

export const HologramOrb3D: React.FC<HologramOrb3DProps> = memo(
  ({
    size,
    accent = 'cyan',
    active = false,
    pulseTrigger = 0,
    pitchDeg = 0,
    rollDeg = 0,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pulseRef = useRef(0);
    const shockwaveRef = useRef(0);
    const gyroRef = useRef({ pitch: 0, roll: 0 });
    const accentRef = useRef(accent);
    const activeRef = useRef(active);

    accentRef.current = accent;
    activeRef.current = active;
    gyroRef.current = {
      pitch: Math.max(-35, Math.min(35, pitchDeg)) * 0.011,
      roll: Math.max(-35, Math.min(35, rollDeg)) * 0.011,
    };

    useEffect(() => {
      if (pulseTrigger > 0) {
        pulseRef.current = 1;
        shockwaveRef.current = 0.01;
      }
    }, [pulseTrigger]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.max(72, Math.round(size));
      canvas.width = Math.round(px * dpr);
      canvas.height = Math.round(px * dpr);

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      let rafId = 0;
      let t = 0;
      let lastTs = performance.now();

      const drawFrame = (now: number) => {
        const dt = Math.min(0.05, (now - lastTs) / 1000);
        lastTs = now;
        if (!prefersReduced) {
          t += dt * (activeRef.current ? 1.35 : 0.85);
        }
        pulseRef.current = Math.max(0, pulseRef.current - dt * 2.1);
        if (shockwaveRef.current > 0) {
          shockwaveRef.current += dt * 1.9;
          if (shockwaveRef.current >= 1) shockwaveRef.current = 0;
        }

        const w = px;
        const h = px;
        const cx = w / 2;
        const cy = h / 2;
        const baseR = w * 0.39 * (1 + pulseRef.current * 0.06);
        const perspective = w * 2.2;

        const modeAccent = accentRef.current;
        const primaryRgb =
          modeAccent === 'crimson'
            ? '255, 42, 75'
            : modeAccent === 'amber'
              ? '255, 178, 48'
              : '0, 240, 255';
        const secondaryRgb =
          modeAccent === 'crimson'
            ? '0, 240, 255'
            : modeAccent === 'amber'
              ? '255, 82, 42'
              : '255, 42, 75';

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // 1. Deep volumetric atmosphere field
        const fieldGrad = ctx.createRadialGradient(cx, cy, baseR * 0.14, cx, cy, baseR * 1.25);
        fieldGrad.addColorStop(0, `rgba(${primaryRgb}, ${0.32 + pulseRef.current * 0.18})`);
        fieldGrad.addColorStop(0.38, `rgba(${primaryRgb}, 0.13)`);
        fieldGrad.addColorStop(0.72, `rgba(${secondaryRgb}, 0.04)`);
        fieldGrad.addColorStop(1, 'rgba(2, 3, 6, 0)');
        ctx.fillStyle = fieldGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 1.25, 0, Math.PI * 2);
        ctx.fill();

        // Additive glow mode for fluid plasma ribbons & volumetric dust
        ctx.globalCompositeOperation = 'lighter';

        const gx = gyroRef.current.pitch;
        const gy = gyroRef.current.roll;

        // 2. Smooth Fluid 3D Plasma Ribbon Streams (double-pass bloom + crisp bright filament)
        const steps = 64;
        for (const rib of RIBBON_CONFIGS) {
          const rotA = t * rib.speed;
          const ax = rib.tiltX + gx + Math.sin(t * 0.35 + rib.tiltZ) * 0.14;
          const ay = rib.tiltY + gy + rotA;
          const az = rib.tiltZ + Math.cos(t * 0.28) * 0.12;

          const cax = Math.cos(ax);
          const sax = Math.sin(ax);
          const cay = Math.cos(ay);
          const say = Math.sin(ay);
          const caz = Math.cos(az);
          const saz = Math.sin(az);

          ctx.beginPath();
          for (let s = 0; s <= steps; s++) {
            const ang = (s / steps) * Math.PI * 2;
            const radialPulse =
              rib.r + Math.sin(ang * rib.waveFreq + t * 2.2) * rib.waveAmp;
            const px0 = Math.cos(ang) * radialPulse;
            const py0 = Math.sin(ang) * radialPulse;
            const pz0 = Math.cos(ang * 2 - t * 1.6) * 0.12;

            // Rotate X -> Y -> Z
            const y1 = py0 * cax - pz0 * sax;
            const z1 = py0 * sax + pz0 * cax;
            const x2 = px0 * cay + z1 * say;
            const z2 = -px0 * say + z1 * cay;
            const x3 = x2 * caz - y1 * saz;
            const y3 = x2 * saz + y1 * caz;

            const proj = perspective / (perspective - z2 * baseR);
            const sx = cx + x3 * baseR * proj;
            const sy = cy + y3 * baseR * proj;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }

          const colorStr =
            rib.tint === 1
              ? '230, 248, 255'
              : rib.tint === 2
                ? secondaryRgb
                : primaryRgb;

          // Soft volumetric outer bloom pass
          ctx.strokeStyle = `rgba(${colorStr}, ${0.18 + pulseRef.current * 0.14})`;
          ctx.lineWidth = rib.width * 3.4;
          ctx.stroke();

          // Sharp luminous filament core
          ctx.strokeStyle = `rgba(${colorStr}, ${0.55 + pulseRef.current * 0.25})`;
          ctx.lineWidth = rib.width * 0.85;
          ctx.stroke();
        }

        // 3. 240 Volumetric Spherical Harmonic Micro-Particles (smooth organic energy cloud)
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const p = PARTICLES[i];
          const harmonic =
            1 +
            0.065 * Math.sin(p.phi * 4 + t * 1.9 + p.phase) +
            0.045 * Math.cos(p.theta * 3 - t * 1.4);
          const r = p.rNorm * harmonic;
          const th = p.theta + t * p.speed + gy;
          const ph = p.phi + Math.sin(t * 0.5 + p.phase) * 0.08 + gx;

          const sinPhi = Math.sin(ph);
          const x = r * sinPhi * Math.cos(th);
          const y = r * Math.cos(ph);
          const z = r * sinPhi * Math.sin(th);

          const proj = perspective / (perspective - z * baseR);
          const sx = cx + x * baseR * proj;
          const sy = cy + y * baseR * proj;
          const depthAlpha = Math.max(0.14, Math.min(0.88, (z + 1.05) * 0.42));

          ctx.fillStyle =
            p.tint === 2
              ? `rgba(${secondaryRgb}, ${depthAlpha})`
              : p.tint === 1
                ? `rgba(235, 250, 255, ${depthAlpha})`
                : `rgba(${primaryRgb}, ${depthAlpha})`;

          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.55, p.size * proj), 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Interaction Shockwave Pulse Ripple
        if (shockwaveRef.current > 0) {
          const prog = shockwaveRef.current;
          const waveR = baseR * (0.3 + prog * 0.92);
          ctx.strokeStyle = `rgba(${primaryRgb}, ${(1 - prog) * 0.65})`;
          ctx.lineWidth = 2 * (1 - prog) + 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 5. Sleek Dark Spiral Turbine Nucleus (matching reference 1 center depth)
        ctx.globalCompositeOperation = 'source-over';
        const innerR = baseR * 0.34;
        const darkCore = ctx.createRadialGradient(cx, cy, innerR * 0.12, cx, cy, innerR);
        darkCore.addColorStop(0, `rgba(${primaryRgb}, 0.55)`);
        darkCore.addColorStop(0.32, 'rgba(5, 11, 20, 0.92)');
        darkCore.addColorStop(0.85, 'rgba(3, 6, 12, 0.85)');
        darkCore.addColorStop(1, 'rgba(2, 3, 6, 0)');
        ctx.fillStyle = darkCore;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();

        // Smooth curved spiral iris arcs inside core
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) {
          const a0 = t * 1.1 + (k * Math.PI * 2) / 3;
          ctx.strokeStyle = `rgba(230, 248, 255, 0.42)`;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(
            cx + Math.cos(a0) * (innerR * 0.24),
            cy + Math.sin(a0) * (innerR * 0.24),
            innerR * 0.56,
            a0,
            a0 + 1.9
          );
          ctx.stroke();
        }

        // Pinpoint luminous core singularity
        const centerDot = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR * 0.35);
        centerDot.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        centerDot.addColorStop(0.5, `rgba(${primaryRgb}, 0.65)`);
        centerDot.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = centerDot;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        if (!prefersReduced) {
          rafId = requestAnimationFrame(drawFrame);
        }
      };

      const handleVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(rafId);
        } else if (!prefersReduced) {
          lastTs = performance.now();
          rafId = requestAnimationFrame(drawFrame);
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      rafId = requestAnimationFrame(drawFrame);

      return () => {
        cancelAnimationFrame(rafId);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }, [size]);

    return (
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block pointer-events-none select-none"
        aria-hidden="true"
      />
    );
  }
);

HologramOrb3D.displayName = 'HologramOrb3D';
