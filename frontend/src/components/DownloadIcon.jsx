/**
 * Inline SVG download icon (tray + down arrow), matching the Arrow component's
 * 2px stroke. Inherits the button's text colour through `currentColor`, so it
 * never reads as a separate control.
 */
export default function DownloadIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[1.05em] w-[1.05em] shrink-0 transition-transform group-hover:translate-y-0.5 ${className}`}
    >
      <path d="M12 15V3" />
      <path d="m7 10 5 5 5-5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}
