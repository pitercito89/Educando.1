import { cookies } from "next/headers";
import { authenticateUser, type UserRole } from "./db";
import { verifyPassword } from "./security";

export const SESSION_COOKIE = "educando_session";

type UserRecord = {
  username: string;
  password: string;
  role: "admin";
  fullName: string;
};

export type SessionUser = {
  username: string;
  role: UserRole;
  fullName: string;
  schoolUserId?: number;
  studentId?: number;
  parentId?: number;
};

const USERS: UserRecord[] = [
  {
    username: "admin",
    password: "$2b$10$FlxRmuEEQNx6MWVel0X2r.FsjUeQNTqo8S.REuF6vtrsEcYuSRqNS",
    role: "admin",
    fullName: "Administrador General",
  },
];

function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

function decodeSession(value: string): SessionUser | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SessionUser;

    if (!parsed?.username || !parsed?.role || !parsed?.fullName) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const foundRemote = await authenticateUser(username, password);
  if (!foundRemote.error && foundRemote.data) {
    return {
      username: foundRemote.data.username,
      role: foundRemote.data.role,
      fullName: foundRemote.data.fullName,
      schoolUserId: foundRemote.data.schoolUserId,
      studentId: foundRemote.data.studentId,
      parentId: foundRemote.data.parentId,
    };
  }

  const local = USERS.find((user) => user.username === username);
  if (!local) return null;
  const ok = await verifyPassword(password, local.password);
  if (!ok) return null;

  return {
    username: local.username,
    role: local.role,
    fullName: local.fullName,
  };
}

export async function createSession(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  return decodeSession(raw);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
