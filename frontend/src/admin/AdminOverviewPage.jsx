import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOverview } from './adminApi.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import { AdminErrorState, AdminLoading, describeError } from './AdminUi.jsx';

const CARDS = [
  { key: 'totalProjects', label: 'Total projects', hint: 'Everything in the database' },
  { key: 'publishedProjects', label: 'Published', hint: 'Visible on the public site' },
  { key: 'unpublishedProjects', label: 'Unpublished', hint: 'Hidden from the public site' },
  { key: 'totalSkillGroups', label: 'Skill groups', hint: 'Groups shown in About' },
  { key: 'unreadContactMessages', label: 'Unread messages', hint: 'New contact form messages' },
];

export default function AdminOverviewPage() {
  const { markUnauthenticated } = useAdminAuth();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(
    async (signal) => {
      setState((previous) => ({ ...previous, status: 'loading', error: null }));
      try {
        const data = await fetchOverview({ signal });
        setState({ status: 'ready', data, error: null });
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
        if (error?.status === 401) {
          markUnauthenticated();
          return;
        }
        setState({ status: 'error', data: null, error });
      }
    },
    [markUnauthenticated],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (state.status === 'loading') {
    return <AdminLoading label="Loading overview…" />;
  }

  if (state.status === 'error') {
    return (
      <AdminErrorState
        title="We could not load the overview"
        message={describeError(state.error, 'We could not load the overview. Please try again.')}
        onRetry={() => load()}
      />
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Overview</h1>
        <p className="mt-1.5 text-sm text-muted">
          A snapshot of what is currently stored in the database.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <li key={card.key} className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">
              {state.data?.[card.key] ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-base font-semibold text-ink">Manage projects</h2>
        <p className="mt-1.5 text-sm text-muted">
          Create, edit, publish, or delete the projects shown in the portfolio&rsquo;s work section.
        </p>
        <Link
          to="/admin/projects"
          className="mt-4 inline-flex min-h-[40px] items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition-ui hover:bg-accent"
        >
          Go to projects
        </Link>
      </section>
    </div>
  );
}
