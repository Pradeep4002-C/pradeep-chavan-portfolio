/** The site wordmark. `onNavigate` lets the mobile menu close when it is clicked. */
export default function Brand({ onNavigate }) {
  return (
    <a
      className="inline-flex shrink-0 items-center gap-2.5"
      href="#home"
      aria-label="Pradeep Chavan — home"
      onClick={onNavigate}
    >
      {/* "PC" monogram: a compact accent tile with two centered, tightly
          tracked letters. The letters are drawn with generated content so the
          mark stays decorative and does not clash with the link's accessible
          name ("Pradeep Chavan — home"). */}
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center gap-px rounded-[11px] bg-accent text-[0.8rem] font-bold leading-none tracking-[-0.02em] text-white before:content-['P'] after:content-['C']"
      />
      <span className="text-sm font-semibold tracking-[-0.035em]">Pradeep Chavan</span>
    </a>
  );
}
