import { NextResponse } from "next/server";

import { ping } from "@/repositories/health-repository";

/**
 * Liveness and readiness. The JSON body is deliberately tiny: orchestrators only
 * need to know whether to keep sending traffic, not versions or connection strings.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUp = await ping();

  const headers = { "Cache-Control": "no-store, max-age=0" };

  if (!databaseUp) {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }

  return NextResponse.json({ status: "ok" }, { status: 200, headers });
}
