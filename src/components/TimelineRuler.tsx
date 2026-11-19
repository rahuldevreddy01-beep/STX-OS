import React from 'react';

interface TimelineRulerProps {
  now: Date;
  compact?: boolean;
}

const HOURS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22', '24'];

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ now, compact = false }) => {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const progressPct = Math.min(99, Math.max(1, (totalMinutes / 1440) * 100));

  return (
    <div className={`relative w-full select-none ${compact ? 'px-4 pt-1 pb-1' : 'px-6 pt-1.5 pb-1'}`}>
      <div className="relative flex items-end justify-between border-b border-[#00F0FF]/20 pb-1">
        {HOURS.map((hr, idx) => (
          <div key={hr} className="flex flex-col items-center gap-0.5">
            <span className="font-mono-hud text-[9px] tracking-[0.14em] text-[#E6F8FF]/65">
              {hr}
            </span>
            <div className="flex items-end gap-1.5">
              <span className="h-2 w-[1px] bg-[#00F0FF]/55" />
              {idx < HOURS.length - 1 && (
                <>
                  <span className="h-1 w-[1px] bg-[#00F0FF]/20 hidden sm:inline-block" />
                  <span className="h-1 w-[1px] bg-[#00F0FF]/20 hidden md:inline-block" />
                </>
              )}
            </div>
          </div>
        ))}

        {/* Active time marker needle */}
        <div
          className="absolute -bottom-[2px] flex flex-col items-center pointer-events-none transition-all duration-700"
          style={{ left: `${progressPct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-1.5 h-3.5 bg-[#E6F8FF] shadow-[0_0_8px_#00F0FF] rounded-[1px]" />
          <div className="w-3 h-[2px] bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
        </div>
      </div>
    </div>
  );
};
