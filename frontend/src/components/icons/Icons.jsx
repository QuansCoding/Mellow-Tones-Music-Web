/**
 * Icon set.
 *
 * MapPin is the exact vector exported from the Figma file. The rest are UI
 * glyphs the design system needs but the Figma does not ship — the Figma's
 * player buttons are blank rounded rectangles, which is fine for a static
 * mockup but unusable once the transport actually works.
 *
 * All icons stroke/fill with currentColor so they inherit from their button.
 */

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  'aria-hidden': true,
  focusable: false,
};

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function MapPin({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path
        {...stroke}
        d="M8.40067 14.5327C9.64067 13.462 13.3333 9.99533 13.3333 6.66667C13.3333 5.25218 12.7714 3.89562 11.7712 2.89543C10.771 1.89524 9.41449 1.33333 8 1.33333C6.58551 1.33333 5.22896 1.89524 4.22876 2.89543C3.22857 3.89562 2.66667 5.25218 2.66667 6.66667C2.66667 9.99533 6.35933 13.462 7.59933 14.5327C7.71485 14.6195 7.85547 14.6665 8 14.6665C8.14453 14.6665 8.28515 14.6195 8.40067 14.5327Z"
      />
      <path
        {...stroke}
        d="M8 8.66667C9.10457 8.66667 10 7.77124 10 6.66667C10 5.5621 9.10457 4.66667 8 4.66667C6.89543 4.66667 6 5.5621 6 6.66667C6 7.77124 6.89543 8.66667 8 8.66667Z"
      />
    </svg>
  );
}

export function Heart({ size = 18, filled = false }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path
        d="M8 13.6 6.84 12.55C3.28 9.36 1 7.28 1 4.73 1 2.66 2.66 1 4.73 1 5.9 1 7.02 1.54 7.75 2.4L8 2.68 8.25 2.4C8.98 1.54 10.1 1 11.27 1 13.34 1 15 2.66 15 4.73 15 7.28 12.72 9.36 9.16 12.55Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.4}
      />
    </svg>
  );
}

export function Plus({ size = 14 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path {...stroke} d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function Play({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path d="M4.5 2.9c0-.7.76-1.13 1.36-.78l8 4.85c.57.35.57 1.19 0 1.54l-8 4.85c-.6.36-1.36-.07-1.36-.77Z" fill="currentColor" />
    </svg>
  );
}

export function Pause({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path d="M4 2.5h2.6v11H4zM9.4 2.5H12v11H9.4z" fill="currentColor" />
    </svg>
  );
}

export function SkipBack({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path d="M13.2 3.4c0-.66-.73-1.06-1.28-.7L5.5 6.8V3.4c0-.66-.73-1.06-1.29-.7L3 3.5v9l1.21.8c.56.36 1.29-.04 1.29-.7V9.2l6.42 4.1c.55.36 1.28-.04 1.28-.7Z" fill="currentColor" />
    </svg>
  );
}

export function SkipForward({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path d="M2.8 3.4c0-.66.73-1.06 1.28-.7L10.5 6.8V3.4c0-.66.73-1.06 1.29-.7L13 3.5v9l-1.21.8c-.56.36-1.29-.04-1.29-.7V9.2l-6.42 4.1c-.55.36-1.28-.04-1.28-.7Z" fill="currentColor" />
    </svg>
  );
}

export function VolumeUp({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path {...stroke} strokeWidth={1.6} d="M8 3 5 5.5H3v5h2L8 13z" />
      <path {...stroke} strokeWidth={1.6} d="M10.8 5.6a3.4 3.4 0 0 1 0 4.8M12.9 3.5a6.4 6.4 0 0 1 0 9" />
    </svg>
  );
}

export function VolumeDown({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path {...stroke} strokeWidth={1.6} d="M8 3 5 5.5H3v5h2L8 13z" />
      <path {...stroke} strokeWidth={1.6} d="M10.8 5.6a3.4 3.4 0 0 1 0 4.8" />
    </svg>
  );
}

export function ChevronDown({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path {...stroke} d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function Menu({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path {...stroke} d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </svg>
  );
}

export function Close({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 16 16">
      <path {...stroke} d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
