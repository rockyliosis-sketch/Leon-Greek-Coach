import React, { useId } from 'react';

interface GeminiStarIconProps {
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Official-style Google Gemini 4-pointed curved star SVG with blue -> purple -> coral gradient.
 */
export const GeminiStarIcon: React.FC<GeminiStarIconProps> = ({ size = 16, style }) => {
  const gradId = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <defs>
        <linearGradient id={`gemini_grad_${gradId}`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="52%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5C12.35 6.95 17.05 11.65 22.5 12C17.05 12.35 12.35 17.05 12 22.5C11.65 17.05 6.95 12.35 1.5 12C6.95 11.65 11.65 6.95 12 1.5Z"
        fill={`url(#gemini_grad_${gradId})`}
      />
    </svg>
  );
};

interface GeminiBadgeProps {
  variant?: 'light' | 'onDark' | 'outline';
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * Compact pill badge identifying features powered by Google Gemini.
 */
export const GeminiBadge: React.FC<GeminiBadgeProps> = ({
  variant = 'light',
  label = 'Gemini',
  size = 'sm',
}) => {
  const isSm = size === 'sm';
  const bg =
    variant === 'onDark'
      ? 'rgba(255, 255, 255, 0.94)'
      : variant === 'outline'
        ? '#ffffff'
        : 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 55%, #fdf2f8 100%)';
  const border =
    variant === 'onDark'
      ? '1px solid rgba(255, 255, 255, 0.6)'
      : '1px solid #d8b4fe';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? 4 : 5,
        padding: isSm ? '2px 7px' : '3px 9px',
        borderRadius: 999,
        background: bg,
        border,
        fontSize: isSm ? 11 : 12,
        fontWeight: 900,
        letterSpacing: '0.01em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(99, 102, 241, 0.12)',
      }}
    >
      <GeminiStarIcon size={isSm ? 12 : 14} />
      <span
        style={{
          background: 'linear-gradient(90deg, #1d4ed8 0%, #7e22ce 55%, #be185d 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: '#6d28d9',
        }}
      >
        {label}
      </span>
    </span>
  );
};
