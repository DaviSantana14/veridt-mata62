const assert = require('node:assert').strict;
const fs = require('node:fs');
const path = require('node:path');

const appServiceBuildPath = fs.existsSync(
  path.join(__dirname, '../dist/src/app.service.js'),
)
  ? '../dist/src/app.service.js'
  : '../dist/app.service.js';
const { AppService } = require(appServiceBuildPath);

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

function makeUserRegisteredEvent() {
  return {
    userId: 'user-1',
    fullName: 'Ana Silva',
    email: 'ana@example.com',
    profile: 'COMMON_USER',
    occurredAt: '2026-06-06T12:00:00.000Z',
  };
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

function makeCaptureCompletedEvent() {
  return {
    recordId: 'record-1',
    userId: 'user-1',
    title: 'Captura UFBA',
    siteUrl: 'https://www.ufba.br/',
    imageCount: 2,
    videoCount: 1,
    occurredAt: '2026-06-06T12:00:00.000Z',
  };
}

function makeNotification(status, recipient = 'buyer@example.com') {
  return {
    id: 'notification-1',
    recipient,
    status,
    createdAt: new Date('2026-06-06T12:00:00.000Z'),
  };
}

function makePrisma(updates, onUpdate, creates) {
  let createdRecipient = 'buyer@example.com';

  return {
    notification: {
      create(input) {
        if (creates) {
          creates.push(input);
        }

        assert.equal(input.data.status, 'PENDING');
        createdRecipient = input.data.recipient;
        return Promise.resolve(makeNotification('PENDING', createdRecipient));
      },
      update(input) {
        updates.push(input);

        if (onUpdate) {
          return onUpdate(input);
        }

        return Promise.resolve(
          makeNotification(input.data.status, createdRecipient),
        );
      },
    },
  };
}

function mockIdentityUser(user = {}) {
  const originalFetch = global.fetch;

  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: 'user-1',
      fullName: 'Ana Silva',
      email: 'ana@example.com',
      cpf: '12345678900',
      profile: 'COMMON_USER',
      createdAt: '2026-06-06T12:00:00.000Z',
      ...user,
    }),
    url,
  });

  return () => {
    global.fetch = originalFetch;
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

async function sendsCaptureCompletedEmailToRecordOwner() {
  const restoreFetch = mockIdentityUser();
  const updates = [];
  const creates = [];
  const sentEmails = [];
  const emailProvider = {
    sendEmail(input) {
      sentEmails.push(input);
      return Promise.resolve({ messageId: 'capture-message-123' });
    },
  };
  const service = new AppService(
    makePrisma(updates, undefined, creates),
    emailProvider,
  );

  try {
    const response = await service.createCaptureCompletedEmail(
      makeCaptureCompletedEvent(),
    );

    assert.equal(response.recipient, 'ana@example.com');
    assert.equal(response.status, 'SENT');
    assert.equal(creates.length, 1);
    assert.equal(creates[0]?.data.eventName, 'capture.completed');
    assert.equal(creates[0]?.data.metadata.recordId, 'record-1');
    assert.equal(creates[0]?.data.metadata.userId, 'user-1');
    assert.equal(creates[0]?.data.metadata.title, 'Captura UFBA');
    assert.equal(creates[0]?.data.metadata.siteUrl, 'https://www.ufba.br/');
    assert.equal(creates[0]?.data.metadata.imageCount, 2);
    assert.equal(creates[0]?.data.metadata.videoCount, 1);
    assert.equal(
      creates[0]?.data.metadata.occurredAt,
      '2026-06-06T12:00:00.000Z',
    );
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.data.status, 'SENT');
    assert.equal(updates[0]?.data.providerMessageId, 'capture-message-123');
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0]?.to, 'ana@example.com');
    assert.match(
      sentEmails[0]?.subject,
      /Registro de conteúdo Veridit concluído/,
    );
    assert.match(sentEmails[0]?.text, /Captura UFBA/);
    assert.match(sentEmails[0]?.text, /https:\/\/www\.ufba\.br\//);
    assert.match(sentEmails[0]?.text, /Capturas de tela: 2/);
    assert.match(sentEmails[0]?.text, /Vídeos: 1/);
    assert.match(sentEmails[0]?.text, /http:\/\/localhost:3000\/registros\/record-1/);
    assert.match(sentEmails[0]?.html, /Captura UFBA/);
    assert.match(sentEmails[0]?.html, /https:\/\/www\.ufba\.br\//);
    assert.match(sentEmails[0]?.html, /Capturas de tela/);
    assert.match(sentEmails[0]?.html, /Vídeos/);
    assert.match(sentEmails[0]?.html, /http:\/\/localhost:3000\/registros\/record-1/);
    assert.match(sentEmails[0]?.html, /VERIDIT/);
  } finally {
    restoreFetch();
  }
}

async function failsCaptureCompletedEmailWhenUserEmailCannotBeResolved() {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({}),
  });
  const updates = [];
  const creates = [];
  const emailProvider = {
    sendEmail() {
      throw new Error('email should not be sent');
    },
  };
  const service = new AppService(
    makePrisma(updates, undefined, creates),
    emailProvider,
  );

  try {
    await assert.rejects(
      () => service.createCaptureCompletedEmail(makeCaptureCompletedEvent()),
      /Could not resolve notification recipient/,
    );
    assert.equal(creates.length, 0);
    assert.equal(updates.length, 0);
  } finally {
    global.fetch = originalFetch;
  }
}

async function sendsWelcomeEmailForRegisteredUser() {
  const updates = [];
  const sentEmails = [];
  const emailProvider = {
    sendEmail(input) {
      sentEmails.push(input);
      return Promise.resolve({ messageId: 'welcome-message-123' });
    },
  };
  const service = new AppService(makePrisma(updates), emailProvider);

  const response = await service.createUserRegisteredEmail(
    makeUserRegisteredEvent(),
  );

  assert.equal(response.recipient, 'ana@example.com');
  assert.equal(response.status, 'SENT');
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.data.status, 'SENT');
  assert.equal(updates[0]?.data.providerMessageId, 'welcome-message-123');
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0]?.to, 'ana@example.com');
  assert.match(sentEmails[0]?.subject, /Bem-vindo/);
  assert.match(sentEmails[0]?.text, /Ana Silva/);
  assert.match(sentEmails[0]?.text, /http:\/\/localhost:3000\/dashboard/);
  assert.match(sentEmails[0]?.html, /VERIDIT/);
  assert.match(sentEmails[0]?.html, /Ana Silva/);
  assert.match(sentEmails[0]?.html, /http:\/\/localhost:3000\/dashboard/);
  assert.match(sentEmails[0]?.html, /background-color: #102033/);
}

async function sendsPasswordResetEmailWithCode() {
  const updates = [];
  const creates = [];
  const sentEmails = [];
  const emailProvider = {
    sendEmail(input) {
      sentEmails.push(input);
      return Promise.resolve({ messageId: 'password-reset-message-123' });
    },
  };
  const service = new AppService(
    makePrisma(updates, undefined, creates),
    emailProvider,
  );

  const response = await service.createPasswordResetEmail(
    makePasswordResetEvent(),
  );

  assert.equal(response.recipient, 'ana@example.com');
  assert.equal(response.status, 'SENT');
  assert.equal(creates.length, 1);
  assert.equal(creates[0]?.data.eventName, 'identity.password_reset_requested');
  assert.equal(creates[0]?.data.metadata.userId, 'user-1');
  assert.equal(creates[0]?.data.metadata.expiresAt, '2026-06-06T12:15:00.000Z');
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.data.status, 'SENT');
  assert.equal(
    updates[0]?.data.providerMessageId,
    'password-reset-message-123',
  );
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0]?.to, 'ana@example.com');
  assert.match(sentEmails[0]?.subject, /recuperação de senha/i);
  assert.match(sentEmails[0]?.text, /123456/);
  assert.match(sentEmails[0]?.text, /15 minutos/);
  assert.match(sentEmails[0]?.text, /http:\/\/localhost:3000\/recuperar-senha/);
  assert.match(sentEmails[0]?.html, /123456/);
  assert.match(sentEmails[0]?.html, /15 minutos/);
  assert.match(sentEmails[0]?.html, /http:\/\/localhost:3000\/recuperar-senha/);
  assert.match(sentEmails[0]?.html, /letter-spacing: 8px/);
  assert.match(sentEmails[0]?.html, /VERIDIT/);
}

async function sendsCreditPurchaseEmailWithSummaryAndLink() {
  const updates = [];
  const sentEmails = [];
  const emailProvider = {
    sendEmail(input) {
      sentEmails.push(input);
      return Promise.resolve({ messageId: 'credit-message-123' });
    },
  };
  const service = new AppService(makePrisma(updates), emailProvider);

  const response = await service.createCreditPurchaseEmail(makeEvent());

  assert.equal(response.recipient, 'buyer@example.com');
  assert.equal(response.status, 'SENT');
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0]?.subject, /Compra de créditos Veridit confirmada/);
  assert.match(sentEmails[0]?.text, /purchase-1/);
  assert.match(sentEmails[0]?.text, /10 créditos/);
  assert.match(sentEmails[0]?.text, /basic/);
  assert.match(sentEmails[0]?.text, /http:\/\/localhost:3000\/creditos/);
  assert.match(sentEmails[0]?.html, /purchase-1/);
  assert.match(sentEmails[0]?.html, /10/);
  assert.match(sentEmails[0]?.html, /basic/);
  assert.match(sentEmails[0]?.html, /http:\/\/localhost:3000\/creditos/);
  assert.match(sentEmails[0]?.html, /VERIDIT/);
  assert.match(sentEmails[0]?.html, /background-color: #102033/);
}

async function marksPasswordResetSendFailureAsFailed() {
  const updates = [];
  const emailProvider = {
    sendEmail() {
      return Promise.reject(new Error('smtp rejected password reset email'));
    },
  };
  const service = new AppService(makePrisma(updates), emailProvider);

  const response = await service.createPasswordResetEmail(
    makePasswordResetEvent(),
  );

  assert.equal(response.status, 'FAILED');
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.data.status, 'FAILED');
  assert.equal(
    updates[0]?.data.errorMessage,
    'smtp rejected password reset email',
  );
  assert.ok(updates[0]?.data.failedAt instanceof Date);
}

async function marksWelcomeSendFailureAsFailed() {
  const updates = [];
  const emailProvider = {
    sendEmail() {
      return Promise.reject(new Error('smtp rejected welcome email'));
    },
  };
  const service = new AppService(makePrisma(updates), emailProvider);

  const response = await service.createUserRegisteredEmail(
    makeUserRegisteredEvent(),
  );

  assert.equal(response.status, 'FAILED');
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.data.status, 'FAILED');
  assert.equal(updates[0]?.data.errorMessage, 'smtp rejected welcome email');
  assert.ok(updates[0]?.data.failedAt instanceof Date);
}

async function doesNotMarkWelcomeEmailAsFailedWhenSentUpdateFails() {
  const updates = [];
  const emailProvider = {
    sendEmail() {
      return Promise.resolve({ messageId: 'welcome-message-123' });
    },
  };
  const prisma = makePrisma(updates, (input) => {
    if (input.data.status === 'SENT') {
      return Promise.reject(new Error('welcome sent update failed'));
    }

    return Promise.resolve(makeNotification(input.data.status));
  });
  const service = new AppService(prisma, emailProvider);

  await assert.rejects(
    () => service.createUserRegisteredEmail(makeUserRegisteredEvent()),
    /welcome sent update failed/,
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
  await sendsWelcomeEmailForRegisteredUser();
  await sendsPasswordResetEmailWithCode();
  await sendsCreditPurchaseEmailWithSummaryAndLink();
  await sendsCaptureCompletedEmailToRecordOwner();
  await failsCaptureCompletedEmailWhenUserEmailCannotBeResolved();
  await marksPasswordResetSendFailureAsFailed();
  await marksWelcomeSendFailureAsFailed();
  await doesNotMarkWelcomeEmailAsFailedWhenSentUpdateFails();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
