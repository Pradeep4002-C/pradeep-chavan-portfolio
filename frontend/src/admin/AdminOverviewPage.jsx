import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOverview } from './adminApi.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import { AdminErrorState, AdminLoading, describeError } from './AdminUi.jsx';

const CARDS = [
  {
    key: 'totalProjects',
    label: 'Total projects',
    hint: 'Everything in the database',
    to: '/admin/projects',
    action: 'Manage projects',
  },
  {
    key: 'publishedProjects',
    label: 'Published',
    hint: 'Visible on the public site',
    to: '/admin/projects',
    action: 'Review published',
  },
  {
    key: 'unpublishedProjects',
    label: 'Unpublished',
    hint: 'Hidden from the public site',
    to: '/admin/projects',
    action: 'Review drafts',
  },
  {
    key: 'totalSkillGroups',
    label: 'Skill groups',
    hint: 'Groups shown in Skills',
    to: '/admin/skills',
    action: 'Manage skills',
  },
  {
    key: 'unreadContactMessages',
    label: 'Unread messages',
    hint: 'New contact form messages',
    to: '/admin/messages',
    action: 'Open inbox',
  },
];

const QUICK_LINKS = [
  { to: '/admin/projects/new', label: 'Add a project', detail: 'Create a new portfolio entry.' },
  { to: '/admin/messages', label: 'Read messages', detail: 'Review contact form submissions.' },
  { to: '/admin/skills', label: 'Edit skills', detail: 'Update the Skills section groups.' },
  { to: '/admin/profile', label: 'Edit profile', detail: 'Update the introduction and biography.' },
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
          <li key={card.key}>
            <Link
              to={card.to}
              className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent/40 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">
                {state.data?.[card.key] ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted">{card.hint}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                {card.action}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Quick actions</h2>
            <p className="mt-1.5 text-sm text-muted">
              Jump to the content you are most likely to update.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40 hover:text-accent"
          >
            View public site
          </a>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="block rounded-xl border border-line bg-sunken/50 p-4 transition-colors hover:border-accent/40 hover:bg-sunken focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <span className="block text-sm font-semibold text-ink">{link.label}</span>
                <span className="mt-1 block text-xs text-muted">{link.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
