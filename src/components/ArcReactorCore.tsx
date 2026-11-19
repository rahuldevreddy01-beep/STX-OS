import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
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

const CX = 160;
const CY = 160;

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

const STATIC_TICKS = Array.from({ length: 72 }, (_, i) => {
  const deg = i * 5;
  const isMajor = deg % 15 === 0;
  const isCardinal = deg % 45 === 0;
  const p1 = polarToCartesian(CX, CY, isMajor ? 140 : 144, deg);
  const p2 = polarToCartesian(CX, CY, 149, deg);
  return {
    deg,
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    stroke: isCardinal
      ? '#00F0FF'
      : isMajor
        ? 'rgba(230,248,255,0.45)'
        : 'rgba(0,240,255,0.18)',
    strokeWidth: isCardinal ? 1.5 : 0.85,
  };
});

const StaticReactorBackdrop = memo(() => (
  <g className="pointer-events-none">
    <circle
      cx={CX}
      cy={CY}
      r={151}
      fill="none"
      stroke="rgba(0,240,255,0.2)"
      strokeWidth="1"
      strokeDasharray="3 6"
    />
    {STATIC_TICKS.map((t) => (
      <line
        key={t.deg}
        x1={t.x1}
        y1={t.y1}
        x2={t.x2}
        y2={t.y2}
        stroke={t.stroke}
        strokeWidth={t.strokeWidth}
      />
    ))}
  </g>
));
StaticReactorBackdrop.displayName = 'StaticReactorBackdrop';

const ReactorInnerRings = memo(({ showCenterDot }: { showCenterDot: boolean }) => (
  <>
    {/* 4 GPU-animated concentric counter-rotating reactor rings (zero JS rAF re-renders) */}
    <g
      style={{ transformOrigin: `${CX}px ${CY}px` }}
      className="pointer-events-none reactor-ring-r1"
    >
      <circle
        cx={CX}
        cy={CY}
        r={74}
        fill="none"
        stroke="rgba(0,240,255,0.38)"
        strokeWidth="1.2"
        strokeDasharray="18 8 4 8"
      />
      {[0, 90, 180, 270].map((a) => (
        <g key={a}>
          <path
            d={describeArc(CX, CY, 68, a - 14, a + 14)}
            fill="none"
            stroke="rgba(0,240,255,0.25)"
            strokeWidth="5.5"
          />
          <path
            d={describeArc(CX, CY, 68, a - 14, a + 14)}
            fill="none"
            stroke="#00F0FF"
            strokeWidth="2.4"
          />
        </g>
      ))}
    </g>

    <g
      style={{ transformOrigin: `${CX}px ${CY}px` }}
      className="pointer-events-none reactor-ring-r2"
    >
      <circle
        cx={CX}
        cy={CY}
        r={58}
        fill="none"
        stroke="rgba(230,248,255,0.35)"
        strokeWidth="1"
        strokeDasharray="3 5"
      />
      <path d={describeArc(CX, CY, 54, 10, 110)} fill="none" stroke="rgba(230,248,255,0.2)" strokeWidth="4.5" />
      <path d={describeArc(CX, CY, 54, 10, 110)} fill="none" stroke="#E6F8FF" strokeWidth="2.1" />
      <path d={describeArc(CX, CY, 54, 190, 290)} fill="none" stroke="rgba(0,240,255,0.25)" strokeWidth="4.5" />
      <path d={describeArc(CX, CY, 54, 190, 290)} fill="none" stroke="#00F0FF" strokeWidth="2.1" />
      <path d={describeArc(CX, CY, 54, 130, 165)} fill="none" stroke="#FF2A4B" strokeWidth="2" />
    </g>

    <g
      style={{ transformOrigin: `${CX}px ${CY}px` }}
      className="pointer-events-none reactor-ring-r3"
    >
      <circle
        cx={CX}
        cy={CY}
        r={42}
        fill="none"
        stroke="rgba(0,240,255,0.5)"
        strokeWidth="1.4"
        strokeDasharray="12 6"
      />
      {[30, 150, 270].map((a) => (
        <path
          key={a}
          d={describeArc(CX, CY, 37, a - 22, a + 22)}
          fill="none"
          stroke="#E6F8FF"
          strokeWidth="2.6"
        />
      ))}
    </g>

    <g className="pointer-events-none">
      <circle
        cx={CX}
        cy={CY}
        r={30}
        fill="rgba(2,4,8,0.92)"
        stroke="rgba(0,240,255,0.5)"
        strokeWidth="1"
      />
      <circle cx={CX} cy={CY} r={24} fill="url(#coreRadial)" />
      <g style={{ transformOrigin: `${CX}px ${CY}px` }} className="reactor-ring-r4">
        <circle
          cx={CX}
          cy={CY}
          r={21}
          fill="none"
          stroke="#E6F8FF"
          strokeWidth="2.4"
          strokeDasharray="24 6 8 6"
        />
      </g>
      {showCenterDot && (
        <>
          <circle cx={CX} cy={CY} r={11} fill="none" stroke="#00F0FF" strokeWidth="1.2" opacity="0.9" />
          <circle cx={CX} cy={CY} r={4.5} fill="#E6F8FF" />
        </>
      )}
    </g>
  </>
));
ReactorInnerRings.displayName = 'ReactorInnerRings';

export const ArcReactorCore: React.FC<ArcReactorCoreProps> = memo(
  ({
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

    const dragState = useRef<{
      active: boolean;
      startPointerAngle: number;
      startWheelAngle: number;
      latestAngle: number;
      moved: boolean;
      lastSnappedIdx: number;
      rafPending: boolean;
    }>({
      active: false,
      startPointerAngle: 0,
      startWheelAngle: 0,
      latestAngle: wheelAngle,
      moved: false,
      lastSnappedIdx: activeIndex,
      rafPending: false,
    });

    const lastWheelTs = useRef(0);

    useEffect(() => {
      if (dragState.current.active) return;
      const desired = targetSlotDeg - activeIndex * stepDeg;
      setWheelAngle((prev) => {
        const diff = ((((desired - prev) % 360) + 540) % 360) - 180;
        const next = prev + diff;
        dragState.current.latestAngle = next;
        return next;
      });
      dragState.current.lastSnappedIdx = activeIndex;
    }, [activeIndex, stepDeg, targetSlotDeg, count]);

    useEffect(() => {
      if (pulseTrigger > 0) {
        setDetentPulse(true);
        const t = setTimeout(() => setDetentPulse(false), 180);
        return () => clearTimeout(t);
      }
    }, [pulseTrigger]);

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
        latestAngle: wheelAngle,
        moved: false,
        lastSnappedIdx: activeIndex,
        rafPending: false,
      };
      setIsDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState.current.active) return;
      const pAngle = getPointerAngle(e.clientX, e.clientY);
      let delta = pAngle - dragState.current.startPointerAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      if (Math.abs(delta) > 5) {
        dragState.current.moved = true;
      }

      const nextAngle = dragState.current.startWheelAngle + delta;
      dragState.current.latestAngle = nextAngle;

      if (!dragState.current.rafPending) {
        dragState.current.rafPending = true;
        requestAnimationFrame(() => {
          dragState.current.rafPending = false;
          if (!dragState.current.active) return;
          const angle = dragState.current.latestAngle;
          setWheelAngle(angle);

          const rawIdx = Math.round((targetSlotDeg - angle) / stepDeg);
          const wrappedIdx = ((rawIdx % count) + count) % count;
          if (wrappedIdx !== dragState.current.lastSnappedIdx && options[wrappedIdx]) {
            dragState.current.lastSnappedIdx = wrappedIdx;
            hudSound.playDetentClick();
            onSelectOption(options[wrappedIdx].id, false);
          }
        });
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

      const currentAngle = dragState.current.latestAngle;
      const rawIdx = Math.round((targetSlotDeg - currentAngle) / stepDeg);
      const wrappedIdx = ((rawIdx % count) + count) % count;
      const snappedAngle = targetSlotDeg - rawIdx * stepDeg;
      setWheelAngle(snappedAngle);
      dragState.current.latestAngle = snappedAngle;
      if (dragState.current.moved && options[wrappedIdx]) {
        onSelectOption(options[wrappedIdx].id, false);
      }
    };

    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
      if (variant === 'portrait') return;
      const nowTs = performance.now();
      if (nowTs - lastWheelTs.current < 75) return;
      lastWheelTs.current = nowTs;

      const dir = e.deltaY > 0 || e.deltaX > 0 ? 1 : -1;
      const nextIdx = (activeIndex + dir + count) % count;
      if (options[nextIdx]) {
        hudSound.playDetentClick();
        onSelectOption(options[nextIdx].id, false);
      }
    };

    const gapAngle = count <= 4 ? 5 : count <= 6 ? 3.5 : 2.5;

    const sectorGeometry = useMemo(() => {
      return options.map((opt, idx) => {
        const centerAngle = idx * stepDeg;
        const start = centerAngle - stepDeg / 2 + gapAngle;
        const end = centerAngle + stepDeg / 2 - gapAngle;
        return {
          opt,
          centerAngle,
          start,
          end,
          portraitPath: describeAnnularSector(CX, CY, 94, 132, start, end),
          portraitActivePath: describeAnnularSector(CX, CY, 94, 136, start, end),
          portraitLabelPos: polarToCartesian(CX, CY, 114, centerAngle),
          dialPath: describeAnnularSector(CX, CY, 84, 128, start, end),
          dialActivePath: describeAnnularSector(CX, CY, 84, 136, start, end),
          dialHaloPath: describeAnnularSector(CX, CY, 81, 140, start - 1.2, end + 1.2),
          dialLabelPos: polarToCartesian(CX, CY, 108, centerAngle),
          dialActiveLabelPos: polarToCartesian(CX, CY, 113, centerAngle),
          dialCodePos: polarToCartesian(CX, CY, 93, centerAngle),
        };
      });
    }, [options, stepDeg, gapAngle]);

    return (
      <div
        className="relative flex items-center justify-center select-none touch-none"
        style={{ width: size, height: size }}
      >
        <div
          className={`pointer-events-none absolute rounded-full transition-transform duration-200 will-change-transform ${
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
            <radialGradient id="coreRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E6F8FF" stopOpacity="0.92" />
              <stop offset="44%" stopColor="#00F0FF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#020306" stopOpacity="0" />
            </radialGradient>
          </defs>

          <StaticReactorBackdrop />

          {variant === 'half-dial' && (
            <g className="pointer-events-none">
              <path
                d={describeArc(CX, CY, 155, 195, 255)}
                fill="none"
                stroke="#FF2A4B"
                strokeWidth="2.2"
              />
              <path
                d={describeArc(CX, CY, 155, 285, 345)}
                fill="none"
                stroke="#00F0FF"
                strokeWidth="1.8"
              />
            </g>
          )}

          {variant === 'portrait' && (
            <g>
              {sectorGeometry.map(({ opt, portraitPath, portraitActivePath, portraitLabelPos }) => {
                const isActive = opt.id === activeOptionId;
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
                      d={isActive ? portraitActivePath : portraitPath}
                      fill={isActive ? 'rgba(0,240,255,0.22)' : 'rgba(5,10,16,0.78)'}
                      stroke={isActive ? '#00F0FF' : 'rgba(0,240,255,0.34)'}
                      strokeWidth={isActive ? 1.8 : 0.9}
                    />
                    <text
                      x={portraitLabelPos.x}
                      y={portraitLabelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isActive ? '#FFFFFF' : 'rgba(159,239,255,0.9)'}
                      fontSize="7.4"
                      fontWeight="700"
                      fontFamily="Orbitron, sans-serif"
                      letterSpacing="0.06em"
                    >
                      {opt.label}
                    </text>
                  </g>
                );
              })}

              <g style={{ transformOrigin: `${CX}px ${CY}px` }} className="reactor-ring-r2 pointer-events-none">
                <path d={describeArc(CX, CY, 86, 15, 65)} fill="none" stroke="#FF2A4B" strokeWidth="2.2" />
                <path d={describeArc(CX, CY, 86, 195, 245)} fill="none" stroke="#FF2A4B" strokeWidth="2.2" />
              </g>
            </g>
          )}

          {variant !== 'portrait' && (
            <g
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                transform: `rotate(${wheelAngle}deg)`,
                transition: isDragging
                  ? 'none'
                  : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform',
              }}
            >
              {sectorGeometry.map(
                ({
                  opt,
                  dialPath,
                  dialActivePath,
                  dialHaloPath,
                  dialLabelPos,
                  dialActiveLabelPos,
                  dialCodePos,
                }) => {
                  const isSelected = opt.id === activeOptionId;
                  const isCrimson = opt.accent === 'crimson';
                  const labelPos = isSelected ? dialActiveLabelPos : dialLabelPos;
                  const counterTextRot = -wheelAngle;

                  return (
                    <g
                      key={opt.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dragState.current.moved) return;
                        hudSound.playChime();
                        // Direct click on any wedge in rotary-hub or half-dial opens/activates immediately
                        onSelectOption(opt.id, true);
                      }}
                    >
                      <path
                        d={isSelected ? dialActivePath : dialPath}
                        fill={
                          isSelected
                            ? isCrimson
                              ? 'rgba(255, 42, 75, 0.24)'
                              : 'rgba(0, 240, 255, 0.22)'
                            : 'rgba(6, 12, 20, 0.84)'
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
                      />

                      {isSelected && (
                        <path
                          d={dialHaloPath}
                          fill="none"
                          stroke={isCrimson ? '#FF2A4B' : '#00F0FF'}
                          strokeWidth="1.2"
                          strokeDasharray="6 3"
                        />
                      )}

                      <text
                        x={dialCodePos.x}
                        y={dialCodePos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isSelected ? '#FF2A4B' : 'rgba(230,248,255,0.48)'}
                        fontSize="6.5"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="700"
                        transform={`rotate(${counterTextRot}, ${dialCodePos.x}, ${dialCodePos.y})`}
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
                }
              )}
            </g>
          )}

          {variant !== 'portrait' && (
            <g
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                transform: `rotate(${targetSlotDeg}deg)`,
              }}
              className="pointer-events-none"
            >
              <polygon points={`${CX},15 ${CX - 5},6 ${CX + 5},6`} fill="#FF2A4B" />
              <line x1={CX} y1={17} x2={CX} y2={26} stroke="#E6F8FF" strokeWidth="1.5" />
            </g>
          )}

          <ReactorInnerRings showCenterDot={!centerHint} />
        </svg>

        {/* Dedicated Real Clickable Center Core Button */}
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
          className="absolute z-30 rounded-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#00F0FF]/15 active:scale-95 transition-transform"
          style={{
            width: size * 0.22,
            height: size * 0.22,
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
  }
);
ArcReactorCore.displayName = 'ArcReactorCore';
