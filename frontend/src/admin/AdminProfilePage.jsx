import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button.jsx';
import { fetchProfile, updateProfile } from './adminApi.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import {
  AdminErrorState,
  AdminLoading,
  Notice,
  PageHeader,
  describeError,
  fieldErrorClass,
  hintClass,
  inputClass,
  labelClass,
} from './AdminUi.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors the public portfolio's asset-path rule: relative, no escaping.
const ASSET_PATH_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._~/-]+$/;
const MAX_PARAGRAPHS = 20;

const TEXT_FIELDS = [
  { name: 'name', label: 'Name', required: true, maxLength: 120 },
  { name: 'email', label: 'Email', required: true, maxLength: 254, type: 'email' },
  { name: 'headline', label: 'Headline', maxLength: 200, span: 2 },
  { name: 'location', label: 'Location', maxLength: 160 },
  { name: 'resumePath', label: 'Resume path', maxLength: 200, hint: 'Relative path to the PDF, e.g. resume.pdf.' },
  { name: 'github', label: 'GitHub URL', maxLength: 300, url: true, span: 2 },
  { name: 'linkedin', label: 'LinkedIn URL', maxLength: 300, url: true, span: 2 },
  { name: 'leetcode', label: 'LeetCode URL', maxLength: 300, url: true, span: 2 },
];

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function emptyValues() {
  return {
    name: '',
    email: '',
    headline: '',
    intro: '',
    location: '',
    resumePath: '',
    github: '',
    linkedin: '',
    leetcode: '',
  };
}

function valuesFromProfile(profile) {
  const defaults = emptyValues();
  if (!profile) {
    return defaults;
  }
  const values = { ...defaults };
  for (const key of Object.keys(defaults)) {
    values[key] = typeof profile[key] === 'string' ? profile[key] : '';
  }
  return values;
}

function validate(values, paragraphs) {
  const errors = {};

  const name = values.name.trim();
  if (name === '') {
    errors.name = 'Enter a name.';
  } else if (name.length > 120) {
    errors.name = 'Name must be 120 characters or fewer.';
  }

  const email = values.email.trim();
  if (email === '') {
    errors.email = 'Enter an email address.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  } else if (email.length > 254) {
    errors.email = 'Email must be 254 characters or fewer.';
  }

  const lengthChecks = [
    ['headline', 200, 'Headline'],
    ['intro', 1000, 'Introduction'],
    ['location', 160, 'Location'],
  ];
  for (const [key, max, label] of lengthChecks) {
    if (values[key].trim().length > max) {
      errors[key] = `${label} must be ${max} characters or fewer.`;
    }
  }

  for (const key of ['github', 'linkedin', 'leetcode']) {
    const value = values[key].trim();
    if (value !== '' && !isHttpUrl(value)) {
      errors[key] = 'Enter a valid http or https URL.';
    } else if (value.length > 300) {
      errors[key] = 'URL must be 300 characters or fewer.';
    }
  }

  const resume = values.resumePath.trim();
  if (resume !== '' && !ASSET_PATH_PATTERN.test(resume)) {
    errors.resumePath = 'Resume path must be a relative file path, for example resume.pdf.';
  }

  if (paragraphs.length > MAX_PARAGRAPHS) {
    errors.bio = `Use at most ${MAX_PARAGRAPHS} paragraphs.`;
  } else if (paragraphs.some((paragraph) => paragraph.length > 2000)) {
    errors.bio = 'Each paragraph must be 2,000 characters or fewer.';
  }

  return errors;
}

export default function AdminProfilePage() {
  const { markUnauthenticated } = useAdminAuth();
  const [values, setValues] = useState(emptyValues);
  const [paragraphs, setParagraphs] = useState([{ id: 1, text: '' }]);
  const nextParagraphId = useRef(2);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [hadProfile, setHadProfile] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const applyProfile = useCallback((profile) => {
    setValues(valuesFromProfile(profile));
    const bio = Array.isArray(profile?.bio) ? profile.bio.filter((p) => typeof p === 'string') : [];
    setParagraphs(
      bio.length > 0 ? bio.map((text) => ({ id: nextParagraphId.current++, text })) : [{ id: 0, text: '' }],
    );
  }, []);

  const load = useCallback(
    async (signal) => {
      try {
        const profile = await fetchProfile({ signal });
        applyProfile(profile);
        setHadProfile(profile !== null);
        setStatus('ready');
        setLoadError(null);
      } catch (requestError) {
        if (requestError?.name === 'AbortError') {
          return;
        }
        if (requestError?.status === 401) {
          markUnauthenticated();
          return;
        }
        setStatus('error');
        setLoadError(requestError);
      }
    },
    [applyProfile, markUnauthenticated],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function reload() {
    setStatus('loading');
    load();
  }

  function update(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function addParagraph() {
    setParagraphs((previous) =>
      previous.length >= MAX_PARAGRAPHS
        ? previous
        : [...previous, { id: nextParagraphId.current++, text: '' }],
    );
  }

  function updateParagraph(id, text) {
    setParagraphs((previous) => previous.map((p) => (p.id === id ? { ...p, text } : p)));
  }

  function removeParagraph(id) {
    setParagraphs((previous) => previous.filter((p) => p.id !== id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const trimmedParagraphs = paragraphs
      .map((p) => p.text.trim())
      .filter((text) => text.length > 0);

    const errors = validate(values, trimmedParagraphs);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        headline: values.headline.trim(),
        intro: values.intro.trim(),
        bio: trimmedParagraphs,
        location: values.location.trim(),
        github: values.github.trim(),
        linkedin: values.linkedin.trim(),
        leetcode: values.leetcode.trim(),
        resumePath: values.resumePath.trim(),
      };
      const saved = await updateProfile(payload);
      applyProfile(saved);
      setHadProfile(true);
      setNotice({ tone: 'success', message: 'Your profile was saved.' });
    } catch (requestError) {
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      if (requestError?.fields && typeof requestError.fields === 'object') {
        const mapped = {};
        let formMessage = null;
        for (const [key, message] of Object.entries(requestError.fields)) {
          if (key === 'form' || typeof message !== 'string' || message.length === 0) {
            formMessage ??= typeof message === 'string' ? message : null;
            continue;
          }
          mapped[key] = message;
        }
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
        }
        setFormError(formMessage ?? describeError(requestError, 'We could not save your profile.'));
      } else {
        setFormError(describeError(requestError, 'We could not save your profile. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return <AdminLoading label="Loading your profile…" />;
  }

  if (status === 'error') {
    return (
      <AdminErrorState
        title="We could not load your profile"
        message={describeError(loadError, 'We could not load your profile. Please try again.')}
        onRetry={reload}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Profile" description="The main details shown across the public site.">
        <Button variant="outline" size="sm" onClick={reload} disabled={submitting}>
          Reload
        </Button>
      </PageHeader>

      {!hadProfile ? (
        <div className="mb-5">
          <Notice tone="success">
            No profile is stored yet. Complete the form and save to create it.
          </Notice>
        </div>
      ) : null}

      {notice ? (
        <div className="mb-5">
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.message}
          </Notice>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        {formError ? (
          <div className="mb-5">
            <Notice tone="error">{formError}</Notice>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((field) => {
            const id = `profile-${field.name}`;
            const error = fieldErrors[field.name];
            return (
              <div key={field.name} className={field.span === 2 ? 'sm:col-span-2' : undefined}>
                <label className={labelClass} htmlFor={id}>
                  {field.label}
                  {field.required ? <span className="text-[#b3261e]"> *</span> : null}
                </label>
                <input
                  id={id}
                  type={field.type ?? 'text'}
                  className={inputClass}
                  value={values[field.name]}
                  maxLength={field.maxLength}
                  spellCheck={field.url ? 'false' : undefined}
                  inputMode={field.url ? 'url' : undefined}
                  onChange={(event) => update(field.name, event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : field.hint ? `${id}-hint` : undefined}
                />
                {error ? (
                  <p id={`${id}-error`} className={fieldErrorClass}>
                    {error}
                  </p>
                ) : field.hint ? (
                  <p id={`${id}-hint`} className={hintClass}>
                    {field.hint}
                  </p>
                ) : null}
              </div>
            );
          })}

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="profile-intro">
              Introduction
            </label>
            <textarea
              id="profile-intro"
              className={inputClass}
              rows={3}
              maxLength={1000}
              value={values.intro}
              onChange={(event) => update('intro', event.target.value)}
              aria-invalid={Boolean(fieldErrors.intro)}
              aria-describedby={fieldErrors.intro ? 'profile-intro-error' : undefined}
            />
            {fieldErrors.intro ? (
              <p id="profile-intro-error" className={fieldErrorClass}>
                {fieldErrors.intro}
              </p>
            ) : null}
          </div>
        </div>

        <fieldset className="mt-6 border-t border-line pt-5">
          <legend className="text-sm font-semibold text-ink">Biography paragraphs</legend>
          <p className="mt-1 text-xs text-muted">
            Each paragraph appears as a separate block in the About section.
          </p>

          <div className="mt-3 flex flex-col gap-3">
            {paragraphs.map((paragraph, index) => {
              const id = `profile-bio-${paragraph.id}`;
              return (
                <div key={paragraph.id}>
                  <label className={labelClass} htmlFor={id}>
                    Paragraph {index + 1}
                  </label>
                  <textarea
                    id={id}
                    className={inputClass}
                    rows={3}
                    maxLength={2000}
                    value={paragraph.text}
                    onChange={(event) => updateParagraph(paragraph.id, event.target.value)}
                  />
                  {paragraphs.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeParagraph(paragraph.id)}
                      className="mt-1.5 text-xs font-semibold text-[#8f1d15] underline decoration-transparent underline-offset-2 transition-ui hover:decoration-current"
                    >
                      Remove paragraph {index + 1}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {fieldErrors.bio ? <p className={fieldErrorClass}>{fieldErrors.bio}</p> : null}

          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addParagraph}
              disabled={paragraphs.length >= MAX_PARAGRAPHS}
            >
              Add paragraph
            </Button>
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="solid" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
