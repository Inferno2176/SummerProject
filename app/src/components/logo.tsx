import React from 'react';

type LogoProps = {
  size?: number;
  className?: string;
};

export default function HyrdLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-500/20 text-white shrink-0 ${className}`}
    >
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Modern Briefcase + Ascent Arrow Emblem */}
        <rect x="3" y="7" width="18" height="13" rx="2" ry="2" />
        <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
        <path d="M12 11v6" />
        <path d="m9 14 3-3 3 3" />
      </svg>
    </div>
  );
}
