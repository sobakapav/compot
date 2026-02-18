import { NextResponse } from "next/server";
import {
  deleteProposalVersion,
  getProposal,
  markProposalVersion,
} from "../../../../lib/storage";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const marked = await markProposalVersion(id, body?.versionId);
    return NextResponse.json({ marked });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId");
    if (!versionId) {
      return NextResponse.json(
        { error: "Missing versionId" },
        { status: 400 }
      );
    }
    const { id } = await context.params;
    await deleteProposalVersion(id, versionId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
