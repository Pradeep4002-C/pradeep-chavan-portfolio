import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { focusFirstError } from '../components/formFocus.js';
import { fetchProfile, updateProfile } from './adminApi.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import {
  AdminErrorState,
  AdminLoading,
  ConfirmDialog,
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

export const UNSAVED_PROFILE_MESSAGE =
  'You have unsaved changes. Are you sure you want to discard them?';

/**
 * Snapshot comparison stores paragraph text only, not the internal editor ids,
 * so loading a profile or saving it does not make the form look dirty.
 */
function draftSnapshot(values, paragraphs) {
  return {
    values: { ...values },
    paragraphs: paragraphs.map((paragraph) => paragraph.text),
  };
}

function isDraftDirty(values, paragraphs, snapshot) {
  return (
    JSON.stringify(values) !== JSON.stringify(snapshot.values) ||
    JSON.stringify(paragraphs.map((paragraph) => paragraph.text)) !==
      JSON.stringify(snapshot.paragraphs)
  );
}

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

const PROFILE_ERROR_ORDER = [...TEXT_FIELDS.map((field) => field.name), 'intro', 'bio'];

function profileErrorTarget(key) {
  if (key === 'bio') {
    return document.querySelector('textarea[id^="profile-bio-"]');
  }
  return document.getElementById(`profile-${key}`);
}

function focusProfileErrors(errors) {
  focusFirstError(errors, PROFILE_ERROR_ORDER, profileErrorTarget);
}

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
  const [snapshot, setSnapshot] = useState(() =>
    draftSnapshot(emptyValues(), [{ id: 1, text: '' }]),
  );
  const nextParagraphId = useRef(2);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [hadProfile, setHadProfile] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reloadDialogOpen, setReloadDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [paragraphToRemove, setParagraphToRemove] = useState(null);

  const dirty = useMemo(
    () => isDraftDirty(values, paragraphs, snapshot),
    [values, paragraphs, snapshot],
  );

  // The baseline count is the number of non-empty paragraphs in the last saved
  // profile. A save that reduces it removes public content, so it is confirmed.
  const savedParagraphCount = useMemo(
    () => snapshot.paragraphs.filter((text) => text.trim().length > 0).length,
    [snapshot],
  );
  const draftParagraphCount = useMemo(
    () => paragraphs.filter((paragraph) => paragraph.text.trim().length > 0).length,
    [paragraphs],
  );

  const blocker = useBlocker(() => dirty && !submitting);

  useEffect(() => {
    if (!dirty || submitting) {
      return undefined;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty, submitting]);

  const applyProfile = useCallback((profile) => {
    const nextValues = valuesFromProfile(profile);
    const bio = Array.isArray(profile?.bio) ? profile.bio.filter((p) => typeof p === 'string') : [];
    const nextParagraphs =
      bio.length > 0
        ? bio.map((text) => ({ id: nextParagraphId.current++, text }))
        : [{ id: 0, text: '' }];

    setValues(nextValues);
    setParagraphs(nextParagraphs);
    setSnapshot(draftSnapshot(nextValues, nextParagraphs));
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
    if (dirty) {
      setReloadDialogOpen(true);
      return;
    }
    setStatus('loading');
    load();
  }

  function confirmReload() {
    setReloadDialogOpen(false);
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

  function trimmedParagraphs() {
    return paragraphs
      .map((paragraph) => paragraph.text.trim())
      .filter((text) => text.length > 0);
  }

  function requestRemoveParagraph(id) {
    setParagraphToRemove(id);
  }

  function confirmRemoveParagraph() {
    const id = paragraphToRemove;
    setParagraphToRemove(null);
    if (id === null) return;
    setParagraphs((previous) => previous.filter((paragraph) => paragraph.id !== id));
  }

  function confirmDiscardChanges() {
    setDiscardDialogOpen(false);

    // The snapshot stores paragraph text rather than editor ids, so rebuilding
    // the rows here gives each restored paragraph a fresh, stable id.
    const restoredParagraphs =
      snapshot.paragraphs.length > 0
        ? snapshot.paragraphs.map((text) => ({
            id: nextParagraphId.current++,
            text,
          }))
        : [{ id: nextParagraphId.current++, text: '' }];

    setValues({ ...snapshot.values });
    setParagraphs(restoredParagraphs);
    setFieldErrors({});
    setFormError(null);
    setNotice({ tone: 'success', message: 'Unsaved changes were discarded.' });
  }

  async function saveProfile(trimmed) {
    setSubmitting(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        headline: values.headline.trim(),
        intro: values.intro.trim(),
        bio: trimmed,
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
          focusProfileErrors(mapped);
        }
        setFormError(formMessage ?? describeError(requestError, 'We could not save your profile.'));
      } else {
        setFormError(describeError(requestError, 'We could not save your profile. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const trimmed = trimmedParagraphs();
    const errors = validate(values, trimmed);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields and try again.');
      focusProfileErrors(errors);
      return;
    }

    // Removing existing content is destructive even though it is only a form
    // edit, so confirm before the request reduces the saved paragraph count.
    if (trimmed.length < savedParagraphCount) {
      setSaveDialogOpen(true);
      return;
    }

    await saveProfile(trimmed);
  }

  async function confirmReducedSave() {
    setSaveDialogOpen(false);

    const trimmed = trimmedParagraphs();
    const errors = validate(values, trimmed);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields and try again.');
      focusProfileErrors(errors);
      return;
    }

    await saveProfile(trimmed);
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
          <p className="mt-1 text-xs text-muted">
            Leave bio blank to hide it. It will no longer show the default fallback text.
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
                    aria-invalid={Boolean(
                      fieldErrors.bio && paragraph.text.trim().length > 2000,
                    )}
                  />
                  {paragraphs.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => requestRemoveParagraph(paragraph.id)}
                      className="mt-1 inline-flex min-h-[44px] items-center text-xs font-semibold text-[#8f1d15] underline decoration-transparent underline-offset-2 transition-ui hover:decoration-current"
                    >
                      Remove paragraph {index + 1}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {fieldErrors.bio ? (
            <p id="profile-bio-error" className={fieldErrorClass}>
              {fieldErrors.bio}
            </p>
          ) : null}

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

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDiscardDialogOpen(true)}
            disabled={!dirty || submitting}
          >
            Discard changes
          </Button>
          <Button type="submit" variant="solid" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>

      {paragraphToRemove !== null ? (
        <ConfirmDialog
          title="Remove this paragraph?"
          message="This paragraph will be removed from the biography. You can still cancel or discard your changes before saving."
          confirmLabel="Remove paragraph"
          busyLabel="Removing…"
          busy={false}
          onCancel={() => setParagraphToRemove(null)}
          onConfirm={confirmRemoveParagraph}
        />
      ) : null}

      {discardDialogOpen ? (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message={UNSAVED_PROFILE_MESSAGE}
          confirmLabel="Discard changes"
          busyLabel="Discarding…"
          busy={false}
          onCancel={() => setDiscardDialogOpen(false)}
          onConfirm={confirmDiscardChanges}
        />
      ) : null}

      {saveDialogOpen ? (
        <ConfirmDialog
          title="Save with fewer paragraphs?"
          message={`This save will reduce the biography from ${savedParagraphCount} ${
            savedParagraphCount === 1 ? 'paragraph' : 'paragraphs'
          } to ${draftParagraphCount}. The removed ${
            savedParagraphCount - draftParagraphCount === 1 ? 'paragraph' : 'paragraphs'
          } will no longer appear in the public About section.`}
          confirmLabel="Save profile"
          busyLabel="Saving…"
          busy={false}
          onCancel={() => setSaveDialogOpen(false)}
          onConfirm={confirmReducedSave}
        />
      ) : null}

      {reloadDialogOpen ? (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message={UNSAVED_PROFILE_MESSAGE}
          confirmLabel="Discard changes"
          busyLabel="Discarding…"
          busy={false}
          onCancel={() => setReloadDialogOpen(false)}
          onConfirm={confirmReload}
        />
      ) : null}

      {blocker.state === 'blocked' ? (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="Your profile edits have not been saved. Leaving this page will discard them."
          confirmLabel="Discard changes"
          busyLabel="Discarding…"
          busy={false}
          onCancel={() => blocker.reset?.()}
          onConfirm={() => blocker.proceed?.()}
        />
      ) : null}
    </div>
  );
}
