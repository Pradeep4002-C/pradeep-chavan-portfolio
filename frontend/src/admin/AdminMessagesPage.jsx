import { useCallback, useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import { deleteMessage, fetchMessages, updateMessage } from './adminApi.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import AdminMessageBody from './AdminMessageBody.jsx';
import { applyMessageUpdate, isMessageHidden, nextHiddenValue } from './messageState.js';
import {
  AdminErrorState,
  AdminLoading,
  ConfirmDialog,
  EmptyState,
  Notice,
  PageHeader,
  Pagination,
  dangerButtonClass,
  describeError,
} from './AdminUi.jsx';

const PAGE_SIZE = 20;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

function formatDate(value) {
  if (!value) {
    return 'Unknown date';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

function ReadBadge({ read }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        read ? 'bg-sunken text-muted' : 'bg-accent-soft text-accent-strong'
      }`}
    >
      {read ? 'Read' : 'Unread'}
    </span>
  );
}

export default function AdminMessagesPage() {
  const { markUnauthenticated } = useAdminAuth();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ messages: [], pagination: null });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(
    async (signal, { silent = false } = {}) => {
      try {
        const result = await fetchMessages({ read: filter, page, limit: PAGE_SIZE }, { signal });
        setData(result);
        setStatus('ready');
        setError(null);

        // The server clamps an out-of-range page; follow it so the controls
        // never claim a page that does not exist.
        const reportedPage = result.pagination?.page;
        if (typeof reportedPage === 'number' && reportedPage !== page) {
          setPage(reportedPage);
        }
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
            message: describeError(requestError, 'We could not refresh the inbox.'),
          });
          return;
        }
        setStatus('error');
        setError(requestError);
      }
    },
    [filter, page, markUnauthenticated],
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

  function changeFilter(value) {
    if (value === filter) {
      return;
    }
    setFilter(value);
    setPage(1);
    setStatus('loading');
  }

  async function handleToggleVisibility(message) {
    if (busyId) {
      return;
    }

    const nextHidden = nextHiddenValue(message);
    const optimistic = { ...message, hidden: nextHidden };
    setBusyId(message.id);
    setNotice(null);
    setData((current) => applyMessageUpdate(current, optimistic));

    try {
      const updated = await updateMessage(message.id, { hidden: nextHidden });
      setData((current) => applyMessageUpdate(current, updated));
      setNotice({
        tone: 'success',
        message: updated.hidden ? 'Message hidden.' : 'Message visible.',
      });
    } catch (requestError) {
      // Put the row back exactly as it was before the optimistic update.
      setData((current) => applyMessageUpdate(current, message));
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      setNotice({
        tone: 'error',
        message: describeError(requestError, 'We could not change the message visibility.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleRead(message) {
    if (busyId) {
      return;
    }
    setBusyId(message.id);
    setNotice(null);
    try {
      const updated = await updateMessage(message.id, { read: !message.read });
      setData((current) => applyMessageUpdate(current, updated));
      setNotice({
        tone: 'success',
        message: updated.read ? 'Message marked as read.' : 'Message marked as unread.',
      });
      await load(undefined, { silent: true });
    } catch (requestError) {
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      setNotice({
        tone: 'error',
        message: describeError(requestError, 'We could not change the message status.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    const target = deleteTarget;
    if (!target || busyId) {
      return;
    }
    setBusyId(target.id);
    try {
      await deleteMessage(target.id);
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `The message from ${target.name} was deleted.` });
      await load(undefined, { silent: true });
    } catch (requestError) {
      if (requestError?.status === 401) {
        markUnauthenticated();
        return;
      }
      setDeleteTarget(null);
      setNotice({
        tone: 'error',
        message: describeError(requestError, 'We could not delete that message.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  const messages = data.messages;
  const pagination = data.pagination;

  return (
    <div>
      <PageHeader title="Messages" description="Contact form messages saved in MongoDB.">
        <Button
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={status === 'loading'}
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </Button>
      </PageHeader>

      {notice ? (
        <div className="mb-5">
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.message}
          </Notice>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter messages">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => changeFilter(option.value)}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-semibold transition-ui ${
              filter === option.value
                ? 'border-accent bg-accent-soft text-accent-strong'
                : 'border-line-strong text-muted hover:border-accent hover:text-accent'
            }`}
          >
            {option.label}
          </button>
        ))}
        {pagination ? (
          <span className="ml-auto text-sm text-muted" aria-live="polite">
            {pagination.total} {pagination.total === 1 ? 'message' : 'messages'}
          </span>
        ) : null}
      </div>

      {status === 'loading' ? (
        <AdminLoading label="Loading messages…" />
      ) : status === 'error' ? (
        <AdminErrorState
          title="We could not load your inbox"
          message={describeError(error, 'We could not load your inbox. Please try again.')}
          onRetry={reload}
        />
      ) : messages.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No messages yet' : `No ${filter} messages`}
          message={
            filter === 'all'
              ? 'Messages sent through the public contact form will appear here.'
              : 'Try a different filter to see other messages.'
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {messages.map((message) => {
              const expanded = !isMessageHidden(message);
              const bodyId = `admin-message-body-${message.id}`;
              return (
                <li key={message.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 text-base font-semibold text-ink [overflow-wrap:anywhere]">{message.name}</h2>
                        <ReadBadge read={message.read} />
                      </div>
                      <p className="mt-0.5 break-all text-sm text-muted">{message.email}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted">{formatDate(message.createdAt)}</p>
                  </div>

                  {message.subject ? (
                    <p className="mt-2 text-sm font-semibold text-ink [overflow-wrap:anywhere]">{message.subject}</p>
                  ) : null}

                  <AdminMessageBody id={bodyId} message={message} />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-expanded={expanded}
                      aria-controls={bodyId}
                      onClick={() => handleToggleVisibility(message)}
                      disabled={Boolean(busyId)}
                    >
                      {expanded ? 'Hide message' : 'View message'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-pressed={Boolean(message.read)}
                      onClick={() => handleToggleRead(message)}
                      disabled={Boolean(busyId)}
                    >
                      {message.read ? 'Mark unread' : 'Mark read'}
                    </Button>
                    <button
                      type="button"
                      className={dangerButtonClass}
                      onClick={() => setDeleteTarget(message)}
                      disabled={Boolean(busyId)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {pagination ? (
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPage={(nextPage) => setPage(nextPage)}
              busy={status === 'loading'}
            />
          ) : null}
        </>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this message?"
          message={`The message from ${deleteTarget.name} (${deleteTarget.email}) will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete message"
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
