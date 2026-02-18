import { promises as fs } from "fs";
import path from "path";

const baseDir = path.join(process.cwd(), "data", "proposals");

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const migrateProposal = async (proposalId) => {
  const proposalDir = path.join(baseDir, proposalId);
  const legacyPath = path.join(proposalDir, "proposal.json");
  try {
    await fs.access(legacyPath);
  } catch {
    return { migrated: 0 };
  }
  const raw = await fs.readFile(legacyPath, "utf-8");
  const legacy = JSON.parse(raw);
  const createdAt = legacy?.createdAt ?? new Date().toISOString();
  const versionId = legacy?.id ?? makeId();
  const stored = {
    proposalId,
    versionId,
    createdAt,
    source: "manual",
    pdf: Boolean(legacy?.pdf),
    proposal: legacy?.proposal ?? {},
    selectedCaseIds: legacy?.selectedCaseIds ?? [],
    planTasks: legacy?.planTasks ?? [],
  };
  const versionsDir = path.join(proposalDir, "versions", versionId);
  await fs.mkdir(versionsDir, { recursive: true });
  await fs.writeFile(
    path.join(versionsDir, "proposal.json"),
    JSON.stringify(stored, null, 2),
    "utf-8"
  );
  return { migrated: 1 };
};

const main = async () => {
  let migrated = 0;
  let checked = 0;
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    checked += 1;
    const result = await migrateProposal(entry.name);
    migrated += result.migrated;
  }
  console.log(`[migrate] Checked ${checked} proposals, migrated ${migrated}.`);
};

main().catch((err) => {
  console.error("[migrate] Failed", err);
  process.exit(1);
});
