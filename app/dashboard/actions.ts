"use server";

import { clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
