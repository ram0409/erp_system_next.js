import "server-only";

import { cookies } from "next/headers";

import { isProduction } from "@/config/env";
import {
  WORKSPACE_COOKIE_MAX_AGE_SECONDS,
  WORKSPACE_COOKIE_NAME,
  parseWorkspaceCookie,
  serializeWorkspaceCookie,
  type WorkspaceCookieValue,
} from "@/constants/workspace";

export async function readWorkspaceCookie(): Promise<WorkspaceCookieValue | null> {
  const cookieStore = await cookies();
  return parseWorkspaceCookie(cookieStore.get(WORKSPACE_COOKIE_NAME)?.value);
}

export async function setWorkspaceCookie(value: WorkspaceCookieValue): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: WORKSPACE_COOKIE_NAME,
    value: serializeWorkspaceCookie(value),
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: WORKSPACE_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearWorkspaceCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: WORKSPACE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  });
}
