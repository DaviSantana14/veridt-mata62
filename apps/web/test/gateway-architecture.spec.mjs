import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(relativePath) {
  const filePath = join(root, relativePath);
  assert.ok(existsSync(filePath), `${relativePath} must exist`);

  return readFileSync(filePath, "utf8");
}

const gateway = readProjectFile("src/lib/gateway.ts");
const authForms = readProjectFile("src/components/veridit/auth-forms.tsx");
const authSession = readProjectFile("src/lib/auth-session.ts");
const appShell = readProjectFile("src/components/layout/app-shell.tsx");
const dashboardClient = readProjectFile(
  "src/components/veridit/dashboard-client.tsx",
);
const evidenceCard = readProjectFile(
  "src/components/veridit/evidence-card.tsx",
);
const captureRecordView = readProjectFile("src/lib/capture-record-view.ts");
const logoutButton = readProjectFile(
  "src/components/veridit/logout-button.tsx",
);
const mockData = readProjectFile("src/lib/mock-data.ts");
const profilePage = readProjectFile("src/app/perfil/page.tsx");
const profileClient = readProjectFile("src/components/veridit/profile-client.tsx");

assert.match(
  gateway,
  /NEXT_PUBLIC_API_GATEWAY_URL\s*\?\?\s*["']http:\/\/localhost:3001["']/,
  "web gateway fallback must point to the API Gateway port",
);
assert.doesNotMatch(
  `${gateway}\n${authForms}`,
  /localhost:3101/,
  "frontend must not call identity-service directly",
);
assert.match(
  gateway,
  /accessToken: string/,
  "loginUser must expect accessToken",
);
assert.match(
  gateway,
  /["']\/identity\/auth\/login["']/,
  "loginUser must call the API Gateway identity login route",
);
assert.doesNotMatch(
  gateway,
  /credentials:\s*["']include["']/,
  "web gateway helpers must not request browser credentials while auth uses accessToken",
);
assert.match(
  gateway,
  /requestGateway<\{ id: string \}>\(["']\/identity\/users["']/,
  "registerUser must call the API Gateway identity registration route",
);
assert.doesNotMatch(
  authForms,
  /fetch\(/,
  "auth forms must use gateway helpers instead of direct fetch calls",
);
assert.match(
  authForms,
  /const \[verificationCode,\s*setVerificationCode\]\s*=\s*useState\(["']["']\)/,
  "recover password form must keep verification code in its own controlled state",
);
assert.match(
  authForms,
  /name=["']code["'][\s\S]*autoComplete=["']one-time-code["']/,
  "verification code input must opt into one-time-code autocomplete instead of reusing email autofill",
);
assert.match(
  authForms,
  /<form key=["']request-code["'] onSubmit=\{handleRequestCode\}>/,
  "request-code form must have a stable key so React does not reuse its email input for the reset step",
);
assert.match(
  authForms,
  /<form key=["']reset-password["'] onSubmit=\{handleResetPassword\}>/,
  "reset-password form must have a stable key so its controlled code input mounts empty",
);
assert.match(
  authSession,
  /veridit\.auth\.session/,
  "auth session helper must use the agreed localStorage key",
);
assert.match(
  authSession,
  /typeof window/,
  "auth session helper must be safe when rendered on the server",
);
assert.match(
  authForms,
  /saveAuthSession\(result\.data\)/,
  "login form must persist the AuthResponse session after successful login",
);
assert.match(
  logoutButton,
  /clearAuthSession\(\)/,
  "logout button must clear the stored auth session",
);
assert.match(
  logoutButton,
  /router\.replace\(["']\/login["']\)/,
  "logout button must redirect to login without leaving a protected history entry",
);
assert.match(
  appShell,
  /<AuthBoundary>/,
  "AppShell must protect internal pages with AuthBoundary",
);
assert.match(
  dashboardClient,
  /getAuthSession\(\)/,
  "dashboard greeting must read the persisted auth session",
);
assert.doesNotMatch(
  dashboardClient,
  /title=\{`Bom dia, \$\{currentUser\.firstName\}/,
  "dashboard greeting must not use the mocked first name",
);
assert.doesNotMatch(
  `${gateway}\n${authForms}\n${mockData}\n${profilePage}`,
  /\bphone\b|Phone|Telefone|telefone/,
  "registration and profile UI must not use phone fields",
);
assert.match(
  gateway,
  /function getUserProfile\(userId: string\)/,
  "web gateway helpers must expose user profile fetch",
);
assert.match(
  gateway,
  /function listCaptureRecords\(userId: string\)/,
  "web gateway helpers must expose capture record listing",
);
assert.match(
  gateway,
  /\/capture\/users\/\$\{userId\}\/records/,
  "capture record listing must go through the API Gateway capture route",
);
assert.match(
  gateway,
  /function updateUserProfile\(/,
  "web gateway helpers must expose profile update",
);
assert.match(
  gateway,
  /function changeUserPassword\(/,
  "web gateway helpers must expose password change",
);
assert.doesNotMatch(
  profileClient,
  /fetch\(/,
  "profile UI must use gateway helpers instead of direct fetch calls",
);
assert.doesNotMatch(
  `${profilePage}\n${profileClient}`,
  /currentUser\.(name|email|initials)/,
  "profile UI must not render mocked user identity fields",
);
assert.doesNotMatch(
  dashboardClient,
  /import\s+\{\s*currentUser,\s*records\s*\}\s+from\s+["']@\/lib\/mock-data["']/,
  "dashboard must not import mocked records",
);
assert.match(
  captureRecordView,
  /record\.status === ["']STARTED["']/,
  "started capture records must be handled separately from finished records",
);
assert.match(
  captureRecordView,
  /`\/captura\/\$\{encodeURIComponent\(record\.id\)\}`/,
  "started capture record list actions must point to the capture resume route",
);
assert.match(
  captureRecordView,
  /`\/captura\/concluida\?recordId=\$\{encodeURIComponent\(record\.id\)\}`/,
  "finished capture record list actions must point to a real-data route",
);
assert.doesNotMatch(
  `${dashboardClient}\n${evidenceCard}`,
  /\/registros\/\$\{record\.id\}/,
  "real capture record list actions must not route to the mock-backed registros page",
);
assert.doesNotMatch(
  `${profilePage}\n${profileClient}`,
  /Preferências|Autenticação de dois fatores|PreferenceRow|Switch/,
  "profile UI must not render preferences or two-factor authentication controls",
);
assert.match(
  profileClient,
  /name=["']cpf["'][\s\S]*readOnly/,
  "profile CPF field must be rendered as read-only",
);
assert.match(
  profileClient,
  /saveAuthSession\(nextSession\)/,
  "saving profile must refresh persisted auth session",
);
assert.match(
  profileClient,
  /const formElement = event\.currentTarget;[\s\S]*const form = new FormData\(formElement\);[\s\S]*formElement\.reset\(\);/,
  "password form must keep a stable form reference across async password change",
);
assert.doesNotMatch(
  profileClient,
  /event\.currentTarget\.reset\(\)/,
  "password form must not access event.currentTarget after awaiting password change",
);
