// CineGrid Pro — Group Selfie Framing Guide Overlay
// Visual alignment boxes for 3 to 5 subjects with edge distortion safe zones.

import React from 'react';

interface GroupSelfieGuideOverlayProps {
  isVisible: boolean;
}

export const GroupSelfieGuideOverlay: React.FC<GroupSelfieGuideOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-between p-4">
      {/* Top Banner */}
      <div className="px-3 py-1 rounded-full bg-black/60 border border-sky-400/40 text-sky-300 font-mono text-[10px] backdrop-blur-md">
        GROUP SELFIE SAFE ZONE (AVOID EDGE DISTORTION)
      </div>

      {/* SVG Alignment Markers */}
      <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Left & Right 12% Distortion Danger Zone Lines */}
        <line x1="12" y1="0" x2="12" y2="100" stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.6" />
        <line x1="88" y1="0" x2="88" y2="100" stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.6" />

        {/* 3 Face Alignment Bounding Rectangles across upper third (y: 20 to 50) */}
        {/* Left Face Box */}
        <rect
          x="16"
          y="25"
          width="18"
          height="28"
          rx="5"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="0.4"
          strokeDasharray="2,1"
          opacity="0.8"
        />
        {/* Center Face Box */}
        <rect
          x="41"
          y="22"
          width="18"
          height="32"
          rx="5"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="0.6"
          opacity="0.9"
        />
        {/* Right Face Box */}
        <rect
          x="66"
          y="25"
          width="18"
          height="28"
          rx="5"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="0.4"
          strokeDasharray="2,1"
          opacity="0.8"
        />

        {/* Eyeline guide */}
        <line x1="15" y1="36" x2="85" y2="36" stroke="#ffffff" strokeWidth="0.2" opacity="0.4" />
      </svg>
    </div>
  );
};
