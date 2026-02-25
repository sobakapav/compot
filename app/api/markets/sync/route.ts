import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { syncMarkets } = await import(
      "../../../../scripts/sync-markets.mjs"
    );
    const result = await syncMarkets({ force: true });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { status: "failed", error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
