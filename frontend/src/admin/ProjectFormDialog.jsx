import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../components/Button.jsx';
import { createProject, updateProject } from './adminApi.js';
import { Notice, describeError, fieldErrorClass, inputClass, labelClass } from './AdminUi.jsx';
import { formatTechnologies, parseTechnologies, slugify } from './projectForm.js';

const ARTWORK_OPTIONS = [
  { value: 'hostelcare', label: 'HostelCare — workflow illustration' },
  { value: 'aquapredict', label: 'AquaPredict — diagram illustration' },
  { value: 'expense', label: 'Expense tracker — flow illustration' },
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TECHNOLOGY_MAX = 40;
const ALLOWED_SERVER_FIELDS = new Set([
  'title',
  'slug',
  'category',
  'summary',
  'description',
  'technologies',
  'repoUrl',
  'demoUrl',
  'featured',
  'artwork',
  'order',
  'published',
]);

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function emptyValues() {
  return {
    title: '',
    slug: '',
    category: '',
    summary: '',
    description: '',
    technologies: '',
    repoUrl: '',
    demoUrl: '',
    featured: false,
    artwork: ARTWORK_OPTIONS[0].value,
    order: '0',
    published: true,
  };
}

function valuesFromProject(project) {
  return {
    title: project.title ?? '',
    slug: project.slug ?? '',
    category: project.category ?? '',
    summary: project.summary ?? '',
    description: project.description ?? '',
    technologies: formatTechnologies(project.technologies),
    repoUrl: project.repoUrl ?? '',
    demoUrl: project.demoUrl ?? '',
    featured: Boolean(project.featured),
    artwork: project.artwork ?? ARTWORK_OPTIONS[0].value,
    order: String(project.order ?? 0),
    published: Boolean(project.published),
  };
}

/** Mirrors the server contract for fast feedback; the server stays authoritative. */
function validate(values) {
  const errors = {};
  const title = values.title.trim();
  const slug = values.slug.trim().toLowerCase();
  const technologies = parseTechnologies(values.technologies);

  if (title.length === 0) errors.title = 'Enter a project title.';
  else if (title.length > 140) errors.title = 'Title must be 140 characters or fewer.';

  if (slug.length === 0) errors.slug = 'Enter a slug.';
  else if (slug.length > 120) errors.slug = 'Slug must be 120 characters or fewer.';
  else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = 'Use lowercase letters, numbers, and single hyphens.';
  }

  if (values.category.trim().length > 80) errors.category = 'Category must be 80 characters or fewer.';
  if (values.summary.trim().length > 300) errors.summary = 'Summary must be 300 characters or fewer.';
  if (values.description.trim().length > 2000) {
    errors.description = 'Description must be 2000 characters or fewer.';
  }

  if (technologies.length === 0) errors.technologies = 'Add at least one technology.';
  else if (technologies.length > 30) errors.technologies = 'Use 30 technologies or fewer.';
  else if (technologies.some((item) => item.length > TECHNOLOGY_MAX)) {
    errors.technologies = `Each technology must be ${TECHNOLOGY_MAX} characters or fewer.`;
  }

  if (!isHttpUrl(values.repoUrl.trim())) {
    errors.repoUrl = 'Enter a valid http or https repository URL.';
  }

  if (values.demoUrl.trim().length > 0 && !isHttpUrl(values.demoUrl.trim())) {
    errors.demoUrl = 'Enter a valid http or https demo URL, or leave it blank.';
  }

  const order = Number(values.order);
  if (!Number.isInteger(order) || order < 0) {
    errors.order = 'Enter a whole number of 0 or more.';
  }

  return errors;
}

function buildPayload(values) {
  return {
    title: values.title.trim(),
    slug: values.slug.trim().toLowerCase(),
    category: values.category.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    technologies: parseTechnologies(values.technologies),
    repoUrl: values.repoUrl.trim(),
    demoUrl: values.demoUrl.trim(),
    featured: values.featured,
    artwork: values.artwork,
    order: Number(values.order),
    published: values.published,
  };
}

function mapServerFields(fields) {
  const mapped = {};
  let formMessage;

  for (const [key, message] of Object.entries(fields ?? {})) {
    if (typeof message !== 'string' || message.length === 0) {
      continue;
    }
    if (key === 'form') {
      formMessage ??= message;
      continue;
    }
    if (ALLOWED_SERVER_FIELDS.has(key)) {
      mapped[key] ??= message;
    }
  }

  return { mapped, formMessage };
}

function FieldError({ id, message }) {
  if (!message) {
    return null;
  }
  return (
    <p className={fieldErrorClass} id={id}>
      {message}
    </p>
  );
}

/**
 * Create/edit dialog for a project. All data is written through the protected
 * admin API; the public site picks up changes on its next page load.
 */
export default function ProjectFormDialog({ mode, project, onClose, onSaved, onUnauthorized }) {
  const isEdit = mode === 'edit';
  const initialValues = useMemo(
    () => (isEdit ? valuesFromProject(project) : emptyValues()),
    [isEdit, project],
  );

  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef(null);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  );

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function update(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function requestClose() {
    if (submitting) {
      return;
    }
    if (dirty && !window.confirm('Discard your unsaved changes?')) {
      return;
    }
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const clientErrors = validate(values);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = buildPayload(values);
      const saved = isEdit
        ? await updateProject(project.id, payload)
        : await createProject(payload);
      onSaved(saved, mode);
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      if (error?.status === 401) {
        onUnauthorized();
        return;
      }
      const { mapped, formMessage } = mapServerFields(error?.fields);
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
      }
      setFormError(formMessage ?? describeError(error, 'We could not save the project. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      requestClose();
    }
  }

  const headingId = 'project-form-heading';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 px-4 py-8 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-busy={submitting}
        onKeyDown={handleKeyDown}
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id={headingId} className="text-lg font-semibold tracking-[-0.02em] text-ink">
              {isEdit ? 'Edit project' : 'Add project'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Changes are saved to MongoDB and appear on the public site after it reloads.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-muted transition-ui hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5">
          {formError ? (
            <div className="mb-5">
              <Notice tone="error">{formError}</Notice>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="project-title">
                Title
              </label>
              <input
                ref={titleRef}
                id="project-title"
                className={inputClass}
                value={values.title}
                onChange={(event) => update('title', event.target.value)}
                maxLength={140}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'project-title-error' : undefined}
              />
              <FieldError id="project-title-error" message={fieldErrors.title} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="project-slug">
                Slug
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="project-slug"
                  className={inputClass}
                  value={values.slug}
                  onChange={(event) => update('slug', event.target.value)}
                  maxLength={120}
                  spellCheck="false"
                  aria-invalid={Boolean(fieldErrors.slug)}
                  aria-describedby={fieldErrors.slug ? 'project-slug-error' : 'project-slug-hint'}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => update('slug', slugify(values.title))}
                >
                  Use title
                </Button>
              </div>
              {fieldErrors.slug ? (
                <FieldError id="project-slug-error" message={fieldErrors.slug} />
              ) : (
                <p className="mt-1 text-xs text-muted" id="project-slug-hint">
                  Lowercase words separated by hyphens, e.g. <code>hostelcare-portal</code>.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="project-category">
                Category
              </label>
              <input
                id="project-category"
                className={inputClass}
                value={values.category}
                onChange={(event) => update('category', event.target.value)}
                maxLength={80}
              />
              <FieldError id="project-category-error" message={fieldErrors.category} />
            </div>

            <div>
              <label className={labelClass} htmlFor="project-order">
                Display order
              </label>
              <input
                id="project-order"
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={values.order}
                onChange={(event) => update('order', event.target.value)}
                aria-invalid={Boolean(fieldErrors.order)}
                aria-describedby={fieldErrors.order ? 'project-order-error' : undefined}
              />
              <FieldError id="project-order-error" message={fieldErrors.order} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="project-summary">
                Summary
              </label>
              <textarea
                id="project-summary"
                rows={2}
                maxLength={300}
                className={inputClass}
                value={values.summary}
                onChange={(event) => update('summary', event.target.value)}
              />
              <FieldError id="project-summary-error" message={fieldErrors.summary} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="project-description">
                Description
              </label>
              <textarea
                id="project-description"
                rows={5}
                maxLength={2000}
                className={inputClass}
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
              />
              <FieldError id="project-description-error" message={fieldErrors.description} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="project-technologies">
                Technologies
              </label>
              <input
                id="project-technologies"
                className={inputClass}
                value={values.technologies}
                onChange={(event) => update('technologies', event.target.value)}
                placeholder="React, Express, MongoDB"
                aria-invalid={Boolean(fieldErrors.technologies)}
                aria-describedby="project-technologies-hint"
              />
              <p className="mt-1 text-xs text-muted" id="project-technologies-hint">
                Separate technologies with commas.
              </p>
              <FieldError id="project-technologies-error" message={fieldErrors.technologies} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="project-repo">
                Repository URL
              </label>
              <input
                id="project-repo"
                type="url"
                className={inputClass}
                value={values.repoUrl}
                onChange={(event) => update('repoUrl', event.target.value)}
                placeholder="https://github.com/…"
                aria-invalid={Boolean(fieldErrors.repoUrl)}
                aria-describedby={fieldErrors.repoUrl ? 'project-repo-error' : undefined}
              />
              <FieldError id="project-repo-error" message={fieldErrors.repoUrl} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="project-demo">
                Demo URL <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="project-demo"
                type="url"
                className={inputClass}
                value={values.demoUrl}
                onChange={(event) => update('demoUrl', event.target.value)}
                placeholder="Leave blank if there is no live demo"
                aria-invalid={Boolean(fieldErrors.demoUrl)}
                aria-describedby={fieldErrors.demoUrl ? 'project-demo-error' : undefined}
              />
              <FieldError id="project-demo-error" message={fieldErrors.demoUrl} />
            </div>

            <div>
              <label className={labelClass} htmlFor="project-artwork">
                Illustration
              </label>
              <select
                id="project-artwork"
                className={inputClass}
                value={values.artwork}
                onChange={(event) => update('artwork', event.target.value)}
              >
                {ARTWORK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError id="project-artwork-error" message={fieldErrors.artwork} />
            </div>

            <div className="flex flex-col justify-end gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  className="size-4 rounded border-line text-accent"
                  checked={values.featured}
                  onChange={(event) => update('featured', event.target.checked)}
                />
                Featured project
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  className="size-4 rounded border-line text-accent"
                  checked={values.published}
                  onChange={(event) => update('published', event.target.checked)}
                />
                Published on the public site
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={requestClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
