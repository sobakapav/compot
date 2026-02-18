import { promises as fs } from "fs";
import path from "path";
import type { Proposal } from "./schema";

export type StoredProposalVersion = {
  proposalId: string;
  versionId: string;
  createdAt: string;
  source?: "manual" | "autosave" | "pdf" | "create";
  pdf?: boolean;
  proposal: Proposal;
  selectedCaseIds?: string[];
  planTasks?: { id: string; title: string; start: string; end: string }[];
};

const proposalsDir = path.join(process.cwd(), "data", "proposals");

const ensureDir = async () => {
  await fs.mkdir(proposalsDir, { recursive: true });
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const saveProposalVersion = async ({
  proposal,
  proposalId,
  source,
  pdf,
  selectedCaseIds,
  planTasks,
}: {
  proposal: Proposal;
  proposalId?: string;
  source?: "manual" | "autosave" | "pdf" | "create";
  pdf?: boolean;
  selectedCaseIds?: string[];
  planTasks?: { id: string; title: string; start: string; end: string }[];
}) => {
  await ensureDir();
  const pid = proposalId ?? makeId();
  const versionId = makeId();
  const stored: StoredProposalVersion = {
    proposalId: pid,
    versionId,
    createdAt: new Date().toISOString(),
    source,
    pdf: Boolean(pdf),
    proposal,
    selectedCaseIds: selectedCaseIds ?? [],
    planTasks: planTasks ?? [],
  };
  const dir = path.join(proposalsDir, pid, "versions", versionId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "proposal.json"),
    JSON.stringify(stored, null, 2),
    "utf-8"
  );
  return stored;
};

const readVersion = async (filePath: string) => {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as StoredProposalVersion;
};

export const listProposals = async () => {
  await ensureDir();
  const entries = await fs.readdir(proposalsDir, { withFileTypes: true });
  const items: {
    proposalId: string;
    versions: StoredProposalVersion[];
    latest: StoredProposalVersion | null;
  }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const proposalId = entry.name;
    const versionsDir = path.join(proposalsDir, proposalId, "versions");
    try {
      let versions: StoredProposalVersion[] = [];
      try {
        const versionEntries = await fs.readdir(versionsDir, {
          withFileTypes: true,
        });
        for (const versionEntry of versionEntries) {
          if (!versionEntry.isDirectory()) continue;
          const filePath = path.join(
            versionsDir,
            versionEntry.name,
            "proposal.json"
          );
          try {
            versions.push(await readVersion(filePath));
          } catch {
            continue;
          }
        }
      } catch {
        // fallback to legacy single-file format
        const legacyPath = path.join(proposalsDir, proposalId, "proposal.json");
        try {
          const raw = await fs.readFile(legacyPath, "utf-8");
          const legacy = JSON.parse(raw) as {
            id?: string;
            createdAt?: string;
            proposal?: Proposal;
          };
          if (legacy?.proposal) {
            versions = [
              {
                proposalId,
                versionId: legacy.id ?? proposalId,
                createdAt: legacy.createdAt ?? new Date().toISOString(),
                source: "manual",
                pdf: false,
                proposal: legacy.proposal,
              },
            ];
          }
        } catch {
          versions = [];
        }
      }
      versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const latest =
        versions.find((v) => v.source !== "autosave") ?? versions[0] ?? null;
      if (versions.length) {
        items.push({ proposalId, versions, latest });
      }
    } catch {
      continue;
    }
  }
  return items.sort((a, b) => {
    const aDate = a.latest?.createdAt ?? "";
    const bDate = b.latest?.createdAt ?? "";
    return bDate.localeCompare(aDate);
  });
};

export const getProposal = async (proposalId: string, versionId?: string) => {
  const versionsDir = path.join(proposalsDir, proposalId, "versions");
  if (versionId) {
    const filePath = path.join(versionsDir, versionId, "proposal.json");
    try {
      return await readVersion(filePath);
    } catch {
      const legacyPath = path.join(proposalsDir, proposalId, "proposal.json");
      const raw = await fs.readFile(legacyPath, "utf-8");
      const legacy = JSON.parse(raw) as {
        id?: string;
        createdAt?: string;
        proposal?: Proposal;
      };
      if (!legacy?.proposal) throw new Error("Not found");
      return {
        proposalId,
        versionId: legacy.id ?? proposalId,
        createdAt: legacy.createdAt ?? new Date().toISOString(),
        source: "manual",
        pdf: false,
        proposal: legacy.proposal,
      } satisfies StoredProposalVersion;
    }
  }
  const versions: StoredProposalVersion[] = [];
  try {
    const entries = await fs.readdir(versionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const filePath = path.join(versionsDir, entry.name, "proposal.json");
      try {
        versions.push(await readVersion(filePath));
      } catch {
        continue;
      }
    }
  } catch {
    // ignore and fallback to legacy
  }
  if (versions.length === 0) {
    const legacyPath = path.join(proposalsDir, proposalId, "proposal.json");
    const raw = await fs.readFile(legacyPath, "utf-8");
    const legacy = JSON.parse(raw) as {
      id?: string;
      createdAt?: string;
      proposal?: Proposal;
    };
    if (!legacy?.proposal) throw new Error("Not found");
    return {
      proposalId,
      versionId: legacy.id ?? proposalId,
      createdAt: legacy.createdAt ?? new Date().toISOString(),
      source: "manual",
      pdf: false,
      proposal: legacy.proposal,
    } satisfies StoredProposalVersion;
  }
  versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest =
    versions.find((v) => v.source !== "autosave") ?? versions[0];
  if (!latest) throw new Error("Not found");
  return latest;
};
