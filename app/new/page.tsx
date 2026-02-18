import { redirect } from "next/navigation";
import { proposalSchema } from "../../lib/schema";
import { saveProposalVersion } from "../../lib/storage";

export const runtime = "nodejs";

export default async function NewProposalPage() {
  const proposal = proposalSchema.parse({});
  const target = new Date();
  target.setDate(target.getDate() + 14);
  const day = target.getDay();
  if (day === 6) target.setDate(target.getDate() + 2);
  if (day === 0) target.setDate(target.getDate() + 1);
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formatted = formatter.format(target);
  const parts = formatted.split(" ");
  const longDate =
    parts.length >= 3
      ? `${parts[0]} ${parts[1]} ${parts[2]} года`.toUpperCase()
      : formatted.toUpperCase();
  proposal.validUntil = longDate;
  const saved = await saveProposalVersion({
    proposal,
    source: "create",
    selectedCaseIds: [],
    planTasks: [],
  });
  redirect(
    `/edit?proposalId=${saved.proposalId}&versionId=${saved.versionId}&new=1`
  );
}
