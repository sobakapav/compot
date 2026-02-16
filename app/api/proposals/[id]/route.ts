import { NextResponse } from "next/server";
import { getProposal } from "../../../../lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const item = await getProposal(context.params.id);
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
