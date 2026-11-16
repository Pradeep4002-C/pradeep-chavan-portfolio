import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { focusFirstError } from '../components/formFocus.js';
import ProjectArtwork from '../components/ProjectArtwork.jsx';
import { createProject, fetchProject, updateProject } from './adminApi.js';
import { ADMIN_AUTH_STATUS, useAdminAuth } from './AdminAuthContext.jsx';
import { clearDraft, saveDraft, takeDraft } from './draftStorage.js';
import {
  AdminErrorState,
  AdminLoading,
  ConfirmDialog,
  Notice,
  describeError,
  fieldErrorClass,
  hintClass,
  inputClass,
  labelClass,
} from './AdminUi.jsx';
import WorkflowStepBuilder from './WorkflowStepBuilder.jsx';
import {
  ARTWORK_OPTIONS,
  PROJECT_LIMITS,
  buildProjectPayload,
  emptyProjectValues,
  slugify,
  validateProject,
  valuesFromProject,
} from './projectForm.js';

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
  'workflow',
  'order',
  'published',
]);

const PROJECT_ERROR_ORDER = [
  'title',
  'slug',
  'category',
  'summary',
  'description',
  'technologies',
  'repoUrl',
  'demoUrl',
  'order',
  'artwork',
  'workflow',
];

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

function Section({ title, description, children, labelledBy }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id={labelledBy} className="text-base font-semibold text-ink">
        {title}
      </h2>
      {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Dedicated, page-scrolling project editor. Unlike the previous modal, this
 * page has no fixed height or clipped overflow: every field and the save bar
 * are reachable through the normal document scroll.
 */
export default function ProjectEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { markUnauthenticated, status: authStatus } = useAdminAuth();
  const draftKey = isEdit ? `project:${id}` : 'project:new';

  const [values, setValues] = useState(emptyProjectValues);
  const [initialValues, setInitialValues] = useState(emptyProjectValues);
  const [status, setStatus] = useState(isEdit ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const allowNavigation = useRef(false);
  // State updates are asynchronous; this ref blocks duplicate same-tick submits.
  const submittingRef = useRef(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const persistDraft = useCallback(() => {
    saveDraft(draftKey, { values: { ...valuesRef.current } });
  }, [draftKey]);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  );

  const blocker = useBlocker(
    () =>
      dirty &&
      !allowNavigation.current &&
      !submitting &&
      authStatus === ADMIN_AUTH_STATUS.authenticated,
  );

  // Preserve typed work when the session ends for any reason, including a
  // sign-out broadcast from another tab, before the redirect unmounts us.
  useEffect(() => {
    if (authStatus === ADMIN_AUTH_STATUS.unauthenticated && dirty) {
      persistDraft();
    }
  }, [authStatus, dirty, persistDraft]);

  // Save on every edit so a cross-tab sign-out cannot unmount the editor
  // before an auth-transition effect has had a chance to run.
  useEffect(() => {
    if (dirty) {
      persistDraft();
    }
  }, [dirty, values, persistDraft]);

  function discardAndLeave() {
    clearDraft(draftKey);
    blocker.proceed?.();
  }

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

  const load = useCallback(
    async (signal) => {
      function withDraft(baseValues) {
        const draft = takeDraft(draftKey);
        if (!draft || !draft.values || typeof draft.values !== 'object') {
          return baseValues;
        }
        setRestoredDraft(true);
        return { ...baseValues, ...draft.values };
      }

      if (!isEdit) {
        const next = withDraft(emptyProjectValues());
        setValues(next);
        setInitialValues(emptyProjectValues());
        setStatus('ready');
        setLoadError(null);
        return;
      }

      try {
        const project = await fetchProject(id, { signal });
        const base = valuesFromProject(project);
        setValues(withDraft(base));
        setInitialValues(base);
        setStatus('ready');
        setLoadError(null);
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
        if (error?.status === 401) {
          markUnauthenticated('expired');
          return;
        }
        setStatus('error');
        setLoadError(error);
      }
    },
    [draftKey, id, isEdit, markUnauthenticated],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function update(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function focusProjectError(errors) {
    focusFirstError(errors, PROJECT_ERROR_ORDER, (key) =>
      document.getElementById(key === 'workflow' ? 'project-workflow-section' : `project-${key}`),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    const clientErrors = validateProject(values);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setFormError('Please fix the highlighted fields and try again.');
      focusProjectError(clientErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = buildProjectPayload(values);
      const saved = isEdit ? await updateProject(id, payload) : await createProject(payload);
      clearDraft(draftKey);
      allowNavigation.current = true;
      const savedValues = valuesFromProject(saved);
      setValues(savedValues);
      setInitialValues(savedValues);
      navigate('/admin/projects', {
        replace: true,
        state: {
          notice: {
            tone: 'success',
            message:
              isEdit && saved.title
                ? `“${saved.title}” was updated.`
                : `“${saved.title}” was created.`,
          },
        },
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      if (error?.status === 401) {
        persistDraft();
        allowNavigation.current = true;
        markUnauthenticated('expired');
        return;
      }
      const { mapped, formMessage } = mapServerFields(error?.fields);
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
        focusProjectError(mapped);
      }
      setFormError(
        formMessage ?? describeError(error, 'We could not save the project. Please try again.'),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function cancel() {
    navigate('/admin/projects');
  }

  const heading = isEdit ? 'Edit project' : 'Add project';
  const workflowSelected = values.artwork === 'workflow';

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
          <li>
            <Link
              className="inline-flex min-h-[44px] min-w-[44px] items-center rounded hover:text-accent"
              to="/admin"
            >
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              className="inline-flex min-h-[44px] min-w-[44px] items-center rounded hover:text-accent"
              to="/admin/projects"
            >
              Projects
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {heading}
          </li>
        </ol>
      </nav>

      <header className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{heading}</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted">
              {isEdit
                ? 'Update the saved project. Changes appear on the public portfolio after it reloads.'
                : 'Create a project in MongoDB. Every field below can be reached with normal page scrolling.'}
            </p>
          </div>
          <Link
            to="/admin/projects"
            className="inline-flex min-h-[44px] w-fit items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-ink transition-ui hover:border-accent hover:text-accent"
          >
            Back to projects
          </Link>
        </div>
      </header>

      {status === 'loading' ? <AdminLoading label="Loading project…" /> : null}

      {status === 'error' ? (
        <AdminErrorState
          title={loadError?.status === 404 ? 'Project not found' : 'We could not load this project'}
          message={describeError(loadError, 'We could not load this project. Please try again.')}
          onRetry={() => {
            setStatus('loading');
            load();
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
          {restoredDraft ? (
            <div className="mb-5">
              <Notice tone="success" onDismiss={() => setRestoredDraft(false)}>
                We restored the unsaved draft from before your session ended.
              </Notice>
            </div>
          ) : null}

          {formError ? (
            <div className="mb-5">
              <Notice tone="error">{formError}</Notice>
            </div>
          ) : null}

          <div className="flex flex-col gap-5">
            <Section
              labelledBy="project-basic-heading"
              title="Basic information"
              description="The title and slug identify the project in the portfolio and in the database."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="project-title">
                    Title <span className="text-[#b3261e]">*</span>
                  </label>
                  <input
                    id="project-title"
                    className={inputClass}
                    value={values.title}
                    onChange={(event) => update('title', event.target.value)}
                    maxLength={PROJECT_LIMITS.titleMax}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? 'project-title-error' : undefined}
                  />
                  <FieldError id="project-title-error" message={fieldErrors.title} />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="project-slug">
                    Slug <span className="text-[#b3261e]">*</span>
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="project-slug"
                      className={inputClass}
                      value={values.slug}
                      onChange={(event) => update('slug', event.target.value)}
                      maxLength={PROJECT_LIMITS.slugMax}
                      spellCheck="false"
                      aria-invalid={Boolean(fieldErrors.slug)}
                      aria-describedby={
                        fieldErrors.slug ? 'project-slug-error' : 'project-slug-hint'
                      }
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
                    maxLength={PROJECT_LIMITS.categoryMax}
                    aria-invalid={Boolean(fieldErrors.category)}
                    aria-describedby={
                      fieldErrors.category ? 'project-category-error' : undefined
                    }
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
                    max={PROJECT_LIMITS.orderMax}
                    step="1"
                    className={inputClass}
                    value={values.order}
                    onChange={(event) => update('order', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.order)}
                    aria-describedby={fieldErrors.order ? 'project-order-error' : undefined}
                  />
                  <FieldError id="project-order-error" message={fieldErrors.order} />
                </div>
              </div>
            </Section>

            <Section
              labelledBy="project-description-heading"
              title="Project description"
              description="Keep the summary short; use the description for the problem, approach, and result."
            >
              <div className="grid gap-4">
                <div>
                  <label className={labelClass} htmlFor="project-summary">
                    Summary
                  </label>
                  <textarea
                    id="project-summary"
                    rows={2}
                    maxLength={PROJECT_LIMITS.summaryMax}
                    className={inputClass}
                    value={values.summary}
                    onChange={(event) => update('summary', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.summary)}
                    aria-describedby={fieldErrors.summary ? 'project-summary-error' : undefined}
                  />
                  <FieldError id="project-summary-error" message={fieldErrors.summary} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="project-description">
                    Description
                  </label>
                  <textarea
                    id="project-description"
                    rows={6}
                    maxLength={PROJECT_LIMITS.descriptionMax}
                    className={inputClass}
                    value={values.description}
                    onChange={(event) => update('description', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={
                      fieldErrors.description ? 'project-description-error' : undefined
                    }
                  />
                  <FieldError id="project-description-error" message={fieldErrors.description} />
                </div>
              </div>
            </Section>

            <Section
              labelledBy="project-links-heading"
              title="Technologies and links"
              description="Technologies appear as tags. At least one repository link is required."
            >
              <div className="grid gap-4">
                <div>
                  <label className={labelClass} htmlFor="project-technologies">
                    Technologies <span className="text-[#b3261e]">*</span>
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
                  <p className={hintClass} id="project-technologies-hint">
                    Separate technologies with commas.
                  </p>
                  <FieldError id="project-technologies-error" message={fieldErrors.technologies} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="project-repo">
                    Repository URL <span className="text-[#b3261e]">*</span>
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

                <div>
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
              </div>
            </Section>

            <Section
              labelledBy="project-artwork-heading"
              title="Project artwork"
              description="Choose an existing illustration or draw a diagram from your own workflow steps."
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] lg:items-start">
                <div>
                  <label className={labelClass} htmlFor="project-artwork">
                    Illustration <span className="text-[#b3261e]">*</span>
                  </label>
                  <select
                    id="project-artwork"
                    className={inputClass}
                    value={values.artwork}
                    onChange={(event) => update('artwork', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.artwork)}
                    aria-describedby={
                      fieldErrors.artwork ? 'project-artwork-error' : 'project-artwork-hint'
                    }
                  >
                    {ARTWORK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className={hintClass} id="project-artwork-hint">
                    The first three options are fixed illustrations. “Workflow diagram” uses the
                    steps below and never borrows another project&apos;s drawing.
                  </p>
                  <FieldError id="project-artwork-error" message={fieldErrors.artwork} />
                </div>

                {!workflowSelected ? (
                  <div>
                    <p className={labelClass}>Preview</p>
                    <div className="max-w-md">
                      <ProjectArtwork type={values.artwork} />
                    </div>
                  </div>
                ) : null}
              </div>

              {workflowSelected ? (
                <div className="mt-6 border-t border-line pt-5">
                  <WorkflowStepBuilder
                    steps={values.workflowSteps}
                    onChange={(workflowSteps) => update('workflowSteps', workflowSteps)}
                    error={fieldErrors.workflow}
                  />
                </div>
              ) : null}
            </Section>

            <Section
              labelledBy="project-publication-heading"
              title="Publication"
              description="Published projects appear in the public work section. Draft projects stay in the dashboard."
            >
              <div className="flex flex-col gap-3">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-line accent-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                    checked={values.featured}
                    onChange={(event) => update('featured', event.target.checked)}
                    aria-describedby="project-featured-help"
                  />
                  Featured project
                </label>
                <p id="project-featured-help" className="ml-6 text-xs leading-relaxed text-muted">
                  Note: Only one project can be featured. Checking this will un-feature any
                  currently featured project.
                </p>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-line accent-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                    checked={values.published}
                    onChange={(event) => update('published', event.target.checked)}
                  />
                  Published on the public site
                </label>
              </div>
            </Section>
          </div>

          <div className="sticky bottom-0 z-20 mt-6 rounded-t-2xl border border-line bg-surface/95 px-4 py-3 shadow-[0_-10px_30px_rgba(28,29,27,0.08)] backdrop-blur sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted" aria-live="polite">
                {submitting
                  ? 'Saving to MongoDB…'
                  : dirty
                    ? 'Unsaved changes'
                    : 'No unsaved changes'}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={cancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="solid" disabled={submitting}>
                  {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      {blocker.state === 'blocked' ? (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="Your edits have not been saved. Leaving this page will discard them."
          confirmLabel="Discard changes"
          busyLabel="Discarding…"
          busy={false}
          onCancel={() => blocker.reset?.()}
          onConfirm={discardAndLeave}
        />
      ) : null}
    </div>
  );
}
