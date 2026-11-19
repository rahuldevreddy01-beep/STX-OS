import React from 'react';

interface CircularMicroGaugeProps {
  value: number;
  label: string;
  subLabel?: string;
  accent?: 'cyan' | 'crimson';
  size?: number;
}

export const CircularMicroGauge: React.FC<CircularMicroGaugeProps> = ({
  value,
  label,
  subLabel,
  accent = 'cyan',
  size = 58,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const strokeWidth = 2.75;
  const radius = (size - strokeWidth * 2 - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor = accent === 'crimson' ? '#FF2A4B' : '#00F0FF';
  const glowFilter =
    accent === 'crimson'
      ? 'drop-shadow(0 0 5px rgba(255,42,75,0.65))'
      : 'drop-shadow(0 0 5px rgba(0,240,255,0.6))';

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        {/* Outer tick ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 3.5}
          fill="none"
          stroke="rgba(230,248,255,0.14)"
          strokeWidth="1"
          strokeDasharray="1.5 3.5"
        />
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="rgba(5,8,13,0.6)"
          stroke="rgba(0,240,255,0.14)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: glowFilter,
            transition: 'stroke-dashoffset 450ms cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono-hud text-[11px] font-bold tracking-tight text-[#E6F8FF]">
          {label}
        </span>
        {subLabel && (
          <span className="font-mono-hud text-[7px] tracking-widest text-[#00F0FF]/80 mt-0.5 uppercase">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};

interface CompassRadarDialProps {
  headingDeg?: number;
  size?: number;
}

export const CompassRadarDial: React.FC<CompassRadarDialProps> = ({
  headingDeg = 225,
  size = 54,
}) => {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 60 60" className="overflow-visible">
          <circle
            cx="30"
            cy="30"
            r="26"
            fill="rgba(5,8,13,0.65)"
            stroke="rgba(0,240,255,0.32)"
            strokeWidth="1"
          />
          <circle
            cx="30"
            cy="30"
            r="20"
            fill="none"
            stroke="rgba(0,240,255,0.18)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <circle
            cx="30"
            cy="30"
            r="10"
            fill="none"
            stroke="rgba(255,42,75,0.28)"
            strokeWidth="0.75"
          />
          {/* Crosshairs */}
          <line x1="30" y1="4" x2="30" y2="56" stroke="rgba(0,240,255,0.16)" strokeWidth="0.75" />
          <line x1="4" y1="30" x2="56" y2="30" stroke="rgba(0,240,255,0.16)" strokeWidth="0.75" />
          {/* Sweep needle */}
          <g
            style={{
              transformOrigin: '30px 30px',
              transform: `rotate(${headingDeg}deg)`,
              transition: 'transform 600ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <line
              x1="30"
              y1="30"
              x2="30"
              y2="7"
              stroke="#00F0FF"
              strokeWidth="1.6"
              style={{ filter: 'drop-shadow(0 0 4px #00F0FF)' }}
            />
            <polygon points="30,5 27.5,11 32.5,11" fill="#00F0FF" />
            <circle cx="30" cy="30" r="2.5" fill="#FF2A4B" />
          </g>
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-mono-hud text-[9px] tracking-[0.18em] text-[#00F0FF]/70">
          HEADING
        </span>
        <span className="font-mono-hud text-[11px] font-semibold text-[#E6F8FF] tabular-nums">
          {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((headingDeg % 360) + 360) % 360) / 45) % 8]}{' '}
          {Math.round(((headingDeg % 360) + 360) % 360)}°
        </span>
      </div>
    </div>
  );
};
