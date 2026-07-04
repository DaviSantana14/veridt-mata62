const assert = require('node:assert').strict;
const bcrypt = require('bcrypt');
const { AppService } = require('../dist/src/app.service.js');

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    fullName: 'Davi Santos',
    email: 'davi@example.com',
    cpf: '12345678900',
    passwordHash: bcrypt.hashSync('senha-antiga', 10),
    profile: 'COMMON_USER',
    oabNumber: null,
    createdAt: new Date('2026-06-08T12:00:00.000Z'),
    updatedAt: new Date('2026-06-08T12:00:00.000Z'),
    ...overrides,
  };
}

function makeService(initialUsers = [makeUser()]) {
  const users = initialUsers.map((user) => ({ ...user }));

  const prisma = {
    user: {
      findUnique({ where }) {
        if (where.id) {
          return Promise.resolve(users.find((user) => user.id === where.id) ?? null);
        }

        if (where.email) {
          return Promise.resolve(
            users.find((user) => user.email === where.email) ?? null,
          );
        }

        return Promise.resolve(null);
      },
      findFirst({ where }) {
        if (where.email && where.NOT?.id) {
          return Promise.resolve(
            users.find(
              (user) => user.email === where.email && user.id !== where.NOT.id,
            ) ?? null,
          );
        }

        return Promise.resolve(null);
      },
      update({ where, data }) {
        const index = users.findIndex((user) => user.id === where.id);

        if (index === -1) {
          return Promise.resolve(null);
        }

        users[index] = {
          ...users[index],
          ...data,
          updatedAt: new Date('2026-06-08T12:30:00.000Z'),
        };

        return Promise.resolve(users[index]);
      },
    },
  };

  return {
    service: new AppService(prisma, {}, {}),
    users,
  };
}

async function updatesUserProfile() {
  const { service } = makeService();

  const result = await service.updateUser('user-1', {
    fullName: '  Davi Pereira  ',
    email: '  DAVI.NOVO@EXAMPLE.COM  ',
  });

  assert.equal(result.fullName, 'Davi Pereira');
  assert.equal(result.email, 'davi.novo@example.com');
  assert.equal(result.cpf, '12345678900');
}

async function rejectsDuplicateEmail() {
  const { service } = makeService([
    makeUser(),
    makeUser({
      id: 'user-2',
      email: 'outro@example.com',
    }),
  ]);

  await assert.rejects(
    () =>
      service.updateUser('user-1', {
        fullName: 'Davi Santos',
        email: 'outro@example.com',
      }),
    (error) => error.getStatus?.() === 400,
  );
}

async function rejectsInvalidCurrentPassword() {
  const { service } = makeService();

  await assert.rejects(
    () =>
      service.changePassword('user-1', {
        currentPassword: 'senha-errada',
        newPassword: 'senha-nova',
      }),
    (error) => error.getStatus?.() === 401,
  );
}

async function changesPasswordWhenCurrentPasswordMatches() {
  const { service, users } = makeService();

  const result = await service.changePassword('user-1', {
    currentPassword: 'senha-antiga',
    newPassword: 'senha-nova',
  });

  assert.equal(result.message, 'Senha alterada com sucesso.');
  assert.equal(await bcrypt.compare('senha-nova', users[0].passwordHash), true);
}

async function main() {
  await updatesUserProfile();
  await rejectsDuplicateEmail();
  await rejectsInvalidCurrentPassword();
  await changesPasswordWhenCurrentPasswordMatches();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
