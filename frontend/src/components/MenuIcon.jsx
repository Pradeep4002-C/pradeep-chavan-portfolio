/**
 * A geometrically centred menu glyph shared by the public and administrator
 * navigation. The two hamburger strokes and the two close strokes share the
 * same 24×24 viewBox and centre point, so the icon never depends on CSS
 * transforms or half-pixel translate offsets.
 */
export default function MenuIcon({ open, className = 'size-[18px] shrink-0' }) {
  return (
    <svg
      aria-hidden="true"
      data-menu-icon={open ? 'close' : 'menu'}
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      shapeRendering="geometricPrecision"
      className={className}
    >
      {open ? (
        <>
          <path d="M6 6 18 18" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M4 8h16" />
          <path d="M4 16h16" />
        </>
      )}
    </svg>
  );
}
