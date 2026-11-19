import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { DialOption } from '../types/hud';
import { hudSound } from '../utils/soundFx';

interface ArcReactorCoreProps {
  variant: 'portrait' | 'rotary-hub' | 'half-dial';
  options: DialOption[];
  activeOptionId: string;
  onSelectOption: (id: string, activate?: boolean) => void;
  onCenterBack?: () => void;
  centerHint?: string;
  size?: number;
  pulseTrigger?: number;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeAnnularSector(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    outerStart.x,
    outerStart.y,
    'A',
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    'L',
    innerEnd.x,
    innerEnd.y,
    'A',
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    innerStart.x,
    innerStart.y,
    'Z',
  ].join(' ');
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

export const ArcReactorCore: React.FC<ArcReactorCoreProps> = ({
  variant,
  options,
  activeOptionId,
  onSelectOption,
  onCenterBack,
  centerHint,
  size = 280,
  pulseTrigger = 0,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const count = Math.max(1, options.length);
  const stepDeg = 360 / count;
  const targetSlotDeg = variant === 'half-dial' ? 270 : 0;

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === activeOptionId)
  );

  const [wheelAngle, setWheelAngle] = useState<number>(() => targetSlotDeg - activeIndex * stepDeg);
  const [isDragging, setIsDragging] = useState(false);
  const [detentPulse, setDetentPulse] = useState(false);
  const [ringAngles, setRingAngles] = useState({ r1: 0, r2: 0, r3: 0, r4: 0 });

  const dragState = useRef<{
    active: boolean;
    startPointerAngle: number;
    startWheelAngle: number;
    moved: boolean;
    lastSnappedIdx: number;
  }>({
    active: false,
    startPointerAngle: 0,
    startWheelAngle: 0,
    moved: false,
    lastSnappedIdx: activeIndex,
  });

  const lastWheelTs = useRef(0);

  useEffect(() => {
    if (dragState.current.active) return;
    const desired = targetSlotDeg - activeIndex * stepDeg;
    setWheelAngle((prev) => {
      const diff = ((((desired - prev) % 360) + 540) % 360) - 180;
      return prev + diff;
    });
    dragState.current.lastSnappedIdx = activeIndex;
  }, [activeIndex, stepDeg, targetSlotDeg, count]);

  useEffect(() => {
    if (pulseTrigger > 0) {
      setDetentPulse(true);
      const t = setTimeout(() => setDetentPulse(false), 220);
      return () => clearTimeout(t);
    }
  }, [pulseTrigger]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      setRingAngles((prev) => ({
        r1: (prev.r1 + 8 * dt) % 360,
        r2: (prev.r2 - 14 * dt) % 360,
        r3: (prev.r3 + 22 * dt) % 360,
        r4: (prev.r4 - 6 * dt) % 360,
      }));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const getPointerAngle = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    return (rad * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (variant === 'portrait') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pAngle = getPointerAngle(e.clientX, e.clientY);
    dragState.current = {
      active: true,
      startPointerAngle: pAngle,
      startWheelAngle: wheelAngle,
      moved: false,
      lastSnappedIdx: activeIndex,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState.current.active) return;
    const pAngle = getPointerAngle(e.clientX, e.clientY);
    let delta = pAngle - dragState.current.startPointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    if (Math.abs(delta) > 4) {
      dragState.current.moved = true;
    }

    const nextAngle = dragState.current.startWheelAngle + delta;
    setWheelAngle(nextAngle);

    const rawIdx = Math.round((targetSlotDeg - nextAngle) / stepDeg);
    const wrappedIdx = ((rawIdx % count) + count) % count;
    if (wrappedIdx !== dragState.current.lastSnappedIdx && options[wrappedIdx]) {
      dragState.current.lastSnappedIdx = wrappedIdx;
      hudSound.playDetentClick();
      setDetentPulse(true);
      setTimeout(() => setDetentPulse(false), 150);
      onSelectOption(options[wrappedIdx].id, false);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState.current.active) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragState.current.active = false;
    setIsDragging(false);

    const rawIdx = Math.round((targetSlotDeg - wheelAngle) / stepDeg);
    const wrappedIdx = ((rawIdx % count) + count) % count;
    const snappedAngle = targetSlotDeg - rawIdx * stepDeg;
    setWheelAngle(snappedAngle);
    if (options[wrappedIdx]) {
      onSelectOption(options[wrappedIdx].id, false);
    }
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (variant === 'portrait') return;
    const nowTs = performance.now();
    if (nowTs - lastWheelTs.current < 85) return;
    lastWheelTs.current = nowTs;

    const dir = e.deltaY > 0 || e.deltaX > 0 ? 1 : -1;
    const nextIdx = (activeIndex + dir + count) % count;
    if (options[nextIdx]) {
      hudSound.playDetentClick();
      setDetentPulse(true);
      setTimeout(() => setDetentPulse(false), 140);
      onSelectOption(options[nextIdx].id, false);
    }
  };

  const cx = 160;
  const cy = 160;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const gapAngle = count <= 4 ? 5 : count <= 6 ? 3.5 : 2.5;

  return (
    <div
      className="relative flex items-center justify-center select-none touch-none"
      style={{ width: size, height: size }}
    >
      <div
        className={`pointer-events-none absolute rounded-full transition-all duration-300 ${
          detentPulse ? 'scale-110 opacity-100' : 'scale-100 opacity-75'
        }`}
        style={{
          width: size * 0.56,
          height: size * 0.56,
          background:
            'radial-gradient(circle, rgba(0,240,255,0.22) 0%, rgba(0,240,255,0.05) 54%, transparent 75%)',
        }}
      />

      <svg
        ref={svgRef}
        viewBox="0 0 320 320"
        width={size}
        height={size}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className={`overflow-visible ${
          variant !== 'portrait' ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <defs>
          <filter id="cyanGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="crimsonGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="coreRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E6F8FF" stopOpacity="0.92" />
            <stop offset="44%" stopColor="#00F0FF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#020306" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={151}
          fill="none"
          stroke="rgba(0,240,255,0.2)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
        {ticks.map((deg) => {
          const isMajor = deg % 15 === 0;
          const isCardinal = deg % 45 === 0;
          const p1 = polarToCartesian(cx, cy, isMajor ? 140 : 144, deg);
          const p2 = polarToCartesian(cx, cy, 149, deg);
          return (
            <line
              key={deg}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={
                isCardinal
                  ? '#00F0FF'
                  : isMajor
                    ? 'rgba(230,248,255,0.45)'
                    : 'rgba(0,240,255,0.18)'
              }
              strokeWidth={isCardinal ? 1.5 : 0.85}
            />
          );
        })}

        {variant === 'half-dial' && (
          <g className="pointer-events-none">
            <path
              d={describeArc(cx, cy, 155, 195, 255)}
              fill="none"
              stroke="#FF2A4B"
              strokeWidth="2"
              filter="url(#crimsonGlow)"
            />
            <path
              d={describeArc(cx, cy, 155, 285, 345)}
              fill="none"
              stroke="#00F0FF"
              strokeWidth="1.6"
              filter="url(#cyanGlow)"
            />
          </g>
        )}

        {variant === 'portrait' && (
          <g>
            <g
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                transform: `rotate(${ringAngles.r4}deg)`,
              }}
            >
              {options.map((opt, idx) => {
                const centerAngle = idx * stepDeg;
                const start = centerAngle - stepDeg / 2 + gapAngle;
                const end = centerAngle + stepDeg / 2 - gapAngle;
                const isActive = opt.id === activeOptionId;
                const labelPos = polarToCartesian(cx, cy, 114, centerAngle);
                return (
                  <g
                    key={opt.id}
                    className="cursor-pointer"
                    onClick={() => {
                      hudSound.playDetentClick();
                      onSelectOption(opt.id, true);
                    }}
                  >
                    <path
                      d={describeAnnularSector(cx, cy, 94, isActive ? 134 : 130, start, end)}
                      fill={isActive ? 'rgba(0,240,255,0.18)' : 'rgba(5,10,16,0.75)'}
                      stroke={isActive ? '#00F0FF' : 'rgba(0,240,255,0.32)'}
                      strokeWidth={isActive ? 1.6 : 0.9}
                      filter={isActive ? 'url(#cyanGlow)' : undefined}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isActive ? '#E6F8FF' : 'rgba(0,240,255,0.82)'}
                      fontSize="7.2"
                      fontFamily="Orbitron, sans-serif"
                      letterSpacing="0.06em"
                      transform={`rotate(${-ringAngles.r4}, ${labelPos.x}, ${labelPos.y})`}
                    >
                      {opt.label}
                    </text>
                  </g>
                );
              })}
            </g>

            <g
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                transform: `rotate(${ringAngles.r2}deg)`,
              }}
            >
              <path
                d={describeArc(cx, cy, 86, 15, 65)}
                fill="none"
                stroke="#FF2A4B"
                strokeWidth="2.2"
                filter="url(#crimsonGlow)"
              />
              <path
                d={describeArc(cx, cy, 86, 195, 245)}
                fill="none"
                stroke="#FF2A4B"
                strokeWidth="2.2"
                filter="url(#crimsonGlow)"
              />
            </g>
          </g>
        )}

        {variant !== 'portrait' && (
          <g
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${wheelAngle}deg)`,
              transition: isDragging
                ? 'none'
                : 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {options.map((opt, idx) => {
              const centerAngle = idx * stepDeg;
              const start = centerAngle - stepDeg / 2 + gapAngle;
              const end = centerAngle + stepDeg / 2 - gapAngle;
              const isSelected = opt.id === activeOptionId;
              const isCrimson = opt.accent === 'crimson';

              const innerR = 84;
              const outerR = isSelected ? 136 : 128;
              const labelPos = polarToCartesian(cx, cy, isSelected ? 113 : 108, centerAngle);
              const codePos = polarToCartesian(cx, cy, 93, centerAngle);
              const counterTextRot = -wheelAngle;

              return (
                <g
                  key={opt.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragState.current.moved) return;
                    hudSound.playDetentClick();
                    onSelectOption(opt.id, isSelected || opt.isAction || variant === 'half-dial');
                  }}
                >
                  <path
                    d={describeAnnularSector(cx, cy, innerR, outerR, start, end)}
                    fill={
                      isSelected
                        ? isCrimson
                          ? 'rgba(255, 42, 75, 0.24)'
                          : 'rgba(0, 240, 255, 0.22)'
                        : 'rgba(6, 12, 20, 0.82)'
                    }
                    stroke={
                      isSelected
                        ? isCrimson
                          ? '#FF2A4B'
                          : '#E6F8FF'
                        : isCrimson
                          ? 'rgba(255, 42, 75, 0.45)'
                          : 'rgba(0, 240, 255, 0.34)'
                    }
                    strokeWidth={isSelected ? 1.8 : 0.9}
                    filter={isSelected ? (isCrimson ? 'url(#crimsonGlow)' : 'url(#cyanGlow)') : undefined}
                  />

                  {isSelected && (
                    <path
                      d={describeAnnularSector(cx, cy, innerR - 3, outerR + 4, start - 1.2, end + 1.2)}
                      fill="none"
                      stroke={isCrimson ? '#FF2A4B' : '#00F0FF'}
                      strokeWidth="1.2"
                      strokeDasharray="6 3"
                      filter={isCrimson ? 'url(#crimsonGlow)' : 'url(#cyanGlow)'}
                    />
                  )}

                  <text
                    x={codePos.x}
                    y={codePos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#FF2A4B' : 'rgba(230,248,255,0.45)'}
                    fontSize="6.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                    transform={`rotate(${counterTextRot}, ${codePos.x}, ${codePos.y})`}
                  >
                    {opt.shortCode}
                  </text>

                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#FFFFFF' : isCrimson ? '#FFB4C0' : '#9FEFFF'}
                    fontSize={isSelected ? '8.5' : '7.2'}
                    fontWeight="700"
                    fontFamily="Orbitron, sans-serif"
                    letterSpacing="0.05em"
                    transform={`rotate(${counterTextRot}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    {opt.label}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {variant !== 'portrait' && (
          <g
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${targetSlotDeg}deg)`,
            }}
            className="pointer-events-none"
          >
            <polygon
              points={`${cx},15 ${cx - 5},6 ${cx + 5},6`}
              fill="#FF2A4B"
              filter="url(#crimsonGlow)"
            />
            <line x1={cx} y1={17} x2={cx} y2={26} stroke="#E6F8FF" strokeWidth="1.5" />
          </g>
        )}

        {/* 4 CONCENTRIC COUNTER-ROTATING REACTOR RINGS */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${ringAngles.r1}deg)`,
          }}
          className="pointer-events-none"
        >
          <circle
            cx={cx}
            cy={cy}
            r={74}
            fill="none"
            stroke="rgba(0,240,255,0.38)"
            strokeWidth="1.2"
            strokeDasharray="18 8 4 8"
          />
          {[0, 90, 180, 270].map((a) => (
            <path
              key={a}
              d={describeArc(cx, cy, 68, a - 14, a + 14)}
              fill="none"
              stroke="#00F0FF"
              strokeWidth="2.5"
              filter="url(#cyanGlow)"
            />
          ))}
        </g>

        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${ringAngles.r2}deg)`,
          }}
          className="pointer-events-none"
        >
          <circle
            cx={cx}
            cy={cy}
            r={58}
            fill="none"
            stroke="rgba(230,248,255,0.35)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
          <path
            d={describeArc(cx, cy, 54, 10, 110)}
            fill="none"
            stroke="#E6F8FF"
            strokeWidth="2.2"
            filter="url(#cyanGlow)"
          />
          <path
            d={describeArc(cx, cy, 54, 190, 290)}
            fill="none"
            stroke="#00F0FF"
            strokeWidth="2.2"
            filter="url(#cyanGlow)"
          />
          <path
            d={describeArc(cx, cy, 54, 130, 165)}
            fill="none"
            stroke="#FF2A4B"
            strokeWidth="2"
            filter="url(#crimsonGlow)"
          />
        </g>

        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${ringAngles.r3}deg)`,
          }}
          className="pointer-events-none"
        >
          <circle
            cx={cx}
            cy={cy}
            r={42}
            fill="none"
            stroke="rgba(0,240,255,0.5)"
            strokeWidth="1.4"
            strokeDasharray="12 6"
          />
          {[30, 150, 270].map((a) => (
            <path
              key={a}
              d={describeArc(cx, cy, 37, a - 22, a + 22)}
              fill="none"
              stroke="#E6F8FF"
              strokeWidth="2.8"
              filter="url(#cyanGlow)"
            />
          ))}
        </g>

        {/* Core Visual Rings */}
        <g className="pointer-events-none">
          <circle
            cx={cx}
            cy={cy}
            r={30}
            fill="rgba(2,4,8,0.92)"
            stroke="rgba(0,240,255,0.5)"
            strokeWidth="1"
          />
          <circle cx={cx} cy={cy} r={24} fill="url(#coreRadial)" />
          <g
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${ringAngles.r4}deg)`,
            }}
          >
            <circle
              cx={cx}
              cy={cy}
              r={21}
              fill="none"
              stroke="#E6F8FF"
              strokeWidth="2.5"
              strokeDasharray="24 6 8 6"
              filter="url(#cyanGlow)"
            />
          </g>
          {!centerHint && (
            <>
              <circle cx={cx} cy={cy} r={11} fill="none" stroke="#00F0FF" strokeWidth="1.2" opacity="0.9" />
              <circle cx={cx} cy={cy} r={4.5} fill="#E6F8FF" filter="url(#cyanGlow)" />
            </>
          )}
        </g>
      </svg>

      {/* Dedicated Real Clickable Center Core Button (Never swallowed by SVG drag!) */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (variant === 'half-dial' && onCenterBack) {
            hudSound.playDetentClick();
            onCenterBack();
          } else {
            hudSound.playChime();
            onSelectOption(activeOptionId, true);
          }
        }}
        aria-label={centerHint ? `Center ${centerHint}` : 'Activate selected dial module'}
        className="absolute z-30 rounded-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#00F0FF]/15 active:scale-95 transition-all"
        style={{
          width: size * 0.21,
          height: size * 0.21,
        }}
      >
        {centerHint && (
          <span className="flex items-center gap-0.5 font-mono-hud text-[9px] font-bold tracking-wider text-[#E6F8FF] text-glow-cyan">
            <ChevronLeft className="w-3 h-3 text-[#00F0FF]" />
            <span>{centerHint}</span>
          </span>
        )}
      </button>
    </div>
  );
};
