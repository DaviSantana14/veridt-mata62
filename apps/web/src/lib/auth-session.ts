export const AUTH_SESSION_STORAGE_KEY = "veridit.auth.session";
export const AUTH_SESSION_CHANGED_EVENT = "veridit.auth.session.changed";

type AuthProfile = "COMMON_USER" | "LAWYER";

export type AuthSession = {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    profile: AuthProfile;
  };
};

function isBrowser() {
  return typeof window !== "undefined";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProfile(value: unknown): value is AuthProfile {
  return value === "COMMON_USER" || value === "LAWYER";
}

function notifyAuthSessionChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

function removeStoredAuthSession(notify = true) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

  if (notify) {
    notifyAuthSessionChange();
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!isObject(value) || typeof value.accessToken !== "string") {
    return false;
  }

  const user = value.user;

  return (
    isObject(user) &&
    typeof user.id === "string" &&
    typeof user.fullName === "string" &&
    typeof user.email === "string" &&
    isProfile(user.profile)
  );
}

export function saveAuthSession(session: AuthSession) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
  notifyAuthSessionChange();
}

export function clearAuthSession() {
  removeStoredAuthSession();
}

export function getAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const storedSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(storedSession);

    if (isAuthSession(parsedSession)) {
      return parsedSession;
    }
  } catch {
    // Invalid persisted JSON should behave as a logged-out session.
  }

  removeStoredAuthSession(false);
  return null;
}
