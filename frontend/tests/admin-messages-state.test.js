import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyMessageUpdate,
  isMessageHidden,
  nextHiddenValue,
} from '../src/admin/messageState.js';

test('missing visibility values default to collapsed and toggle on the next click', () => {
  assert.equal(isMessageHidden({ hidden: true }), true);
  assert.equal(isMessageHidden({ hidden: false }), false);
  assert.equal(isMessageHidden({}), true);

  assert.equal(nextHiddenValue({ hidden: true }), false);
  assert.equal(nextHiddenValue({ hidden: false }), true);
  assert.equal(nextHiddenValue({}), false);
});

test('applyMessageUpdate reflects a successful PATCH immediately and preserves order', () => {
  const inbox = {
    messages: [
      { id: 'a', name: 'First', read: false, hidden: true },
      { id: 'b', name: 'Second', read: false, hidden: true },
    ],
    pagination: { total: 2, page: 1, pages: 1 },
  };

  const updated = applyMessageUpdate(inbox, {
    id: 'b',
    name: 'Second',
    read: true,
    hidden: false,
  });

  assert.notEqual(updated, inbox);
  assert.deepEqual(updated.messages.map((message) => message.id), ['a', 'b']);
  assert.equal(updated.messages[1].read, true);
  assert.equal(updated.messages[1].hidden, false);
  assert.equal(updated.messages[0].read, false);
  assert.equal(updated.messages[0].hidden, true);
  assert.equal(updated.pagination, inbox.pagination);

  assert.equal(applyMessageUpdate(inbox, { id: 'missing', hidden: false }), inbox);
});
