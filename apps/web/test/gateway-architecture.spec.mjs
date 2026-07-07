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
const captureRecordFormatters = readProjectFile(
  "src/lib/capture-record-formatters.ts",
);
const captureClient = readProjectFile(
  "src/components/veridit/capture-client.tsx",
);
const recordRow = readProjectFile("src/components/veridit/record-row.tsx");
const recordDetailsPage = readProjectFile("src/app/registros/[id]/page.tsx");
const recordReportPage = readProjectFile(
  "src/app/registros/[id]/relatorio/page.tsx",
);
const recordReportClient = readProjectFile(
  "src/app/registros/[id]/relatorio/report-client.tsx",
);
const recordReportDocument = readProjectFile(
  "src/components/veridit/report-document.tsx",
);
const recordZipBuilder = readProjectFile("src/lib/zip/build-record-zip.ts");
const recordZipRoute = readProjectFile("src/app/api/records/[id]/zip/route.ts");
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
  captureRecordFormatters,
  /`\/registros\/\$\{encodeURIComponent\(recordId\)\}`/,
  "capture record detail routes must encode ids and point to the real details page",
);
assert.match(
  captureRecordFormatters,
  /`\/captura\/\$\{encodeURIComponent\(recordId\)\}`/,
  "capture resume routes must encode ids and remain available separately from details",
);
assert.match(
  dashboardClient,
  /href=\{record\.detailHref\}[\s\S]*Abrir/,
  "dashboard record list primary action must open the real details page",
);
assert.match(
  dashboardClient,
  /href=\{record\.resumeHref\}[\s\S]*Continuar/,
  "dashboard record list may expose capture resume as a separate action",
);
assert.match(
  evidenceCard,
  /href=\{record\.detailHref\}/,
  "mobile evidence cards must open the real details page",
);
assert.doesNotMatch(
  `${dashboardClient}\n${evidenceCard}`,
  /\/captura\/concluida/,
  "real capture record list actions must not route to the old completion page",
);
assert.doesNotMatch(
  `${dashboardClient}\n${evidenceCard}`,
  /\/registros\/\$\{record\.id\}/,
  "real capture record list actions must use encoded shared route helpers instead of inline ids",
);
assert.match(
  captureClient,
  /getCaptureResumeHref\(result\.data\.id\)/,
  "capture creation must navigate through the shared resume route helper",
);
assert.match(
  recordRow,
  /href=\{getCaptureDetailHref\(record\.id\)\}/,
  "legacy record rows must navigate through the shared detail route helper",
);
assert.match(
  recordReportPage,
  /href=\{getCaptureDetailHref\(report\.id\)\}/,
  "legacy report page back links must navigate through the shared detail route helper",
);
assert.match(
  recordDetailsPage,
  /params:\s*Promise<\{\s*id: string\s*\}>/,
  "record details page must type dynamic route params using the current App Router contract",
);
assert.match(
  recordDetailsPage,
  /const \{ id \} = await params;/,
  "record details page must await dynamic route params",
);
assert.match(
  recordDetailsPage,
  /getCaptureRecord\(id\)/,
  "record details page must fetch the capture record through the gateway",
);
assert.match(
  recordDetailsPage,
  /getUserProfile\(recordResult\.data\.userId\)/,
  "record details page must fetch responsible user name and email through the gateway",
);
assert.match(
  recordDetailsPage,
  /toCaptureRecordDetailView\(/,
  "record details page must map backend data through the details view model",
);
assert.doesNotMatch(
  recordDetailsPage,
  /@\/lib\/mock-data|getRecordById|chainOfCustody/,
  "record details page must not render mock-backed detail or custody content",
);
assert.match(
  recordDetailsPage,
  /\/registros\/\$\{encodeURIComponent\(record\.id\)\}\/relatorio/,
  "completed record details must link to the real report route",
);
assert.match(
  recordDetailsPage,
  /\/api\/records\/\$\{encodeURIComponent\(record\.id\)\}\/zip/,
  "completed record details must link to the real ZIP route",
);
assert.match(
  recordDetailsPage,
  /isCompleted && hasAssets/,
  "ZIP download action must require a completed record with captured assets",
);
assert.match(
  recordReportPage,
  /getCaptureRecord\(id\)[\s\S]*getUserProfile\(recordResult\.data\.userId\)[\s\S]*listCaptureAssets\(id\)[\s\S]*toRecordReportView\(/,
  "report page must build reports from real gateway record, responsible user, and asset data",
);
assert.doesNotMatch(
  `${recordReportPage}\n${recordReportClient}\n${recordReportDocument}\n${recordZipBuilder}\n${recordZipRoute}`,
  /@\/lib\/mock-data|VeriditRecord|getRecordById|chainOfCustody|reportValidationItems|getAuthSession|mock-screenshot|screenshot\.txt|video\.txt/,
  "report and ZIP flows must not use mock records, mock custody data, or placeholder files",
);
assert.match(
  recordReportDocument,
  /Informações do registro[\s\S]*Responsável[\s\S]*Imagens capturadas[\s\S]*Vídeos capturados[\s\S]*Arquivos gerados pelo sistema/,
  "report document must render the real report sections",
);
assert.match(
  recordZipRoute,
  /downloadCaptureAssetBytes\(id, asset\.id\)/,
  "ZIP route must download real asset bytes from the gateway",
);
assert.match(
  recordZipBuilder,
  /zip\.file\("metadata\.json"[\s\S]*`assets\/\$\{getUniqueFileName\(file\.asset\.fileName, usedFileNames\)\}`/,
  "ZIP builder must include real metadata and captured asset files",
);
assert.doesNotMatch(
  `${readProjectFile("package.json")}\n${readProjectFile("../../package-lock.json")}`,
  /file-saver/,
  "web package must not keep unused file-saver dependencies",
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
