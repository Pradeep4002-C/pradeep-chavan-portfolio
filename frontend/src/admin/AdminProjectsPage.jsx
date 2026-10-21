import { useCallback, useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import { deleteProject, fetchProjects, updateProject } from './adminApi.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import { AdminErrorState, AdminLoading, Notice, describeError } from './AdminUi.jsx';
import ProjectFormDialog from './ProjectFormDialog.jsx';

const dangerButtonClass =
  'inline-flex min-h-[38px] items-center justify-center rounded-full border border-[#e0a9a3] px-3.5 text-[0.84rem] font-semibold text-[#8f1d15] transition-ui hover:border-[#8f1d15] hover:bg-[#fdf1f0] disabled:cursor-not-allowed disabled:opacity-60';

function TechnologySummary({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-muted">—</span>;
  }
  const shown = items.slice(0, 4).join(', ');
  const extra = items.length - 4;
  return (
    <span>
      {shown}
      {extra > 0 ? ` +${extra}` : ''}
    </span>
  );
}

function StatusBadge({ published }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        published ? 'bg-[#eef8f1] text-[#1f6f43]' : 'bg-sunken text-muted'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

function ConfirmDialog({ title, message, confirmLabel, busy, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-heading"
        aria-describedby="confirm-message"
        aria-busy={busy}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) {
            onCancel();
          }
        }}
      >
        <h2 id="confirm-heading" className="text-lg font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        <p id="confirm-message" className="mt-2 text-sm text-muted">
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button autoFocus type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <button type="button" className={dangerButtonClass} onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProjectsPage() {
  const { markUnauthenticated } = useAdminAuth();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    async (signal, { silent = false } = {}) => {
      try {
        const list = await fetchProjects({ signal });
        setProjects(list);
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
            message: describeError(requestError, 'We could not refresh the project list.'),
          });
          return;
        }
        setStatus('error');
        setError(requestError);
      }
    },
    [markUnauthenticated],
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

  async function handleTogglePublished(project) {
    if (busyId) {
      return;
    }
    setBusyId(project.id);
    setNotice(null);
    try {
      const updated = await updateProject(project.id, { published: !project.published });
      setNotice({
        tone: 'success',
        message: updated.published
          ? `“${updated.title}” is now published.`
          : `“${updated.title}” is now unpublished.`,
      });
      await load(undefined, { silent: true });
    } catch (requestError) {
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      setNotice({
        tone: 'error',
        message: describeError(requestError, 'We could not change the published state.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    const project = deleteTarget;
    if (!project || busyId) {
      return;
    }
    setBusyId(project.id);
    try {
      await deleteProject(project.id);
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `“${project.title}” was deleted.` });
      await load(undefined, { silent: true });
    } catch (requestError) {
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      setDeleteTarget(null);
      setNotice({
        tone: 'error',
        message: describeError(requestError, 'We could not delete that project.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(saved, mode) {
    setDialog(null);
    setNotice({
      tone: 'success',
      message: mode === 'edit' ? `“${saved.title}” was updated.` : `“${saved.title}” was created.`,
    });
    load(undefined, { silent: true });
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Projects</h1>
          <p className="mt-1.5 text-sm text-muted">
            Create, edit, publish, and delete the projects stored in MongoDB.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={status === 'loading'}>
            Refresh
          </Button>
          <Button variant="solid" size="sm" onClick={() => setDialog({ mode: 'create' })}>
            Add project
          </Button>
        </div>
      </header>

      {notice ? (
        <div className="mb-5">
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.message}
          </Notice>
        </div>
      ) : null}

      {status === 'loading' ? (
        <AdminLoading label="Loading projects…" />
      ) : status === 'error' ? (
        <AdminErrorState
          title="We could not load your projects"
          message={describeError(error, 'We could not load your projects. Please try again.')}
          onRetry={reload}
        />
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
          <h2 className="text-base font-semibold text-ink">No projects yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            Add your first project to make it available to the portfolio&rsquo;s work section.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="solid" size="sm" onClick={() => setDialog({ mode: 'create' })}>
              Add project
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">All portfolio projects</caption>
              <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Technologies
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Featured
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Order
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">{project.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">{project.slug}</p>
                      {project.category ? (
                        <p className="mt-0.5 text-xs text-muted">{project.category}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      <TechnologySummary items={project.technologies} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge published={project.published} />
                    </td>
                    <td className="px-4 py-3.5 text-muted">{project.featured ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3.5 text-muted">{project.order}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDialog({ mode: 'edit', project })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePublished(project)}
                          disabled={busyId === project.id}
                        >
                          {project.published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <button
                          type="button"
                          className={dangerButtonClass}
                          onClick={() => setDeleteTarget(project)}
                          disabled={busyId === project.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {projects.map((project) => (
              <li key={project.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{project.title}</p>
                    <p className="mt-0.5 break-all font-mono text-xs text-muted">{project.slug}</p>
                  </div>
                  <StatusBadge published={project.published} />
                </div>
                {project.category ? (
                  <p className="mt-2 text-xs text-muted">{project.category}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  <TechnologySummary items={project.technologies} />
                </p>
                <p className="mt-1 text-xs text-muted">
                  {project.featured ? 'Featured' : 'Not featured'} · Order {project.order}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialog({ mode: 'edit', project })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePublished(project)}
                    disabled={busyId === project.id}
                  >
                    {project.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => setDeleteTarget(project)}
                    disabled={busyId === project.id}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog ? (
        <ProjectFormDialog
          mode={dialog.mode}
          project={dialog.project}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
          onUnauthorized={markUnauthenticated}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this project?"
          message={`“${deleteTarget.title}” will be permanently removed from MongoDB. This cannot be undone.`}
          confirmLabel="Delete project"
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
