import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../components/Button.jsx';
import { useAdminAuth } from './AdminAuthContext.jsx';
import {
  AdminErrorState,
  AdminLoading,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Notice,
  PageHeader,
  dangerButtonClass,
  describeError,
  fieldErrorClass,
  hintClass,
  inputClass,
  labelClass,
} from './AdminUi.jsx';
import { buildPayload, emptyValues, validateFields, valuesFromItem } from './resourceForm.js';

/** Maps server-side field messages onto the local field keys. */
function mapServerFields(fields) {
  if (!fields || typeof fields !== 'object') {
    return { mapped: {}, formMessage: null };
  }

  const mapped = {};
  let formMessage = null;

  for (const [key, message] of Object.entries(fields)) {
    if (key === 'form' || typeof message !== 'string' || message.length === 0) {
      formMessage ??= typeof message === 'string' ? message : null;
      continue;
    }
    mapped[key] = message;
  }

  return { mapped, formMessage };
}

function FieldControl({ config, field, value, error, onChange }) {
  const id = `resource-${config.key}-${field.name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : field.hint ? hintId : undefined;

  if (field.type === 'textarea') {
    return (
      <textarea
        id={id}
        className={inputClass}
        value={value}
        rows={field.rows ?? 3}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
    );
  }

  let inputType = 'text';
  let extra = {};
  if (field.type === 'number' || field.type === 'year') {
    inputType = 'number';
    extra = {
      min: field.type === 'year' ? 1950 : field.min,
      max: field.type === 'year' ? 2100 : field.max,
      step: 1,
      inputMode: 'numeric',
    };
  } else if (field.type === 'url') {
    inputType = 'url';
    extra = { inputMode: 'url', spellCheck: 'false' };
  }

  return (
    <input
      id={id}
      type={inputType}
      className={inputClass}
      value={value}
      maxLength={field.maxLength}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
      {...extra}
    />
  );
}

/** Create/edit dialog for one record of a collection. */
function ResourceFormDialog({ config, mode, item, onClose, onSaved, onUnauthorized }) {
  const isEdit = mode === 'edit';
  const initialValues = useMemo(
    () => (isEdit ? valuesFromItem(config.fields, item) : emptyValues(config.fields)),
    [config, isEdit, item],
  );

  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  );

  function update(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  function requestClose() {
    if (submitting) {
      return;
    }
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const clientErrors = validateFields(config.fields, values, config.crossValidate);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = buildPayload(config.fields, values);
      const saved = isEdit
        ? await config.api.update(item.id, payload)
        : await config.api.create(payload);
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
      setFormError(
        formMessage ?? describeError(error, `We could not save the ${config.singular}. Please try again.`),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (discardOpen) {
    return (
      <ConfirmDialog
        title="Discard unsaved changes?"
        message={`Your ${config.singular} edits have not been saved. Leaving this form will discard them.`}
        confirmLabel="Discard changes"
        busyLabel="Discarding…"
        busy={false}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
      />
    );
  }

  const headingId = `resource-${config.key}-heading`;

  return (
    <Dialog labelledBy={headingId} busy={submitting} onClose={requestClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div>
          <h2 id={headingId} className="text-lg font-semibold tracking-[-0.02em] text-ink">
            {isEdit ? `Edit ${config.singular}` : config.addLabel}
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
          {config.fields.map((field, index) => (
            <div key={field.name} className={field.span === 2 ? 'sm:col-span-2' : undefined}>
              <label className={labelClass} htmlFor={`resource-${config.key}-${field.name}`}>
                {field.label}
                {field.required ? <span className="text-[#b3261e]"> *</span> : null}
              </label>
              <FieldControl
                config={config}
                field={field}
                value={values[field.name]}
                error={fieldErrors[field.name]}
                onChange={(value) => update(field.name, value)}
              />
              {fieldErrors[field.name] ? (
                <p id={`resource-${config.key}-${field.name}-error`} className={fieldErrorClass}>
                  {fieldErrors[field.name]}
                </p>
              ) : field.hint ? (
                <p id={`resource-${config.key}-${field.name}-hint`} className={hintClass}>
                  {field.hint}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={requestClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" disabled={submitting}>
            {submitting
              ? 'Saving…'
              : isEdit
                ? `Save ${config.singular}`
                : config.addLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Shared list + create/edit/delete/reorder manager for an ordered collection.
 */
export default function ResourceManager({ config }) {
  const { markUnauthenticated } = useAdminAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [movingId, setMovingId] = useState(null);

  const load = useCallback(
    async (signal, { silent = false } = {}) => {
      try {
        const list = await config.api.list({ signal });
        setItems(list);
        setStatus('ready');
        setError(null);
      } catch (requestError) {
        if (requestError?.name === 'AbortError') {
          return;
        }
        if (requestError?.status === 401) {
          markUnauthenticated();
          return;
        }
        if (silent) {
          setNotice({
            tone: 'error',
            message: describeError(requestError, `We could not refresh the ${config.plural}.`),
          });
          return;
        }
        setStatus('error');
        setError(requestError);
      }
    },
    [config, markUnauthenticated],
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

  async function handleMove(item, direction) {
    if (movingId || busyId) {
      return;
    }

    const index = items.findIndex((entry) => entry.id === item.id);
    const target = items[index + direction];
    if (!target) {
      return;
    }

    setMovingId(item.id);
    setNotice(null);
    try {
      if (item.order === target.order) {
        // Equal orders: give the departing record the next slot so the moving
        // record ends up strictly before/after it.
        if (direction < 0) {
          await config.api.update(target.id, { order: target.order + 1 });
        } else {
          await config.api.update(item.id, { order: target.order + 1 });
        }
      } else {
        await config.api.update(item.id, { order: target.order });
        await config.api.update(target.id, { order: item.order });
      }
      await load(undefined, { silent: true });
    } catch (requestError) {
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      setNotice({
        tone: 'error',
        message: describeError(requestError, `We could not reorder the ${config.plural}.`),
      });
    } finally {
      setMovingId(null);
    }
  }

  async function handleDelete() {
    const target = deleteTarget;
    if (!target || busyId) {
      return;
    }

    setBusyId(target.id);
    try {
      await config.api.remove(target.id);
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `${config.primary(target)} was deleted.` });
      await load(undefined, { silent: true });
    } catch (requestError) {
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      setDeleteTarget(null);
      setNotice({
        tone: 'error',
        message: describeError(requestError, `We could not delete that ${config.singular}.`),
      });
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(saved, mode) {
    setDialog(null);
    setNotice({
      tone: 'success',
      message:
        mode === 'edit'
          ? `${config.primary(saved)} was updated.`
          : `${config.primary(saved)} was created.`,
    });
    load(undefined, { silent: true });
  }

  return (
    <div>
      <PageHeader title={config.title} description={config.description}>
        <Button
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={status === 'loading'}
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </Button>
        <Button
          variant="solid"
          size="sm"
          onClick={() => setDialog({ mode: 'create' })}
          disabled={Boolean(busyId) || Boolean(movingId)}
        >
          {config.addLabel}
        </Button>
      </PageHeader>

      {notice ? (
        <div className="mb-5">
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.message}
          </Notice>
        </div>
      ) : null}

      {status === 'loading' ? (
        <AdminLoading label={`Loading ${config.plural}…`} />
      ) : status === 'error' ? (
        <AdminErrorState
          title={`We could not load your ${config.plural}`}
          message={describeError(error, `We could not load your ${config.plural}. Please try again.`)}
          onRetry={reload}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={config.emptyTitle}
          message={config.emptyMessage}
          action={
            <Button
              variant="solid"
              size="sm"
              onClick={() => setDialog({ mode: 'create' })}
              disabled={Boolean(busyId) || Boolean(movingId)}
            >
              {config.addLabel}
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => {
            const label = config.primary(item);
            const secondary = config.secondary ? config.secondary(item) : '';
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-line bg-surface p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-ink">{label}</h2>
                    <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-muted">
                      Order {item.order}
                    </span>
                  </div>
                  {secondary ? <p className="mt-1.5 text-sm text-muted">{secondary}</p> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0 sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMove(item, -1)}
                    disabled={index === 0 || Boolean(movingId) || Boolean(busyId)}
                    aria-label={`Move ${label} up`}
                  >
                    Move up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMove(item, 1)}
                    disabled={index === items.length - 1 || Boolean(movingId) || Boolean(busyId)}
                    aria-label={`Move ${label} down`}
                  >
                    Move down
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialog({ mode: 'edit', item })}
                    disabled={Boolean(busyId) || Boolean(movingId)}
                  >
                    Edit
                  </Button>
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => setDeleteTarget(item)}
                    disabled={Boolean(busyId) || Boolean(movingId)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog ? (
        <ResourceFormDialog
          config={config}
          mode={dialog.mode}
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
          onUnauthorized={markUnauthenticated}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete this ${config.singular}?`}
          message={`${config.primary(deleteTarget)} will be permanently removed from MongoDB. This cannot be undone.`}
          confirmLabel={`Delete ${config.singular}`}
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
