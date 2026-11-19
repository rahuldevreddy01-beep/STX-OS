import React from 'react';

interface HingeTransitionOverlayProps {
  active: boolean;
  direction: 'horizontal' | 'vertical';
}

export const HingeTransitionOverlay: React.FC<HingeTransitionOverlayProps> = ({
  active,
  direction,
}) => {
  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {/* Chromatic aberration cyan + crimson split edge */}
      <div
        className={`absolute inset-0 ${
          direction === 'horizontal' ? 'animate-hinge-h' : 'animate-hinge-v'
        }`}
        style={{
          background:
            direction === 'horizontal'
              ? 'linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.22) 38%, rgba(230,248,255,0.25) 50%, rgba(255,42,75,0.22) 62%, transparent 100%)'
              : 'linear-gradient(180deg, transparent 0%, rgba(0,240,255,0.22) 38%, rgba(230,248,255,0.25) 50%, rgba(255,42,75,0.22) 62%, transparent 100%)',
        }}
      />
      {/* Hinge fold bright scanline bar */}
      <div
        className={`absolute ${
          direction === 'horizontal'
            ? 'inset-y-0 left-1/2 w-[2px] -translate-x-1/2'
            : 'inset-x-0 top-1/2 h-[2px] -translate-y-1/2'
        } bg-[#00F0FF]/80 shadow-[0_0_18px_#00F0FF] animate-pulse`}
      />
    </div>
  );
};
