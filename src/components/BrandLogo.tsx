import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  theme?: 'dark' | 'light';
}

export const BrandLogoSvg: React.FC<{ sizeClass?: string; className?: string }> = ({
  sizeClass = 'w-9 h-9',
  className = '',
}) => {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 p-0.5 shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/35 transition-all duration-300 ${sizeClass} ${className}`}
    >
      {/* Inner background with fine bevel */}
      <div className="w-full h-full rounded-[14px] bg-[#071318]/90 dark:bg-[#061014] flex items-center justify-center p-1.5 overflow-hidden relative">
        {/* Subtle background ambient radial gradient */}
        <div className="absolute inset-0 bg-radial from-emerald-500/25 via-transparent to-transparent pointer-events-none" />

        {/* SVG Icon: Geometric Eco Leaf + Dual Commute Vector */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]"
        >
          <defs>
            <linearGradient id="gp_emerald_grad" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="gp_glow_line" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.4" />
            </linearGradient>
            <filter id="gp_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Stylized Botanical Leaf Base Silhouette */}
          <path
            d="M 10 38 C 10 24, 22 10, 40 8 C 40 26, 26 40, 10 38 Z"
            fill="url(#gp_emerald_grad)"
            fillOpacity="0.22"
            stroke="url(#gp_emerald_grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Aerodynamic Clean-Air Route Arc */}
          <path
            d="M 12 36 C 20 30, 26 24, 38 10"
            stroke="url(#gp_glow_line)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Secondary Eco Buffer Wave Line */}
          <path
            d="M 17 38 C 22 34, 28 29, 36 21"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1 2.5"
          />

          {/* Pulsing GPS Origin / Destination Nodes */}
          <circle cx="12" cy="36" r="3.2" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="38" cy="10" r="3.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />

          {/* Energy spark at leaf tip */}
          <circle cx="38" cy="10" r="1.2" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  theme = 'dark',
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', title: 'text-sm', sub: 'text-[8.5px]', badge: 'text-[9px]' },
    md: { icon: 'w-8.5 h-8.5 sm:w-9 sm:h-9', title: 'text-sm sm:text-base', sub: 'text-[9px] sm:text-[9.5px]', badge: 'text-[9.5px]' },
    lg: { icon: 'w-11 h-11 sm:w-12 sm:h-12', title: 'text-lg sm:text-xl', sub: 'text-[10px] sm:text-xs', badge: 'text-[10px]' },
    xl: { icon: 'w-14 h-14 sm:w-16 sm:h-16', title: 'text-2xl sm:text-3xl', sub: 'text-xs sm:text-sm', badge: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  if (variant === 'icon') {
    return <BrandLogoSvg sizeClass={currentSize.icon} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <BrandLogoSvg sizeClass={currentSize.icon} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-semibold tracking-tight leading-tight ${currentSize.title} ${
              theme === 'dark' ? 'text-zinc-100' : 'text-slate-900'
            }`}
            style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" }}
          >
            GreenPath
          </span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-[9px] tracking-wider uppercase">
            AI
          </span>
        </div>
        {variant === 'full' && (
          <span className={`font-medium tracking-[0.16em] uppercase text-emerald-600 dark:text-emerald-400 ${currentSize.sub}`}>
            Clean-Air Commute
          </span>
        )}
      </div>
    </div>
  );
};
