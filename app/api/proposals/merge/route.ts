import { NextResponse } from "next/server";
import { mergeProposals } from "../../../../lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceId = body?.sourceId;
    const targetId = body?.targetId;
    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: "Missing ids" },
        { status: 400 }
      );
    }
    await mergeProposals(targetId, sourceId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to merge" }, { status: 500 });
  }
}
