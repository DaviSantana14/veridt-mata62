const assert = require('node:assert').strict;
const { AppService } = require('../dist/src/app.service.js');

function makeEvent() {
  return {
    purchaseId: 'purchase-1',
    userId: 'user-1',
    packageName: 'basic',
    credits: 10,
    payerEmail: 'buyer@example.com',
    occurredAt: '2026-06-06T12:00:00.000Z',
  };
}

function makeNotification(status) {
  return {
    id: 'notification-1',
    recipient: 'buyer@example.com',
    status,
    createdAt: new Date('2026-06-06T12:00:00.000Z'),
  };
}

function makePrisma(updates, onUpdate) {
  return {
    notification: {
      create(input) {
        assert.equal(input.data.status, 'PENDING');
        return Promise.resolve(makeNotification('PENDING'));
      },
      update(input) {
        updates.push(input);

        if (onUpdate) {
          return onUpdate(input);
        }

        return Promise.resolve(makeNotification(input.data.status));
      },
    },
  };
}

async function marksSuccessfulSendAsSent() {
  const updates = [];
  const emailProvider = {
    sendEmail() {
      return Promise.resolve({ messageId: 'gmail-message-123' });
    },
  };
  const service = new AppService(makePrisma(updates), emailProvider);

  const response = await service.createCreditPurchaseEmail(makeEvent());

  assert.equal(response.status, 'SENT');
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.data.status, 'SENT');
  assert.equal(updates[0]?.data.providerMessageId, 'gmail-message-123');
  assert.ok(updates[0]?.data.sentAt instanceof Date);
}

async function marksSendFailureAsFailed() {
  const updates = [];
  const emailProvider = {
    sendEmail() {
      return Promise.reject(new Error('smtp rejected credentials'));
    },
  };
  const service = new AppService(makePrisma(updates), emailProvider);

  const response = await service.createCreditPurchaseEmail(makeEvent());

  assert.equal(response.status, 'FAILED');
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.data.status, 'FAILED');
  assert.equal(updates[0]?.data.errorMessage, 'smtp rejected credentials');
  assert.ok(updates[0]?.data.failedAt instanceof Date);
}

async function doesNotMarkSentEmailAsFailedWhenSentUpdateFails() {
  const updates = [];
  const emailProvider = {
    sendEmail() {
      return Promise.resolve({ messageId: 'gmail-message-123' });
    },
  };
  const prisma = makePrisma(updates, (input) => {
    if (input.data.status === 'SENT') {
      return Promise.reject(new Error('sent update failed'));
    }

    return Promise.resolve(makeNotification(input.data.status));
  });
  const service = new AppService(prisma, emailProvider);

  await assert.rejects(
    () => service.createCreditPurchaseEmail(makeEvent()),
    /sent update failed/,
  );
  assert.deepEqual(
    updates.map((update) => update.data.status),
    ['SENT'],
  );
}

async function main() {
  await marksSuccessfulSendAsSent();
  await marksSendFailureAsFailed();
  await doesNotMarkSentEmailAsFailedWhenSentUpdateFails();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
