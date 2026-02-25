import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { syncClients } = await import(
      "../../../../scripts/sync-clients.mjs"
    );
    const result = await syncClients({ force: true });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { status: "failed", error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
