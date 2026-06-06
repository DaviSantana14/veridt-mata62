import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gateway = readFileSync(join(root, 'src/lib/gateway.ts'), 'utf8');
const authForms = readFileSync(
  join(root, 'src/components/veridit/auth-forms.tsx'),
  'utf8',
);

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
