import { NextResponse } from "next/server";
import { proposalSchema } from "../../../lib/schema";
import { listProposals, saveProposalVersion } from "../../../lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const proposals = await listProposals();
  const items = proposals.map((group) => {
    const latest = group.latest;
    const proposal = latest?.proposal;
    return {
      proposalId: group.proposalId,
      latestVersionId: latest?.versionId ?? "",
      latestCreatedAt: latest?.createdAt ?? "",
      clientName: proposal?.clientName ?? "",
      serviceName: proposal?.serviceName ?? "",
      versions: group.versions.map((version) => ({
        versionId: version.versionId,
        createdAt: version.createdAt,
        pdf: Boolean(version.pdf),
        source: version.source ?? "",
      })),
    };
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const proposalPayload = body?.proposal ?? body ?? {};
  const parsed = proposalSchema.safeParse(proposalPayload);
  if (!parsed.success) {
    const fallback = proposalSchema.parse({});
    const saved = await saveProposalVersion({
      proposal: fallback,
      proposalId: body?.proposalId,
      source: body?.source,
      pdf: body?.pdf,
      selectedCaseIds: body?.selectedCaseIds ?? [],
      planTasks: body?.planTasks ?? [],
    });
    return NextResponse.json({
      proposalId: saved.proposalId,
      versionId: saved.versionId,
      createdAt: saved.createdAt,
      fallback: true,
    });
  }
  const saved = await saveProposalVersion({
    proposal: parsed.data,
    proposalId: body?.proposalId,
    source: body?.source,
    pdf: body?.pdf,
    selectedCaseIds: body?.selectedCaseIds ?? [],
    planTasks: body?.planTasks ?? [],
  });
  return NextResponse.json({
    proposalId: saved.proposalId,
    versionId: saved.versionId,
    createdAt: saved.createdAt,
  });
}
