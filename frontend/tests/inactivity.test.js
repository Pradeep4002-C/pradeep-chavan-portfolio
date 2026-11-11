import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INACTIVITY_EVENTS,
  INACTIVITY_STORAGE_KEY,
  INACTIVITY_TIMEOUT_MINUTES,
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  INACTIVITY_WARNING_SECONDS,
  acceptActivitySignal,
  createActivitySignal,
  createInactivityController,
  parseActivitySignal,
} from '../src/admin/inactivity.js';

function createFakeClock() {
  let current = 0;
  let nextId = 1;
  const timers = new Map();

  return {
    now: () => current,
    schedule(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, at: current + Math.max(0, delay) });
      return id;
    },
    cancel(id) {
      timers.delete(id);
    },
    advance(ms) {
      const target = current + ms;

      for (;;) {
        let selected = null;
        for (const [id, timer] of timers) {
          if (timer.at <= target && (!selected || timer.at < selected.timer.at)) {
            selected = { id, timer };
          }
        }

        if (!selected) {
          break;
        }

        timers.delete(selected.id);
        current = selected.timer.at;
        selected.timer.callback();
      }

      current = target;
    },
    pending: () => timers.size,
  };
}

test('inactivity policy uses a fifteen minute window, a sixty second warning, and the required events', () => {
  assert.equal(INACTIVITY_TIMEOUT_MS, 15 * 60 * 1000);
  assert.equal(INACTIVITY_TIMEOUT_MINUTES, 15);
  assert.equal(INACTIVITY_WARNING_MS, 60 * 1000);
  assert.equal(INACTIVITY_WARNING_SECONDS, 60);
  assert.equal(INACTIVITY_STORAGE_KEY, 'pradeep.admin.last-activity');
  assert.deepEqual([...INACTIVITY_EVENTS], ['mousemove', 'mousedown', 'keypress', 'scroll']);
});

test('warns exactly sixty seconds before idle, counts down to one, then signs out once', () => {
  const clock = createFakeClock();
  const events = [];
  const controller = createInactivityController({
    timeoutMs: INACTIVITY_TIMEOUT_MS,
    warningMs: INACTIVITY_WARNING_MS,
    onWarning: (seconds) => events.push(`warning:${seconds}`),
    onTick: (seconds) => events.push(`tick:${seconds}`),
    onIdle: () => events.push('idle'),
    schedule: clock.schedule,
    cancel: clock.cancel,
    now: clock.now,
  });

  controller.reset();

  clock.advance(INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS - 1);
  assert.deepEqual(events, []);

  clock.advance(1);
  assert.deepEqual(events, ['warning:60']);

  clock.advance(1000);
  assert.equal(events.at(-1), 'tick:59');

  clock.advance(58_000);
  assert.equal(events.at(-1), 'tick:1');
  assert.equal(events.filter((event) => event === 'idle').length, 0);

  clock.advance(1000);
  assert.equal(events.at(-1), 'idle');
  assert.equal(events.filter((event) => event === 'idle').length, 1);
  assert.equal(clock.pending(), 0);
});

test('resetting from the warning restarts the full fifteen minute window', () => {
  const clock = createFakeClock();
  const warnings = [];
  const controller = createInactivityController({
    timeoutMs: INACTIVITY_TIMEOUT_MS,
    warningMs: INACTIVITY_WARNING_MS,
    onWarning: (seconds) => warnings.push(seconds),
    onIdle: () => {
      throw new Error('Reset must cancel the previous deadline.');
    },
    schedule: clock.schedule,
    cancel: clock.cancel,
    now: clock.now,
  });

  controller.reset();
  clock.advance(INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS);
  assert.deepEqual(warnings, [60]);

  // "Stay signed in" at the start of the warning.
  controller.reset();
  clock.advance(INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS - 1);
  assert.deepEqual(warnings, [60]);

  clock.advance(1);
  assert.deepEqual(warnings, [60, 60]);
});

test('stop cancels both the warning and the countdown', () => {
  const clock = createFakeClock();
  let events = 0;
  const controller = createInactivityController({
    timeoutMs: 60_000,
    warningMs: 10_000,
    onWarning: () => {
      events += 1;
    },
    onTick: () => {
      events += 1;
    },
    onIdle: () => {
      events += 1;
    },
    schedule: clock.schedule,
    cancel: clock.cancel,
    now: clock.now,
  });

  controller.reset();
  clock.advance(50_000);
  controller.stop();
  clock.advance(1_000_000);

  assert.equal(events, 1);
  assert.equal(clock.pending(), 0);
});

test('controller rejects timings that cannot produce a real warning', () => {
  assert.throws(
    () => createInactivityController({ warningMs: 60_000 }),
    /onIdle/,
  );
  assert.throws(
    () => createInactivityController({ onIdle: () => {}, timeoutMs: 0 }),
    /timeoutMs/,
  );
  assert.throws(
    () =>
      createInactivityController({
        onIdle: () => {},
        timeoutMs: 60_000,
        warningMs: 60_000,
      }),
    /warningMs/,
  );
});

test('activity heartbeats are typed, parseable, and ignore stale or malformed values', () => {
  const raw = createActivitySignal(1234, 'nonce-1');
  assert.deepEqual(JSON.parse(raw), {
    type: 'admin-activity',
    at: 1234,
    nonce: 'nonce-1',
  });

  assert.equal(parseActivitySignal(raw), 1234);
  assert.equal(acceptActivitySignal(raw, 1000), 1234);
  assert.equal(acceptActivitySignal(raw, 1234), null);
  assert.equal(acceptActivitySignal(raw, 9000), null);

  assert.equal(parseActivitySignal('not-json'), null);
  assert.equal(parseActivitySignal(JSON.stringify({ type: 'logout', at: 1 })), null);
  assert.equal(parseActivitySignal(JSON.stringify({ type: 'admin-activity', at: 'x' })), null);
  assert.equal(parseActivitySignal(null), null);
});
