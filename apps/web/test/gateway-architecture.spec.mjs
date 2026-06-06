import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readProjectFile(relativePath) {
  const filePath = join(root, relativePath);
  assert.ok(existsSync(filePath), `${relativePath} must exist`);

  return readFileSync(filePath, 'utf8');
}

const gateway = readProjectFile('src/lib/gateway.ts');
const authForms = readProjectFile('src/components/veridit/auth-forms.tsx');
const authSession = readProjectFile('src/lib/auth-session.ts');
const appShell = readProjectFile('src/components/layout/app-shell.tsx');
const logoutButton = readProjectFile('src/components/veridit/logout-button.tsx');

assert.match(
  gateway,
  /NEXT_PUBLIC_API_GATEWAY_URL\s*\?\?\s*["']http:\/\/localhost:3001["']/,
  'web gateway fallback must point to the API Gateway port',
);
assert.doesNotMatch(
  `${gateway}\n${authForms}`,
  /localhost:3101/,
  'frontend must not call identity-service directly',
);
assert.match(gateway, /accessToken: string/, 'loginUser must expect accessToken');
assert.match(
  gateway,
  /["']\/identity\/auth\/login["']/,
  'loginUser must call the API Gateway identity login route',
);
assert.match(
  gateway,
  /requestGateway<\{ id: string \}>\(["']\/identity\/users["']/,
  'registerUser must call the API Gateway identity registration route',
);
assert.doesNotMatch(
  authForms,
  /fetch\(/,
  'auth forms must use gateway helpers instead of direct fetch calls',
);
assert.match(
  authSession,
  /veridit\.auth\.session/,
  'auth session helper must use the agreed localStorage key',
);
assert.match(
  authSession,
  /typeof window/,
  'auth session helper must be safe when rendered on the server',
);
assert.match(
  authForms,
  /saveAuthSession\(result\.data\)/,
  'login form must persist the AuthResponse session after successful login',
);
assert.match(
  logoutButton,
  /clearAuthSession\(\)/,
  'logout button must clear the stored auth session',
);
assert.match(
  logoutButton,
  /router\.replace\(["']\/login["']\)/,
  'logout button must redirect to login without leaving a protected history entry',
);
assert.match(
  appShell,
  /<AuthBoundary>/,
  'AppShell must protect internal pages with AuthBoundary',
);
