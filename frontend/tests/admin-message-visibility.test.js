import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

let server;
let AdminMessageBody;

before(async () => {
  server = await createServer({
    root: frontendRoot,
    configFile: false,
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  AdminMessageBody = (await server.ssrLoadModule('/src/admin/AdminMessageBody.jsx')).default;
});

after(async () => {
  await server.close();
});

function render(message) {
  return renderToStaticMarkup(
    React.createElement(AdminMessageBody, { id: 'message-body-1', message }),
  );
}

test('a hidden message never renders its body text', () => {
  const markup = render({ id: '1', hidden: true, message: 'Did u get my message' });

  assert.doesNotMatch(markup, /Did u get my message/);
  assert.match(markup, /Message body hidden/);
  assert.match(markup, /data-message-visibility="hidden"/);
  assert.match(markup, /id="message-body-1"/);
});

test('a visible message renders the complete body text', () => {
  const markup = render({
    id: '2',
    hidden: false,
    message: 'First line\nSecond line',
  });

  assert.match(markup, /First line\nSecond line/);
  assert.match(markup, /data-message-visibility="visible"/);
  assert.match(markup, /whitespace-pre-wrap/);
  assert.doesNotMatch(markup, /Message body hidden/);
});

test('legacy messages without a visibility field stay collapsed', () => {
  const markup = render({ id: '3', message: 'just to check u there' });

  assert.doesNotMatch(markup, /just to check u there/);
  assert.match(markup, /Message body hidden/);
});
