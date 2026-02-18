import { NextResponse } from "next/server";
import { getProposal } from "../../../../lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId") ?? undefined;
    const { id } = await context.params;
    const item = await getProposal(id, versionId);
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
