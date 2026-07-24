import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  style?: CSSProperties;
}

export function YouTubeIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8Z"
        fill="#FF0000"
      />
      <path d="m9.6 15.6 6.3-3.6-6.3-3.6v7.2Z" fill="#fff" />
    </svg>
  );
}

export function TikTokIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M19.3 6.4a4.7 4.7 0 0 1-2.8-2.1A4.7 4.7 0 0 1 16 2h-3.6v13.5a2.8 2.8 0 0 1-2.8 2.7 2.8 2.8 0 0 1-2.8-2.7 2.8 2.8 0 0 1 2.8-2.8c.3 0 .6 0 .9.1V9.1a6.4 6.4 0 0 0-.9-.1A6.4 6.4 0 0 0 3.2 15.5 6.4 6.4 0 0 0 9.6 22a6.4 6.4 0 0 0 6.4-6.5V8.8A8.3 8.3 0 0 0 21 10.4V6.8a4.8 4.8 0 0 1-1.7-.4Z"
        fill="#00F2EA"
      />
      <path
        d="M19.3 6.4a4.7 4.7 0 0 1-2.8-2.1A4.7 4.7 0 0 1 16 2h-3.6v13.5a2.8 2.8 0 0 1-2.8 2.7 2.8 2.8 0 0 1-2.1-.9 2.8 2.8 0 0 1 1.2-4.5V9.1a6.4 6.4 0 0 0-5.5 6.4A6.4 6.4 0 0 0 9.6 22a6.4 6.4 0 0 0 6.4-6.5V8.8A8.3 8.3 0 0 0 21 10.4V6.8a4.8 4.8 0 0 1-1.7-.4Z"
        fill="#FF004F"
        opacity="0.5"
      />
    </svg>
  );
}

export function InstagramIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad)" />
    </svg>
  );
}

export function FacebookIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12Z"
        fill="#1877F2"
      />
      <path
        d="m16.671 15.47.532-3.47h-3.328V9.75c0-.95.465-1.875 1.956-1.875h1.514V4.922s-1.374-.234-2.686-.234c-2.741 0-4.533 1.66-4.533 4.668V12H7.078v3.47h3.047v8.385a12.1 12.1 0 0 0 3.75 0V15.47h2.796Z"
        fill="#fff"
      />
    </svg>
  );
}

export function ThreadsIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M16.556 11.378c-.097-.047-.196-.092-.297-.135-.17-2.594-1.546-4.08-3.862-4.095h-.03c-1.383 0-2.533.59-3.237 1.662l1.39.954c.524-.793 1.346-1.004 1.848-1.004h.02c.714.004 1.252.212 1.6.617.253.295.423.703.508 1.217a10.26 10.26 0 0 0-2.128-.08c-2.15.124-3.532 1.376-3.438 3.112.047.875.497 1.628 1.265 2.12.65.416 1.486.618 2.354.57 1.145-.064 2.042-.484 2.668-1.247.475-.58.776-1.33.906-2.257.543.328.947.762 1.17 1.286.38.894.403 2.363-.79 3.555-1.048 1.048-2.31 1.502-4.198 1.517-2.093-.016-3.673-.688-4.698-1.996-.955-1.22-1.448-2.976-1.465-5.22.017-2.244.51-4 1.465-5.22 1.025-1.308 2.605-1.98 4.698-1.996 2.11.017 3.72.694 4.785 2.014.524.65.92 1.46 1.185 2.405l1.563-.414a8.56 8.56 0 0 0-1.496-3.025C16.003 3.69 14.018 2.84 11.62 2.82h-.015c-2.395.02-4.348.873-5.808 2.536C4.607 6.781 4.02 8.914 4 11.502v.008c.02 2.588.607 4.72 1.797 6.147 1.46 1.662 3.413 2.515 5.808 2.536h.015c2.271-.017 3.86-.61 5.148-1.9 1.696-1.696 1.639-3.832 1.062-5.193-.414-.974-1.186-1.762-2.274-2.322Zm-3.969 3.786c-.96.054-1.958-.376-2.008-1.324-.037-.703.498-1.488 1.885-1.568.165-.01.327-.014.486-.014.553 0 1.07.054 1.537.157-.175 2.36-1.17 2.71-1.9 2.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LinkedInIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        fill="#0A66C2"
      />
    </svg>
  );
}

export function XIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ShortsIcon({ size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M10 14.65v-5.3L15 12l-5 2.65Z"
        fill="#fff"
      />
      <path
        d="M17.77 10.32c-.77-.32-1.2-.5-1.2-.5L18 8.17a3.13 3.13 0 0 0-4.43-4.43L12.14 5.2l-1.45-1.43A3.13 3.13 0 1 0 6.26 8.2l1.44 1.43-1.87 1.87a3.13 3.13 0 0 0 4.43 4.43l1.44-1.43 1.45 1.43a3.12 3.12 0 0 0 4.43 0 3.12 3.12 0 0 0 0-4.43l.19-.18Z"
        fill="#FF0000"
      />
      <path d="M10 14.65v-5.3L15 12l-5 2.65Z" fill="#fff" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export function SearchIcon({ size = 14, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
