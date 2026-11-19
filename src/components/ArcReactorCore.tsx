import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { AppItem, DialOption } from '../types/hud';
import { hudSound } from '../utils/soundFx';
import { HologramOrb3D } from './HologramOrb3D';

interface ArcReactorCoreProps {
  variant: 'portrait' | 'rotary-hub' | 'half-dial';
  options: DialOption[];
  activeOptionId: string;
  onSelectOption: (id: string, activate?: boolean) => void;
  onCenterBack?: () => void;
  centerHint?: string;
  size?: number;
  pulseTrigger?: number;
  apps?: AppItem[];
  onLaunchApp?: (app: AppItem) => void;
  pitchDeg?: number;
  rollDeg?: number;
  orbAccent?: 'cyan' | 'crimson' | 'amber';
  voiceActive?: boolean;
  notifCount?: number;
}

const CX = 180;
const CY = 180;

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

// 90 radiating perimeter tick needles (clean precision caliper bezel)
const PERIMETER_TICKS = Array.from({ length: 90 }, (_, i) => {
  const deg = i * 4;
  const isMajor = deg % 20 === 0;
  const isCardinal = deg % 90 === 0;
  const p1 = polarToCartesian(CX, CY, isCardinal ? 156 : isMajor ? 160 : 163, deg);
  const p2 = polarToCartesian(CX, CY, isMajor ? 170 : 168, deg);
  return {
    deg,
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    stroke: isCardinal
      ? '#FF2A4B'
      : isMajor
        ? 'rgba(0,240,255,0.62)'
        : 'rgba(0,240,255,0.18)',
    strokeWidth: isCardinal ? 1.6 : isMajor ? 1.1 : 0.75,
  };
});

const StaticPerimeterHalo = memo(() => (
  <g className="pointer-events-none">
    <circle
      cx={CX}
      cy={CY}
      r={157}
      fill="none"
      stroke="rgba(0,240,255,0.22)"
      strokeWidth="0.9"
      strokeDasharray="3 6"
    />
    {PERIMETER_TICKS.map((t) => (
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
StaticPerimeterHalo.displayName = 'StaticPerimeterHalo';

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
    apps,
    onLaunchApp,
    pitchDeg = 0,
    rollDeg = 0,
    orbAccent,
    voiceActive = false,
    notifCount = 0,
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

    const hasInnerAppOrbit =
      variant === 'rotary-hub' && Boolean(apps && apps.length > 0 && onLaunchApp);

    const mainInnerR = hasInnerAppOrbit ? 97 : 90;
    const mainOuterR = 146;
    const mainActiveOuterR = 152;
    const gapAngle = count <= 4 ? 5 : count <= 6 ? 3.5 : 2.3;

    const sectorGeometry = useMemo(() => {
      return options.map((opt, idx) => {
        const centerAngle = idx * stepDeg;
        const start = centerAngle - stepDeg / 2 + gapAngle;
        const end = centerAngle + stepDeg / 2 - gapAngle;
        const midR = (mainInnerR + mainOuterR) / 2;
        return {
          opt,
          centerAngle,
          start,
          end,
          portraitPath: describeAnnularSector(CX, CY, 94, 146, start, end),
          portraitActivePath: describeAnnularSector(CX, CY, 94, 152, start, end),
          portraitLabelPos: polarToCartesian(CX, CY, 121, centerAngle),
          portraitBadgePos: polarToCartesian(CX, CY, 142, centerAngle + stepDeg * 0.22),
          dialPath: describeAnnularSector(CX, CY, mainInnerR, mainOuterR, start, end),
          dialActivePath: describeAnnularSector(CX, CY, mainInnerR, mainActiveOuterR, start, end),
          dialHaloPath: describeAnnularSector(
            CX,
            CY,
            mainInnerR - 2.5,
            mainActiveOuterR + 2.5,
            start - 1,
            end + 1
          ),
          dialLabelPos: polarToCartesian(CX, CY, midR + 3, centerAngle),
          dialActiveLabelPos: polarToCartesian(CX, CY, midR + 6, centerAngle),
          dialCodePos: polarToCartesian(CX, CY, mainInnerR + 9, centerAngle),
          dialBadgePos: polarToCartesian(CX, CY, mainOuterR - 5, centerAngle + stepDeg * 0.24),
        };
      });
    }, [options, stepDeg, gapAngle, mainInnerR, mainOuterR, mainActiveOuterR]);

    const pinnedApps = useMemo(() => {
      if (!apps) return [];
      const pinned = apps.filter((a) => a.pinnedToDock);
      const source = pinned.length >= 4 ? pinned : apps;
      return source.slice(0, 6);
    }, [apps]);

    const innerAppSectors = useMemo(() => {
      if (!hasInnerAppOrbit || pinnedApps.length === 0) return [];
      const step = 360 / pinnedApps.length;
      return pinnedApps.map((app, i) => {
        const center = i * step;
        const s = center - step / 2 + 4;
        const e = center + step / 2 - 4;
        return {
          app,
          path: describeAnnularSector(CX, CY, 68, 93, s, e),
          labelPos: polarToCartesian(CX, CY, 80.5, center),
          badgePos: polarToCartesian(CX, CY, 90, center + step * 0.23),
        };
      });
    }, [hasInnerAppOrbit, pinnedApps]);

    const activeOpt = options[activeIndex];
    const resolvedOrbAccent: 'cyan' | 'crimson' | 'amber' =
      orbAccent ??
      (voiceActive || activeOpt?.accent === 'crimson' || activeOptionId === 'STX'
        ? 'crimson'
        : activeOptionId === 'HEALTH'
          ? 'amber'
          : 'cyan');

    const orbSize = Math.round(size * (hasInnerAppOrbit ? 0.39 : 0.48));

    const badgeForWedge = (id: string): number | undefined => {
      if (id === 'APPS' && apps) return apps.length;
      if (id === 'BRIEF' && notifCount > 0) return notifCount;
      const foundApp = apps?.find((a) => a.id === id);
      return foundApp?.badgeCount;
    };

    return (
      <div
        className="relative flex items-center justify-center select-none touch-none"
        style={{ width: size, height: size }}
      >
        {/* CENTER 3D VOLUMETRIC PLASMA ORB */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
          aria-hidden="true"
        >
          <HologramOrb3D
            size={orbSize}
            accent={resolvedOrbAccent}
            active={voiceActive || variant === 'half-dial'}
            pulseTrigger={pulseTrigger}
            pitchDeg={pitchDeg}
            rollDeg={rollDeg}
          />
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 360 360"
          width={size}
          height={size}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className={`relative z-20 overflow-visible ${
            variant !== 'portrait' ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <StaticPerimeterHalo />

          {variant === 'half-dial' && (
            <g className="pointer-events-none">
              <path
                d={describeArc(CX, CY, 158, 195, 255)}
                fill="none"
                stroke="#FF2A4B"
                strokeWidth="2.4"
              />
              <path
                d={describeArc(CX, CY, 158, 285, 345)}
                fill="none"
                stroke="#00F0FF"
                strokeWidth="1.9"
              />
            </g>
          )}

          {variant === 'portrait' && (
            <g>
              {sectorGeometry.map(({ opt, portraitPath, portraitActivePath, portraitLabelPos, portraitBadgePos }) => {
                const isActive = opt.id === activeOptionId;
                const badge = badgeForWedge(opt.id);
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
                      fill={isActive ? '#FFFFFF' : 'rgba(159,239,255,0.92)'}
                      fontSize="8.2"
                      fontWeight="700"
                      fontFamily="Orbitron, sans-serif"
                      letterSpacing="0.06em"
                    >
                      {opt.label}
                    </text>
                    {badge !== undefined && badge > 0 && (
                      <g className="pointer-events-none">
                        <circle
                          cx={portraitBadgePos.x}
                          cy={portraitBadgePos.y}
                          r={6.8}
                          fill="#FF2A4B"
                          stroke="#020306"
                          strokeWidth="1"
                        />
                        <text
                          x={portraitBadgePos.x}
                          y={portraitBadgePos.y + 0.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#FFFFFF"
                          fontSize="6"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="700"
                        >
                          {badge}
                        </text>
                      </g>
                    )}
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
                  dialBadgePos,
                }) => {
                  const isSelected = opt.id === activeOptionId;
                  const isCrimson = opt.accent === 'crimson';
                  const labelPos = isSelected ? dialActiveLabelPos : dialLabelPos;
                  const counterTextRot = -wheelAngle;
                  const badge = badgeForWedge(opt.id);

                  return (
                    <g
                      key={opt.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dragState.current.moved) return;
                        hudSound.playChime();
                        onSelectOption(opt.id, true);
                      }}
                    >
                      <path
                        d={isSelected ? dialActivePath : dialPath}
                        fill={
                          isSelected
                            ? isCrimson
                              ? 'rgba(255, 42, 75, 0.25)'
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
                              : 'rgba(0, 240, 255, 0.36)'
                        }
                        strokeWidth={isSelected ? 1.85 : 0.9}
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
                        fontSize="6.4"
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
                        fontSize={isSelected ? '8.8' : '7.4'}
                        fontWeight="700"
                        fontFamily="Orbitron, sans-serif"
                        letterSpacing="0.05em"
                        transform={`rotate(${counterTextRot}, ${labelPos.x}, ${labelPos.y})`}
                      >
                        {opt.label}
                      </text>

                      {badge !== undefined && badge > 0 && (
                        <g
                          className="pointer-events-none"
                          transform={`rotate(${counterTextRot}, ${dialBadgePos.x}, ${dialBadgePos.y})`}
                        >
                          <circle
                            cx={dialBadgePos.x}
                            cy={dialBadgePos.y}
                            r={6.4}
                            fill="#FF2A4B"
                            stroke="#020306"
                            strokeWidth="1"
                          />
                          <text
                            x={dialBadgePos.x}
                            y={dialBadgePos.y + 0.5}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#FFFFFF"
                            fontSize="5.8"
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="700"
                          >
                            {badge}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }
              )}
            </g>
          )}

          {/* INNER PINNED ANDROID APPS ORBIT RING */}
          {hasInnerAppOrbit && (
            <g>
              {innerAppSectors.map(({ app, path, labelPos, badgePos }) => (
                <g
                  key={app.id}
                  className="cursor-pointer group"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    hudSound.playChime();
                    onLaunchApp?.(app);
                  }}
                >
                  <path
                    d={path}
                    fill="rgba(4, 12, 20, 0.88)"
                    stroke="rgba(0, 240, 255, 0.45)"
                    strokeWidth="0.95"
                    className="group-hover:fill-[rgba(0,240,255,0.22)] group-hover:stroke-[#E6F8FF] transition-colors"
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#E6F8FF"
                    fontSize="6.1"
                    fontFamily="Orbitron, sans-serif"
                    fontWeight="700"
                    letterSpacing="0.04em"
                  >
                    {app.name.slice(0, 6)}
                  </text>
                  {app.badgeCount && app.badgeCount > 0 && (
                    <g className="pointer-events-none">
                      <circle cx={badgePos.x} cy={badgePos.y} r={4.5} fill="#FF2A4B" />
                      <text
                        x={badgePos.x}
                        y={badgePos.y + 0.4}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#FFFFFF"
                        fontSize="4.8"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="700"
                      >
                        {app.badgeCount}
                      </text>
                    </g>
                  )}
                </g>
              ))}
            </g>
          )}

          {/* ROTATING PRECISION BEZEL FRAMING THE 3D PLASMA ORB */}
          <g className="pointer-events-none">
            <g style={{ transformOrigin: `${CX}px ${CY}px` }} className="reactor-ring-r1">
              <circle
                cx={CX}
                cy={CY}
                r={hasInnerAppOrbit ? 64 : 78}
                fill="none"
                stroke="rgba(0,240,255,0.52)"
                strokeWidth="1.2"
                strokeDasharray="16 8 4 8"
              />
            </g>
            <g style={{ transformOrigin: `${CX}px ${CY}px` }} className="reactor-ring-r3">
              <circle
                cx={CX}
                cy={CY}
                r={hasInnerAppOrbit ? 57 : 68}
                fill="none"
                stroke="rgba(255,42,75,0.45)"
                strokeWidth="1.15"
                strokeDasharray="12 18"
              />
            </g>
          </g>

          {variant !== 'portrait' && (
            <g
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                transform: `rotate(${targetSlotDeg}deg)`,
              }}
              className="pointer-events-none"
            >
              <polygon points={`${CX},18 ${CX - 5},8 ${CX + 5},8`} fill="#FF2A4B" />
              <line x1={CX} y1={20} x2={CX} y2={28} stroke="#E6F8FF" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {/* CLICKABLE CENTER 3D ORB CORE BUTTON */}
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
          aria-label={centerHint ? `Center ${centerHint}` : `Open ${activeOpt?.label ?? 'module'}`}
          title={centerHint ? centerHint : `Open ${activeOpt?.label ?? 'module'}`}
          className="group absolute z-30 rounded-full flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
          style={{
            width: orbSize * 0.88,
            height: orbSize * 0.88,
          }}
        >
          {centerHint ? (
            <span className="flex items-center gap-0.5 px-2 py-0.5 bg-[#020306]/75 border border-[#00F0FF]/45 font-mono-hud text-[8.5px] font-bold tracking-wider text-[#E6F8FF] text-glow-cyan">
              <ChevronLeft className="w-3 h-3 text-[#00F0FF]" />
              <span>{centerHint}</span>
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 bg-[#020306]/80 border border-[#00F0FF]/50 font-mono-hud text-[8px] tracking-widest text-[#E6F8FF]">
              OPEN
            </span>
          )}
        </button>
      </div>
    );
  }
);
ArcReactorCore.displayName = 'ArcReactorCore';
