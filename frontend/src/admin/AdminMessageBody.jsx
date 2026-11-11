import { isMessageHidden } from './messageState.js';

/**
 * The message body in the administrator inbox.
 *
 * Visibility is persisted as `hidden`. A hidden message must not leave its body
 * text in the DOM behind a truncation class: doing so still exposes the full
 * message to screen readers, text selection, and anyone looking at a wide
 * screen. Hidden rows therefore render a neutral placeholder instead.
 */
export default function AdminMessageBody({ id, message }) {
  if (isMessageHidden(message)) {
    return (
      <p
        id={id}
        data-message-visibility="hidden"
        className="mt-2 rounded-xl border border-dashed border-line-strong bg-sunken px-3 py-2 text-sm text-muted"
      >
        <span className="font-semibold text-ink">Message body hidden.</span>{' '}
        Select <span className="font-semibold">View message</span> to read it.
      </p>
    );
  }

  return (
    <p
      id={id}
      data-message-visibility="visible"
      className="mt-2 whitespace-pre-wrap break-words text-sm text-ink"
    >
      {message?.message ?? ''}
    </p>
  );
}
