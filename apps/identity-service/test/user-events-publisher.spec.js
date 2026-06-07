const assert = require('node:assert').strict;
const { VERIDIT_EVENTS } = require('@veridit/contracts');
const {
  UserEventsPublisher,
} = require('../dist/src/messaging/user-events.publisher.js');

function makePublisher() {
  const emittedEvents = [];
  const publisher = new UserEventsPublisher();

  publisher.client = {
    emit(pattern, payload) {
      emittedEvents.push({ pattern, payload });
      return {
        subscribe() {
          return undefined;
        },
      };
    },
    close() {
      return Promise.resolve();
    },
  };

  return { publisher, emittedEvents };
}

function makePasswordResetEvent() {
  return {
    userId: 'user-1',
    fullName: 'Ana Silva',
    email: 'ana@example.com',
    code: '123456',
    expiresAt: '2026-06-06T12:15:00.000Z',
    occurredAt: '2026-06-06T12:00:00.000Z',
  };
}

async function publishesPasswordResetRequestedEvent() {
  const { publisher, emittedEvents } = makePublisher();
  const event = makePasswordResetEvent();
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => {
    logs.push(args.join(' '));
  };
  console.error = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    publisher.publishPasswordResetRequested(event);

    assert.deepEqual(emittedEvents, [
      {
        pattern: VERIDIT_EVENTS.passwordResetRequested,
        payload: event,
      },
    ]);
    assert.equal(
      logs.some((line) => line.includes(event.code)),
      false,
    );
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  await publisher.onModuleDestroy();
}

async function main() {
  await publishesPasswordResetRequestedEvent();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
