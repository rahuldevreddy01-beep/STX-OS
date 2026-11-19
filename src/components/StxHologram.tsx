import React, { useState } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { hudSound } from '../utils/soundFx';

interface StxHologramProps {
  listening: boolean;
  onToggleListening: () => void;
  lastResponse: string;
  onSendCommand: (cmd: string) => void;
  compact?: boolean;
}

const AVATAR_SRC = '/src/assets/images/stx_hologram_avatar_1795071924325.jpg';

export const StxHologram: React.FC<StxHologramProps> = ({
  listening,
  onToggleListening,
  lastResponse,
  onSendCommand,
  compact = false,
}) => {
  const [input, setInput] = useState('');
  const [imgError, setImgError] = useState(false);
  const [speechSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );

  const handleMicTrigger = () => {
    hudSound.playChime();
    if (!listening && speechSupported) {
      try {
        const SR =
          (
            window as unknown as {
              SpeechRecognition?: new () => unknown;
              webkitSpeechRecognition?: new () => unknown;
            }
          ).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => unknown })
            .webkitSpeechRecognition;
        if (SR) {
          const recognition = new SR() as {
            lang: string;
            interimResults: boolean;
            onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
            onerror: () => void;
            onend: () => void;
            start: () => void;
          };
          recognition.lang = 'en-US';
          recognition.interimResults = false;
          recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript;
            if (transcript) {
              onSendCommand(transcript);
            }
          };
          recognition.onerror = () => {};
          recognition.onend = () => {
            if (listening) onToggleListening();
          };
          recognition.start();
        }
      } catch {
        // Fallback to listening state toggle
      }
    }
    onToggleListening();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendCommand(input.trim());
    setInput('');
  };

  return (
    <div className="relative flex flex-col justify-between h-full w-full overflow-hidden">
      {/* Realistic Humanoid Cyan Hologram Projection */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {/* Soft emitter glow behind avatar */}
        <div
          className={`pointer-events-none absolute w-44 h-44 rounded-full transition-all duration-500 ${
            listening ? 'scale-110 opacity-90' : 'scale-100 opacity-65'
          }`}
          style={{
            background: listening
              ? 'radial-gradient(circle, rgba(0,240,255,0.28) 0%, rgba(255,42,75,0.08) 52%, transparent 72%)'
              : 'radial-gradient(circle, rgba(0,240,255,0.22) 0%, transparent 70%)',
          }}
        />

        {!imgError ? (
          <img
            src={AVATAR_SRC}
            alt="STX AI Holographic Assistant"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`relative z-10 h-full max-h-[250px] w-auto object-contain mix-blend-screen select-none pointer-events-none transition-transform duration-500 ${
              listening ? 'scale-[1.03]' : 'scale-100'
            }`}
            style={{
              filter: listening
                ? 'drop-shadow(0 0 18px rgba(0,240,255,0.65)) brightness(1.08)'
                : 'drop-shadow(0 0 12px rgba(0,240,255,0.45))',
              maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            }}
          />
        ) : (
          <div className="relative z-10 w-32 h-32 rounded-full border border-[#00F0FF]/50 flex items-center justify-center font-display text-sm tracking-widest text-[#00F0FF]">
            STX AI
          </div>
        )}

        {/* Hologram status label */}
        <div className="absolute top-1 left-2 z-20 flex items-center gap-1.5 font-mono-hud text-[9px] tracking-[0.2em]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              listening
                ? 'bg-[#FF2A4B] shadow-[0_0_8px_#FF2A4B]'
                : 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]'
            }`}
          />
          <span className="text-[#E6F8FF]/85">
            {listening ? 'LISTENING...' : 'STX AI READY'}
          </span>
        </div>
      </div>

      {/* Live Response & Direct Command Input */}
      <div className={`shrink-0 space-y-2 ${compact ? 'px-2 pb-1' : 'px-3 pb-2'}`}>
        <div className="border-t border-[#00F0FF]/20 pt-1.5">
          <p className="font-tactical text-xs sm:text-sm text-[#9FEFFF] leading-snug line-clamp-2">
            {lastResponse}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleMicTrigger}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
              listening
                ? 'border-white bg-[#FF2A4B] text-white shadow-[0_0_14px_#FF2A4B]'
                : 'border-[#FF2A4B]/70 bg-[#FF2A4B]/15 text-[#FF2A4B] hover:bg-[#FF2A4B]/30'
            }`}
          >
            {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="COMMAND STX AI..."
            className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#03060B]/90 border border-[#00F0FF]/35 focus:border-[#00F0FF] outline-none font-mono-hud text-[11px] text-[#E6F8FF] placeholder:text-[#00F0FF]/45"
          />

          <button
            type="submit"
            aria-label="Send command to STX AI"
            className="p-1.5 border border-[#00F0FF]/60 bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 text-[#00F0FF] cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto hud-scroll pb-0.5">
          {['SYSTEM DIAG', 'TOGGLE WIFI', 'OPEN APPS', 'OPEN HEALTH'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onSendCommand(preset)}
              className="px-2 py-0.5 border border-[#00F0FF]/25 bg-[#060E16]/80 hover:border-[#00F0FF] font-mono-hud text-[8.5px] tracking-wider text-[#9FEFFF] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
