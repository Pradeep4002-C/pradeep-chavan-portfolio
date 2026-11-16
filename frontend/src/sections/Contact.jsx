import { useEffect, useRef, useState } from 'react';
import { sendContactMessage } from '../api/contact.js';
import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Button from '../components/Button.jsx';
import Container from '../components/Container.jsx';
import { focusFirstError } from '../components/formFocus.js';
import { buildContactPayload, validateContact } from './contactForm.js';

const EMPTY_FORM = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

const KNOWN_FIELDS = ['name', 'email', 'subject', 'message'];

/* Mirrors the public API's address check. A copy action is only offered when
   the profile supplies a usable address, so the button can never copy
   whitespace or an invalid fragment. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClassBase =
  'mt-2 min-h-[48px] w-full rounded-xl border bg-white/[0.06] px-3.5 py-3 text-[0.95rem] text-[#f9f8f4] outline-none transition-colors placeholder:text-night-soft/55 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400';
const fieldErrorClass = 'border-[#ffb4a8] hover:border-[#ffb4a8]';
const fieldNormalClass = 'border-white/40 hover:border-white/55';
const labelClass = 'block text-[0.78rem] font-semibold text-night-soft';
const errorTextClass = 'mt-1.5 text-[0.76rem] leading-relaxed text-[#ffc9c0]';
const hintTextClass = 'mt-1.5 text-[0.72rem] leading-relaxed text-night-soft/75';

function fieldClass(hasError) {
  return `${fieldClassBase} ${hasError ? fieldErrorClass : fieldNormalClass}`;
}

function FieldError({ id, children }) {
  return (
    <p id={id} className={errorTextClass}>
      {children}
    </p>
  );
}

function CopyGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

/* Legacy copy path for browsers where the async Clipboard API is unavailable
   or the permission is denied. The textarea is fixed, transparent, and removed
   immediately; it never enters the accessibility tree or the layout. */
function legacyCopyText(text) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.tabIndex = -1;
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '-9999px';
  area.style.opacity = '0';
  document.body.appendChild(area);

  let copied = false;
  try {
    area.select();
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    area.remove();
  }

  return copied;
}

/** Resolves true only when the address reached the clipboard. */
async function writeClipboardText(text) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or an unavailable clipboard: try the legacy path.
  }

  return legacyCopyText(text);
}

export default function Contact() {
  const { profile } = usePortfolio();
  const [values, setValues] = useState(EMPTY_FORM);
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [copyAnnouncement, setCopyAnnouncement] = useState('');

  const startedAtRef = useRef(Date.now());
  const abortRef = useRef(null);
  const copyTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const subjectRef = useRef(null);
  const messageRef = useRef(null);
  const fieldRefs = {
    name: nameRef,
    email: emailRef,
    subject: subjectRef,
    message: messageRef,
  };

  const email = typeof profile.email === 'string' ? profile.email.trim() : '';
  const hasEmail = EMAIL_PATTERN.test(email);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearTimeout(copyTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function focusFirstInvalidField(errors) {
    focusFirstError(errors, KNOWN_FIELDS, (field) => fieldRefs[field].current);
  }

  async function handleCopyEmail() {
    if (!hasEmail) {
      return;
    }

    // A repeated click starts a fresh 2s confirmation window instead of letting
    // the previous timer clear the newer state early.
    clearTimeout(copyTimerRef.current);

    const copied = await writeClipboardText(email);
    if (!mountedRef.current) {
      return;
    }

    if (!copied) {
      setCopyState('idle');
      setCopyAnnouncement('Could not copy automatically. Select the email address instead.');
      copyTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setCopyAnnouncement('');
      }, 2000);
      return;
    }

    setCopyState('copied');
    setCopyAnnouncement('Email address copied to clipboard.');
    copyTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setCopyState('idle');
      setCopyAnnouncement('');
    }, 2000);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const next = { ...current };
      delete next[name];
      return next;
    });

    if (!isSubmitting && status !== 'idle') {
      setStatus('idle');
      setStatusMessage('');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    const errors = validateContact(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('error');
      setStatusMessage('Please check the highlighted fields and try again.');
      focusFirstInvalidField(errors);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    submittingRef.current = true;

    setIsSubmitting(true);
    setFieldErrors({});
    setStatus('submitting');
    setStatusMessage('');

    try {
      const confirmation = await sendContactMessage(
        buildContactPayload(values, {
          website: honeypot,
          formStartedAt: startedAtRef.current,
        }),
        { signal: controller.signal },
      );

      if (!mountedRef.current) {
        return;
      }

      setValues(EMPTY_FORM);
      setHoneypot('');
      setFieldErrors({});
      setStatus('success');
      setStatusMessage(confirmation);
      startedAtRef.current = Date.now();
    } catch (error) {
      if (!mountedRef.current || error?.name === 'AbortError') {
        return;
      }

      const serverFields =
        error?.fields && typeof error.fields === 'object'
          ? Object.fromEntries(
              Object.entries(error.fields).filter(
                ([field, message]) =>
                  KNOWN_FIELDS.includes(field) &&
                  typeof message === 'string' &&
                  message.length > 0,
              ),
            )
          : {};

      setFieldErrors(serverFields);
      setStatus('error');

      if (Object.keys(serverFields).length > 0) {
        setStatusMessage('Please check the highlighted fields and try again.');
        focusFirstInvalidField(serverFields);
      } else if (error?.code === 'NETWORK_ERROR' || error?.code === 'HTTP_ERROR') {
        setStatusMessage(
          'Could not reach the contact service. Check your connection and try again.',
        );
      } else {
        setStatusMessage(
          typeof error?.message === 'string' && error.message.length > 0
            ? error.message
            : 'Your message could not be sent. Please try again.',
        );
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      tabIndex={-1}
      className="editorial-dark-mesh py-16 text-[#f9f8f4] focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <p className="text-kicker font-bold uppercase tracking-[0.14em] text-night-soft">
          Have something in mind?
        </p>
        <h2
          id="contact-title"
          className="mt-5 text-[clamp(3rem,6vw,5.5rem)] font-medium leading-none tracking-tighter [overflow-wrap:anywhere]"
        >
          Let&rsquo;s build something <span className="text-[#b8abff]">useful.</span>
        </h2>

        <div className="mt-8 grid gap-10 border-t border-white/15 pt-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="max-w-[420px] text-[0.92rem] leading-relaxed text-night-soft [overflow-wrap:anywhere]">
                I&rsquo;m always glad to connect about software, projects, and opportunities to
                learn by building.
              </p>
              <div className="mt-7 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <a
                    className="group -my-2 inline-flex min-h-[48px] min-w-0 max-w-full items-center gap-1.5 text-[clamp(0.98rem,1.8vw,1.3rem)] font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:text-[#c3b7ff] [overflow-wrap:anywhere]"
                    href={`mailto:${email}`}
                  >
                    {email} <Arrow />
                  </a>
                  {hasEmail ? (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-2 rounded-full border border-white/30 bg-white/[0.06] px-4 text-[0.8rem] font-semibold text-[#f9f8f4] outline-none transition-ui hover:border-white/55 hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 motion-safe:active:translate-y-px"
                      onClick={handleCopyEmail}
                    >
                      {copyState === 'copied' ? <CheckGlyph /> : <CopyGlyph />}
                      {copyState === 'copied' ? 'Copied' : 'Copy email'}
                    </button>
                  ) : null}
                </div>
                <span
                  id="contact-copy-status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="sr-only"
                >
                  {copyAnnouncement}
                </span>
                {profile.location ? (
                  <p className="text-[0.8rem] text-night-soft/80 [overflow-wrap:anywhere]">Based in {profile.location}</p>
                ) : null}
              </div>
            </div>

            <p className="max-w-[360px] text-[0.82rem] leading-relaxed text-night-soft/80">
              Send a message with the form, or use the email address above if you prefer.
            </p>
          </div>

          <form
            aria-labelledby="contact-form-title"
            className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-7 lg:p-8"
            noValidate
            onSubmit={handleSubmit}
          >
            <div>
              <h3
                id="contact-form-title"
                className="text-kicker font-bold uppercase tracking-[0.14em] text-night-soft"
              >
                Send a message
              </h3>
              <p className="mt-2 text-[0.78rem] leading-relaxed text-night-soft/80">
                Required fields are marked with an asterisk.
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="contact-name">
                  Name <span aria-hidden="true" className="text-[#b8abff]">*</span>
                </label>
                <input
                  ref={nameRef}
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  maxLength={80}
                  value={values.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                  className={fieldClass(Boolean(fieldErrors.name))}
                />
                {fieldErrors.name && (
                  <FieldError id="contact-name-error">{fieldErrors.name}</FieldError>
                )}
              </div>

              <div>
                <label className={labelClass} htmlFor="contact-email">
                  Email <span aria-hidden="true" className="text-[#b8abff]">*</span>
                </label>
                <input
                  ref={emailRef}
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  value={values.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                  className={fieldClass(Boolean(fieldErrors.email))}
                />
                {fieldErrors.email && (
                  <FieldError id="contact-email-error">{fieldErrors.email}</FieldError>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClass} htmlFor="contact-subject">
                Subject <span className="font-normal text-night-soft/70">(optional)</span>
              </label>
              <input
                ref={subjectRef}
                id="contact-subject"
                name="subject"
                type="text"
                autoComplete="off"
                maxLength={120}
                value={values.subject}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.subject)}
                aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
                className={fieldClass(Boolean(fieldErrors.subject))}
              />
              {fieldErrors.subject && (
                <FieldError id="contact-subject-error">{fieldErrors.subject}</FieldError>
              )}
            </div>

            <div className="mt-5">
              <label className={labelClass} htmlFor="contact-message">
                Message <span aria-hidden="true" className="text-[#b8abff]">*</span>
              </label>
              <textarea
                ref={messageRef}
                id="contact-message"
                name="message"
                required
                rows={5}
                maxLength={5000}
                value={values.message}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={
                  fieldErrors.message
                    ? 'contact-message-hint contact-message-error'
                    : 'contact-message-hint'
                }
                className={`${fieldClass(Boolean(fieldErrors.message))} min-h-[132px] resize-y`}
              />
              <p id="contact-message-hint" className={hintTextClass}>
                At least 10 characters.
              </p>
              {fieldErrors.message && (
                <FieldError id="contact-message-error">{fieldErrors.message}</FieldError>
              )}
            </div>

            {/* Honeypot: off-screen, removed from the accessibility tree, and
                skipped by keyboard navigation. Ordinary visitors never see or
                tab into it. */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[250px] text-[0.76rem] leading-relaxed text-night-soft/75">
                Your details are used only to reply to this message.
              </p>
              <Button
                type="submit"
                variant="light"
                className="shrink-0 self-start sm:self-auto"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send message'}
              </Button>
            </div>

            <div className="mt-4 min-h-[1.25rem] text-[0.8rem] leading-relaxed [overflow-wrap:anywhere]">
              {/* Errors use a dedicated alert region so assistive technology
                  announces a failed send immediately. Pending and success
                  messages stay polite. Both regions are mounted in every
                  state, so a role is already in place before content lands. */}
              <div role="alert" aria-atomic="true">
                {status === 'error' && <p className="text-[#ffc9c0]">{statusMessage}</p>}
              </div>
              <div role="status" aria-live="polite" aria-atomic="true">
                {status === 'submitting' && (
                  <p className="text-night-soft">Sending your message...</p>
                )}
                {status === 'success' && <p className="text-[#bfe8c7]">{statusMessage}</p>}
              </div>
            </div>
          </form>
        </div>
      </Container>
    </section>
  );
}
