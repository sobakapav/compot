import { NextResponse } from "next/server";
import { proposalSchema } from "../../../lib/schema";
import { listProposals, saveProposal } from "../../../lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const proposals = await listProposals();
  const items = proposals
    .map((item) => {
      const proposal = (item as typeof item & { proposal?: any }).proposal;
      if (!proposal) return null;
      return {
        id: item.id,
        createdAt: item.createdAt,
        clientName: proposal.clientName ?? "",
        serviceName: proposal.serviceName ?? "",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const saved = await saveProposal(parsed.data);
  return NextResponse.json({
    id: saved.id,
    createdAt: saved.createdAt,
  });
}
