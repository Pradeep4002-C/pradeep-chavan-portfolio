import { Fragment } from 'react';
import WorkflowArtwork, { NeutralProjectArtwork } from './WorkflowArtwork.jsx';

/* Purpose-built illustrations, one per project.

   These are diagrams, not captures. None of the three is a screenshot, and none is
   presented as the running application: each panel states what it is in its own
   topline ("Illustrative workflow", "Illustrative diagram", "Illustrative flow"),
   and each panel is a single `role="img"` carrying one descriptive label, so a
   screen reader hears one sentence per project instead of a stream of decorative
   fragments.

   Nothing inside is a claim the project data does not already make. There are no
   figures, filenames, category names, model outputs, or metrics anywhere in these
   drawings - the shapes are blank, and the only words are the real stage names
   (Report / Prioritize / Resolve), the three status bands the API returns, the real
   automation steps, and the honest illustration label.

   Each panel is CSS boxes and inline SVG: no image file, no new dependency. Every
   palette is one family - pale tint, dark ink, one mid tone - and every text colour
   clears 4.5:1 against its own tint, which is what keeps the small labels legible.

   The three panels share one recipe: topline, middle, bottomline, with the middle
   carrying the height. That is deliberate. It makes the two supporting panels come
   out exactly the same height wherever they sit side by side, and it makes each
   drawing fill the width the layout hands it instead of sitting in a fixed frame.

   Below 480px every drawing switches from its wide arrangement to a stacked one -
   tickets and automation cards become full-width rows, and the connector arrows
   turn downward - because a three-up column at that width would break words. */

const panel =
  'relative isolate flex flex-col justify-between overflow-hidden rounded-2xl p-4 sm:p-5';
const topline =
  'flex flex-col gap-1 text-[0.6rem] font-bold uppercase tracking-[0.11em] xs:flex-row xs:items-center xs:justify-between xs:gap-2 sm:text-[0.63rem]';
const bottomline =
  'flex justify-between gap-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] sm:text-[0.62rem]';
const middle = 'relative my-4';

const glyphs = {
  report: <path d="M5 7h14M5 12h14M5 17h9" />,
  prioritize: (
    <>
      <path d="M6 21V5" />
      <path d="M6 5h11l-2.6 4L17 13H6" />
    </>
  ),
  resolve: <path d="m20 6-11 11-5-5" />,
  workbook: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16M11 5v14" />
    </>
  ),
  summary: <path d="M6 16v3M12 11v8M18 6v13" />,
};

/** One consistent 2px-stroke glyph, matching the arrows elsewhere on the page. */
function Glyph({ name, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {glyphs[name]}
    </svg>
  );
}

/** A workflow connector: points right in the wide arrangement, down when stacked. */
function Connector({ className = '' }) {
  return (
    <span aria-hidden="true" className={`grid place-items-center ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5 rotate-90 xs:rotate-0 sm:size-4"
      >
        <path d="M5 12h13" />
        <path d="m12 6 6 6-6 6" />
      </svg>
    </span>
  );
}

/** The brand mark and the honest label that keeps a drawing from reading as a capture. */
function PanelTop({ name, note, className }) {
  return (
    <div className={`${topline} ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-[7px] rounded-[2px] bg-current" /> {name}
      </span>
      <span>{note}</span>
    </div>
  );
}

/* The three real stages of a HostelCare complaint, in order. The roles in the
   bottomline are the three the project description names. */
const hostelStages = [
  { number: '01', stage: 'Report', note: 'Submit a complaint', glyph: 'report', pip: 'bg-[#7564c7]/25' },
  { number: '02', stage: 'Prioritize', note: 'Route to the right team', glyph: 'prioritize', pip: 'bg-[#7564c7]/60' },
  { number: '03', stage: 'Resolve', note: 'Track progress', glyph: 'resolve', pip: 'bg-[#7564c7]' },
];

function HostelCareArtwork() {
  return (
    <div
      className={`${panel} bg-[#e9e5ff] text-[#302b51]`}
      role="img"
      aria-label="Illustration of the HostelCare complaint workflow: a student reports a complaint, an administrator prioritizes and routes it, and maintenance resolves it with tracked progress"
    >
      <PanelTop name="HostelCare" note="Illustrative workflow" className="text-[#5b5677]" />

      <div
        className={`${middle} grid grid-cols-1 gap-1.5 xs:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] xs:items-stretch`}
      >
        {hostelStages.map((item, index) => (
          <Fragment key={item.number}>
            {index > 0 && <Connector className="text-[#8d80d2]" />}

            <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#433977]/15 bg-white/70 px-3 py-2.5 xs:min-h-[132px] xs:flex-col xs:items-stretch xs:gap-0 xs:py-3 lg:min-h-[148px]">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#e6e0ff] text-[#5b46c0] sm:size-7">
                <Glyph name={item.glyph} className="size-3.5 sm:size-4" />
              </span>

              <div className="min-w-0 flex-1 xs:mt-2.5 xs:flex-none">
                <b className="block text-[0.8rem] font-semibold tracking-[-0.02em] sm:text-[0.85rem]">
                  {item.stage}
                </b>
                <small className="mt-1 hidden text-[0.6rem] leading-snug text-[#55516e] xs:block">
                  {item.note}
                </small>
              </div>

              <span className="ml-auto flex shrink-0 items-center gap-1.5 xs:order-first xs:ml-0 xs:justify-between">
                <span className="hidden text-[0.6rem] font-bold tracking-[0.08em] text-[#5b5677] xs:inline">
                  {item.number}
                </span>
                <i className={`size-[6px] rounded-full ${item.pip}`} />
              </span>
            </div>
          </Fragment>
        ))}
      </div>

      <div className={`${bottomline} text-[#5b5677]`}>
        <span>Student</span>
        <span>Admin</span>
        <span>Staff</span>
      </div>

      <span
        aria-hidden="true"
        className="absolute -right-32 top-8 -z-10 size-[360px] rounded-full border border-[#433977]/10"
      />
      <span
        aria-hidden="true"
        className="absolute -right-20 top-20 -z-10 size-[260px] rounded-full border border-[#433977]/10"
      />
    </div>
  );
}

/* AquaPredict: the eight water-quality measurements the model reads, the quantity it
   predicts, and the three status bands the API returns. No values and no plotted
   output - the scale names the bands and stops there. */
function AquaPredictArtwork() {
  const measurements = Array.from({ length: 8 }, (_, index) => index);

  return (
    <div
      className={`${panel} bg-[#e2f2ee] text-[#1d5c55]`}
      role="img"
      aria-label="Illustration for AquaPredict: eight water-quality measurements are read by a trained model, which returns an estimated biological oxygen demand and one of three status bands - safe, moderate, or polluted"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 600 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-20 w-full text-[#8fc9c0] opacity-25"
      >
        <path d="M0 58c70-26 118 8 190-6s132-34 214-16 132 30 196 24v60H0Z" fill="currentColor" />
        <path d="M0 86c84-22 132 4 214-10s150-20 386 6v38H0Z" fill="currentColor" />
      </svg>

      <PanelTop name="AquaPredict" note="Illustrative diagram" className="text-[#35564f]" />

      <div
        className={`${middle} grid grid-cols-1 items-center gap-4 xs:min-h-[132px] xs:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xs:gap-3 sm:gap-5 lg:min-h-[148px]`}
      >
        <div className="min-w-0">
          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.11em] text-[#35564f]">
            Water sample
          </span>
          <strong className="mt-1 block text-[1.9rem] font-semibold leading-[0.9] tracking-[-0.08em] sm:text-[2.3rem]">
            BOD
          </strong>
          <span aria-hidden="true" className="mt-2.5 grid w-fit grid-cols-4 gap-1">
            {measurements.map((index) => (
              <i key={index} className="h-1.5 w-4 rounded-full bg-[#5fa79a]" />
            ))}
          </span>
          <small className="mt-2 block max-w-[190px] text-[0.6rem] leading-snug text-[#35564f]">
            Eight water-quality measurements
          </small>
        </div>

        <div className="min-w-0">
          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.11em] text-[#35564f]">
            Status band
          </span>
          <span aria-hidden="true" className="mt-2 flex h-2.5 overflow-hidden rounded-full">
            <i className="flex-1 bg-[#8fd0c4]" />
            <i className="flex-1 bg-[#4f9a8d]" />
            <i className="flex-1 bg-[#2b6f66]" />
          </span>
          <span className="mt-1.5 flex justify-between gap-1 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[#35564f]">
            <span>Safe</span>
            <span>Moderate</span>
            <span>Polluted</span>
          </span>
          <small className="mt-2.5 block max-w-[200px] text-[0.6rem] leading-snug text-[#35564f]">
            The estimate comes back with one of these three bands
          </small>
        </div>
      </div>

      <div className={`${bottomline} text-[#35564f]`}>
        <span>Sample</span>
        <span>Model</span>
        <span>Estimate</span>
      </div>
    </div>
  );
}

/* RPA Expense Tracker: the real automation steps, with blank cells rather than
   invented figures or category names. */
function ExpenseArtwork() {
  const cells = Array.from({ length: 12 }, (_, index) => index);

  return (
    <div
      className={`${panel} bg-[#fbefd7] text-[#5b4216]`}
      role="img"
      aria-label="Illustration of the RPA expense tracker: expense rows in an Excel workbook are processed into a summary report, which is then emailed as an attachment"
    >
      <PanelTop name="Expense Tracker" note="Illustrative flow" className="text-[#6b5225]" />

      <div
        className={`${middle} grid grid-cols-1 gap-1.5 xs:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.05fr)] xs:items-stretch xs:gap-2 sm:gap-3`}
      >
        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#ddcda8] bg-[#fffef9]/80 p-2.5 xs:min-h-[132px] xs:flex-col xs:items-stretch xs:gap-0 xs:p-3 lg:min-h-[148px]">
          <span className="flex items-center gap-2">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-[#e3efe0] text-[#3d6b4f]">
              <Glyph name="workbook" className="size-3.5" />
            </span>
            <b className="min-w-0 text-[0.68rem] font-semibold tracking-[-0.01em]">Excel rows</b>
          </span>

          <span aria-hidden="true" className="mt-3 grid flex-1 grid-cols-4 content-start gap-[4px]">
            {cells.map((index) => (
              <i
                key={index}
                className={`h-3 rounded-[2px] border ${
                  index < 4
                    ? 'border-[#d3e2d3] bg-[#e3efe0]'
                    : index % 5 === 2
                      ? 'border-transparent bg-[#f2e6c9]'
                      : 'border-[#e3dbc8] bg-[#f4edde]'
                }`}
              />
            ))}
          </span>
        </div>

        <Connector className="text-[#b8974c]" />

        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#e7d8b8] bg-[#fffef9]/70 p-2.5 xs:min-h-[132px] xs:flex-col xs:items-stretch xs:gap-0 xs:p-3 lg:min-h-[148px]">
          <span className="flex items-center gap-2">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-[#f4e4bd] text-[#8a6a26]">
              <Glyph name="summary" className="size-3.5" />
            </span>
            <b className="min-w-0 text-[0.68rem] font-semibold tracking-[-0.01em]">Summary report</b>
          </span>

          <span aria-hidden="true" className="flex flex-1 items-center gap-2">
            <i className="my-2.5 hidden w-full border-t border-dashed border-[#ddcda8] xs:block" />
          </span>

          <span className="flex items-center gap-2">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-[#b88f3e] text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3"
                aria-hidden="true"
              >
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </span>
            <b className="min-w-0 text-[0.68rem] font-semibold tracking-[-0.01em]">Email delivery</b>
          </span>
        </div>
      </div>

      <div className={`${bottomline} text-[#6b5225]`}>
        <span>Process</span>
        <span>Summarize</span>
        <span>Send</span>
      </div>
    </div>
  );
}

/**
 * Chooses the illustration named by the project data. The three purpose-built
 * drawings remain untouched; `workflow` draws only the administrator's saved
 * steps. A missing or invalid workflow uses a neutral fallback rather than
 * borrowing another project's artwork or inventing an architecture.
 */
export default function ProjectArtwork({ type, workflow }) {
  switch (type) {
    case 'hostelcare':
      return <HostelCareArtwork />;
    case 'aquapredict':
      return <AquaPredictArtwork />;
    case 'expense':
      return <ExpenseArtwork />;
    case 'workflow':
      return <WorkflowArtwork workflow={workflow} />;
    default:
      return <NeutralProjectArtwork />;
  }
}
