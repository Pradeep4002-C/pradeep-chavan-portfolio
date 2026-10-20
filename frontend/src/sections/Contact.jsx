import { useEffect, useRef, useState } from 'react';
import { sendContactMessage } from '../api/contact.js';
import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Button from '../components/Button.jsx';
import Container from '../components/Container.jsx';

const EMPTY_FORM = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KNOWN_FIELDS = ['name', 'email', 'subject', 'message'];

const fieldClassBase =
  'mt-2 w-full rounded-xl border bg-white/[0.06] px-3.5 py-3 text-[0.95rem] text-[#f9f8f4] transition-ui placeholder:text-night-soft/55';
const fieldErrorClass = 'border-[#ffb4a8] hover:border-[#ffb4a8]';
const fieldNormalClass = 'border-white/40 hover:border-white/55';
const labelClass = 'block text-[0.78rem] font-semibold text-night-soft';
const errorTextClass = 'mt-1.5 text-[0.76rem] leading-relaxed text-[#ffc9c0]';
const hintTextClass = 'mt-1.5 text-[0.72rem] leading-relaxed text-night-soft/75';

function fieldClass(hasError) {
  return `${fieldClassBase} ${hasError ? fieldErrorClass : fieldNormalClass}`;
}

function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (!name) {
    errors.name = 'Enter your name.';
  } else if (name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  if (!email) {
    errors.email = 'Enter your email address.';
  } else if (email.length > 254) {
    errors.email = 'Email must be 254 characters or fewer.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (subject.length > 120) {
    errors.subject = 'Subject must be 120 characters or fewer.';
  }

  if (!message) {
    errors.message = 'Enter a message.';
  } else if (message.length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  } else if (message.length > 5000) {
    errors.message = 'Message must be 5000 characters or fewer.';
  }

  return errors;
}

function FieldError({ id, children }) {
  return (
    <p id={id} className={errorTextClass}>
      {children}
    </p>
  );
}

export default function Contact() {
  const { profile } = usePortfolio();
  const [values, setValues] = useState(EMPTY_FORM);
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startedAtRef = useRef(Date.now());
  const abortRef = useRef(null);
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

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  function focusFirstError(errors) {
    const firstField = KNOWN_FIELDS.find((field) => errors[field]);
    if (firstField) {
      // Focus after React has committed the error text and aria-describedby so
      // assistive technology announces the message with the field.
      window.requestAnimationFrame(() => fieldRefs[firstField].current?.focus());
    }
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

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('error');
      setStatusMessage('Please check the highlighted fields and try again.');
      focusFirstError(errors);
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
        {
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim(),
          website: honeypot,
          formStartedAt: startedAtRef.current,
        },
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
        focusFirstError(serverFields);
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
      className="bg-night py-16 text-[#f9f8f4] focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <p className="text-kicker font-bold uppercase tracking-[0.14em] text-night-soft">
          Have something in mind?
        </p>
        <h2
          id="contact-title"
          className="mt-5 text-[clamp(3rem,7vw,6.4rem)] font-medium leading-[0.98] tracking-[-0.065em]"
        >
          Let&rsquo;s build something <span className="text-[#b8abff]">useful.</span>
        </h2>

        <div className="mt-8 grid gap-10 border-t border-white/15 pt-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="max-w-[420px] text-[0.92rem] leading-relaxed text-night-soft">
                I&rsquo;m always glad to connect about software, projects, and opportunities to
                learn by building.
              </p>
              <div className="mt-7 flex flex-col gap-1.5">
                <a
                  className="group inline-flex max-w-full items-center gap-1.5 text-[clamp(0.98rem,1.8vw,1.3rem)] font-medium transition-ui hover:text-[#c3b7ff] [overflow-wrap:anywhere]"
                  href={`mailto:${profile.email}`}
                >
                  {profile.email} <Arrow />
                </a>
                <p className="text-[0.8rem] text-night-soft/80">Based in {profile.location}</p>
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

            <div
              className="mt-4 min-h-[1.25rem] text-[0.8rem] leading-relaxed"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {status === 'submitting' && (
                <p className="text-night-soft">Sending your message...</p>
              )}
              {status === 'success' && <p className="text-[#bfe8c7]">{statusMessage}</p>}
              {status === 'error' && <p className="text-[#ffc9c0]">{statusMessage}</p>}
            </div>
          </form>
        </div>
      </Container>
    </section>
  );
}
