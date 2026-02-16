import { promises as fs } from "fs";
import path from "path";
import type { Proposal } from "./schema";

export type StoredProposal = {
  id: string;
  createdAt: string;
  proposal: Proposal;
};

const proposalsDir = path.join(process.cwd(), "data", "proposals");

const ensureDir = async () => {
  await fs.mkdir(proposalsDir, { recursive: true });
};

export const saveProposal = async (proposal: Proposal) => {
  await ensureDir();
  const id = `${Date.now()}`;
  const stored: StoredProposal = {
    id,
    createdAt: new Date().toISOString(),
    proposal,
  };
  const dir = path.join(proposalsDir, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "proposal.json"),
    JSON.stringify(stored, null, 2),
    "utf-8"
  );
  return stored;
};

export const listProposals = async () => {
  await ensureDir();
  const entries = await fs.readdir(proposalsDir, { withFileTypes: true });
  const items: StoredProposal[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const filePath = path.join(proposalsDir, entry.name, "proposal.json");
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      items.push(JSON.parse(raw) as StoredProposal);
    } catch {
      continue;
    }
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getProposal = async (id: string) => {
  const filePath = path.join(proposalsDir, id, "proposal.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as StoredProposal;
};
