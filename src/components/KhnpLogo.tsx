import React from "react";

interface KhnpLogoProps {
  className?: string;
  size?: number;
}

export const KhnpLogo: React.FC<KhnpLogoProps> = ({ className = "", size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      id="khnp-official-kepco-logo"
    >
      <defs>
        {/* Clip Paths */}
        <clipPath id="left-circle-clip">
          <circle cx="38" cy="50" r="34" />
        </clipPath>
        <clipPath id="right-circle-clip">
          <circle cx="62" cy="50" r="34" />
        </clipPath>

        {/* Left Crescent Mask: Left circle minus Right circle */}
        <mask id="left-crescent-mask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <circle cx="62" cy="50" r="34" fill="black" />
        </mask>

        {/* Right Crescent Mask: Right circle minus Left circle */}
        <mask id="right-crescent-mask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <circle cx="38" cy="50" r="34" fill="black" />
        </mask>

        {/* Overlap Stripes Mask: Left circle containing rotated white bars */}
        <mask id="overlap-stripes-mask">
          <rect x="0" y="0" width="100" height="100" fill="black" />
          <g clipPath="url(#left-circle-clip)">
            {/* 7 White slanted bars representing the positive stripes */}
            <g transform="rotate(-30, 50, 50)">
              <rect x="-10" y="19" width="120" height="4.5" fill="white" />
              <rect x="-10" y="28.5" width="120" height="4.5" fill="white" />
              <rect x="-10" y="38" width="120" height="4.5" fill="white" />
              <rect x="-10" y="47.5" width="120" height="4.5" fill="white" />
              <rect x="-10" y="57" width="120" height="4.5" fill="white" />
              <rect x="-10" y="66.5" width="120" height="4.5" fill="white" />
              <rect x="-10" y="76" width="120" height="4.5" fill="white" />
            </g>
          </g>
        </mask>
      </defs>

      {/* 1. Left Crescent (Solid KEPCO Blue, restricted by mask) */}
      <circle cx="38" cy="50" r="34" fill="#0054A6" mask="url(#left-crescent-mask)" />

      {/* 2. Right Crescent (Solid KEPCO Green, restricted by mask) */}
      <circle cx="62" cy="50" r="34" fill="#00B050" mask="url(#right-crescent-mask)" />

      {/* 3. Overlap Stripes (Clipped to Right circle, masked to Left circle with slanted white bars, split diagonally) */}
      <g clipPath="url(#right-circle-clip)" mask="url(#overlap-stripes-mask)">
        {/* Green background for the stripes (KEPCO Green) */}
        <rect x="0" y="0" width="100" height="100" fill="#00B050" />
        {/* Blue overlay polygon for the left/top half of stripes (KEPCO Blue) */}
        <polygon points="0,0 75,0 25,100 0,100" fill="#0054A6" />
      </g>
    </svg>
  );
};
