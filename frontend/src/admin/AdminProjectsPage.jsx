import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { deleteProject, fetchProjects, updateProject } from './adminApi.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import { AdminErrorState, AdminLoading, ConfirmDialog, EmptyState, Notice, PageHeader, dangerButtonClass, describeError } from './AdminUi.jsx';

function TechnologySummary({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-muted">—</span>;
  }
  const shown = items.slice(0, 4).join(', ');
  const extra = items.length - 4;
  return (
    <span className="[overflow-wrap:anywhere]">
      {shown}
      {extra > 0 ? ` +${extra}` : ''}
    </span>
  );
}

function StatusBadge({ published }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        published ? 'bg-[#eef8f1] text-[#1f6f43]' : 'bg-sunken text-muted'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

export default function AdminProjectsPage() {
  const { markUnauthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice ?? null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // The editor returns a one-time success message through router state. Clear
  // the state after reading it so a later refresh does not repeat old news.
  useEffect(() => {
    if (location.state?.notice) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

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

  function openCreate() {
    navigate('/admin/projects/new');
  }

  function openEdit(project) {
    navigate(`/admin/projects/${encodeURIComponent(project.id)}/edit`);
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Create, edit, publish, and delete the projects stored in MongoDB."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={status === 'loading'}
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </Button>
        <Button variant="solid" size="sm" onClick={openCreate} disabled={Boolean(busyId)}>
          Add project
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
        <AdminLoading label="Loading projects…" />
      ) : status === 'error' ? (
        <AdminErrorState
          title="We could not load your projects"
          message={describeError(error, 'We could not load your projects. Please try again.')}
          onRetry={reload}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Add your first project to make it available to the portfolio’s work section."
          action={
            <Button variant="solid" size="sm" onClick={openCreate} disabled={Boolean(busyId)}>
              Add project
            </Button>
          }
        />
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
                      <p className="font-semibold text-ink [overflow-wrap:anywhere]">{project.title}</p>
                      <p className="mt-0.5 break-all font-mono text-xs text-muted">{project.slug}</p>
                      {project.category ? (
                        <p className="mt-0.5 text-xs text-muted [overflow-wrap:anywhere]">{project.category}</p>
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
                          onClick={() => openEdit(project)}
                          disabled={Boolean(busyId)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-pressed={Boolean(project.published)}
                          onClick={() => handleTogglePublished(project)}
                          disabled={Boolean(busyId)}
                        >
                          {project.published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <button
                          type="button"
                          className={dangerButtonClass}
                          onClick={() => setDeleteTarget(project)}
                          disabled={Boolean(busyId)}
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
                    <p className="font-semibold text-ink [overflow-wrap:anywhere]">{project.title}</p>
                    <p className="mt-0.5 break-all font-mono text-xs text-muted">{project.slug}</p>
                  </div>
                  <StatusBadge published={project.published} />
                </div>
                {project.category ? (
                  <p className="mt-2 text-xs text-muted [overflow-wrap:anywhere]">{project.category}</p>
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
                    onClick={() => openEdit(project)}
                    disabled={Boolean(busyId)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-pressed={Boolean(project.published)}
                    onClick={() => handleTogglePublished(project)}
                    disabled={Boolean(busyId)}
                  >
                    {project.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => setDeleteTarget(project)}
                    disabled={Boolean(busyId)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

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
