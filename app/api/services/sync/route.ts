import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST() {
  try {
    const { syncServices } = await import(
      "../../../../scripts/sync-services.mjs"
    );
    const result = await syncServices({ force: true });
    if (result.status === "failed") {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { status: "failed", reason: "sync-import-failed", error: String(error) },
      { status: 500 }
    );
  }
}
