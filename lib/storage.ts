import { promises as fs } from "fs";
import path from "path";
import { getDataRepoPath } from "./config";
import { ensureAutoPushStarted } from "./data-repo";
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

const getProposalsDir = async () =>
  path.join(await getDataRepoPath(), "proposals");

const ensureDir = async (proposalsDir: string) => {
  await fs.mkdir(proposalsDir, { recursive: true });
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const markedPath = (proposalsDir: string, proposalId: string) =>
  path.join(proposalsDir, proposalId, "marked.json");

const readMarkedVersionId = async (
  proposalsDir: string,
  proposalId: string
) => {
  try {
    const raw = await fs.readFile(markedPath(proposalsDir, proposalId), "utf-8");
    const data = JSON.parse(raw) as { versionId?: string; locked?: boolean };
    return {
      versionId: data?.versionId ?? null,
      locked: Boolean(data?.locked),
    };
  } catch {
    return { versionId: null, locked: false };
  }
};

const writeMarkedVersionId = async (
  proposalsDir: string,
  proposalId: string,
  versionId: string,
  locked: boolean
) => {
  await fs.writeFile(
    markedPath(proposalsDir, proposalId),
    JSON.stringify(
      { versionId, locked, markedAt: new Date().toISOString() },
      null,
      2
    ),
    "utf-8"
  );
};

const chooseDefaultMarked = (versions: StoredProposalVersion[]) => {
  if (versions.length === 0) return null;
  const latestPdf = versions.find((version) => version.pdf);
  return latestPdf ?? versions[0];
};

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
  await ensureAutoPushStarted();
  const proposalsDir = await getProposalsDir();
  await ensureDir(proposalsDir);
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
  await ensureAutoPushStarted();
  const proposalsDir = await getProposalsDir();
  await ensureDir(proposalsDir);
  const entries = await fs.readdir(proposalsDir, { withFileTypes: true });
  const items: {
    proposalId: string;
    versions: StoredProposalVersion[];
    latest: StoredProposalVersion | null;
    marked: StoredProposalVersion | null;
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
        const markedState = await readMarkedVersionId(proposalsDir, proposalId);
        let marked =
          versions.find(
            (version) => version.versionId === markedState.versionId
          ) ?? null;
        if (!marked || !markedState.locked) {
          const nextMarked = chooseDefaultMarked(versions);
          if (nextMarked) {
            if (
              nextMarked.versionId !== markedState.versionId ||
              markedState.locked
            ) {
              await writeMarkedVersionId(
                proposalsDir,
                proposalId,
                nextMarked.versionId,
                false
              );
            }
            marked = nextMarked;
          }
        }
        items.push({ proposalId, versions, latest, marked });
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
  await ensureAutoPushStarted();
  const proposalsDir = await getProposalsDir();
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
  const markedState = await readMarkedVersionId(proposalsDir, proposalId);
  let marked =
    versions.find((version) => version.versionId === markedState.versionId) ??
    null;
  if (marked && markedState.locked) return marked;
  if (!markedState.locked) {
    const nextMarked = chooseDefaultMarked(versions);
    if (nextMarked) {
      if (nextMarked.versionId !== markedState.versionId) {
        await writeMarkedVersionId(
          proposalsDir,
          proposalId,
          nextMarked.versionId,
          false
        );
      }
      marked = nextMarked;
    }
  }
  if (marked) return marked;
  const latest =
    versions.find((v) => v.source !== "autosave") ?? versions[0];
  if (!latest) throw new Error("Not found");
  return latest;
};

export const markProposalVersion = async (
  proposalId: string,
  versionId?: string
) => {
  await ensureAutoPushStarted();
  const proposalsDir = await getProposalsDir();
  await ensureDir(proposalsDir);
  const versionsDir = path.join(proposalsDir, proposalId, "versions");
  const versions: StoredProposalVersion[] = [];
  const entries = await fs.readdir(versionsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const filePath = path.join(versionsDir, entry.name, "proposal.json");
      versions.push(await readVersion(filePath));
    } catch {
      continue;
    }
  }
  versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let marked = versionId
    ? versions.find((version) => version.versionId === versionId) ?? null
    : null;
  if (!marked) {
    marked = chooseDefaultMarked(versions);
  }
  if (!marked) throw new Error("Not found");
  await writeMarkedVersionId(
    proposalsDir,
    proposalId,
    marked.versionId,
    Boolean(versionId)
  );
  return marked;
};

export const deleteProposalVersion = async (
  proposalId: string,
  versionId: string
) => {
  await ensureAutoPushStarted();
  const proposalsDir = await getProposalsDir();
  const versionDir = path.join(
    proposalsDir,
    proposalId,
    "versions",
    versionId
  );
  await fs.rm(versionDir, { recursive: true, force: true });
  const versionsDir = path.join(proposalsDir, proposalId, "versions");
  const remaining: StoredProposalVersion[] = [];
  try {
    const entries = await fs.readdir(versionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const filePath = path.join(versionsDir, entry.name, "proposal.json");
        remaining.push(await readVersion(filePath));
      } catch {
        continue;
      }
    }
  } catch {
    // ignore
  }
  remaining.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const markedState = await readMarkedVersionId(proposalsDir, proposalId);
  if (markedState.versionId === versionId) {
    const marked = chooseDefaultMarked(remaining);
    if (marked) {
      await writeMarkedVersionId(
        proposalsDir,
        proposalId,
        marked.versionId,
        false
      );
    }
  }
};

export const mergeProposals = async (
  targetId: string,
  sourceId: string
) => {
  await ensureAutoPushStarted();
  const proposalsDir = await getProposalsDir();
  if (targetId === sourceId) return;
  const targetVersionsDir = path.join(proposalsDir, targetId, "versions");
  const sourceVersionsDir = path.join(proposalsDir, sourceId, "versions");
  await fs.mkdir(targetVersionsDir, { recursive: true });
  const entries = await fs.readdir(sourceVersionsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fromDir = path.join(sourceVersionsDir, entry.name);
    let toDir = path.join(targetVersionsDir, entry.name);
    try {
      await fs.access(toDir);
      const newId = makeId();
      toDir = path.join(targetVersionsDir, newId);
    } catch {
      // destination free
    }
    await fs.rename(fromDir, toDir);
  }
  await fs.rm(path.join(proposalsDir, sourceId), {
    recursive: true,
    force: true,
  });
  const versions: StoredProposalVersion[] = [];
  const targetEntries = await fs.readdir(targetVersionsDir, {
    withFileTypes: true,
  });
  for (const entry of targetEntries) {
    if (!entry.isDirectory()) continue;
    try {
      const filePath = path.join(targetVersionsDir, entry.name, "proposal.json");
      versions.push(await readVersion(filePath));
    } catch {
      continue;
    }
  }
  versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const marked = chooseDefaultMarked(versions);
  if (marked) {
    await writeMarkedVersionId(proposalsDir, targetId, marked.versionId, false);
  }
};
