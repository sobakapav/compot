import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SOURCE_URL = "https://sobakapav.ru/listServices.json";
const SERVICES_DIR = path.join(process.cwd(), "data", "services");
const INDEX_PATH = path.join(SERVICES_DIR, "index.json");
const SYNC_PATH = path.join(SERVICES_DIR, "sync.json");
const PROPOSALS_DIR = path.join(process.cwd(), "data", "proposals");

const DEFAULT_TIMEOUT_MS = 10_000;

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const safeReadJson = async (filePath, fallback) => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
};

const extractIdFromLink = (link) => {
  if (!link || typeof link !== "string") return "";
  try {
    const url = new URL(link);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    const last = parts[parts.length - 1];
    if (parts[parts.length - 2] === "services") return last;
    return last;
  } catch {
    return "";
  }
};

const normalizeItems = (payload) => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.services)
        ? payload.services
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.list)
              ? payload.list
              : null;

  if (items) {
    return items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id =
          item.id ||
          item.slug ||
          item.code ||
          item.serviceId ||
          extractIdFromLink(item.link || item.url);
        const title = item.title || item.name || item.label || "";
        const link =
          item.link ||
          item.url ||
          (id ? `https://sobakapav.ru/services/${id}` : "");
        if (!id) return null;
        return {
          id: String(id).trim(),
          title: String(title).trim(),
          link: String(link).trim(),
        };
      })
      .filter(Boolean);
  }

  if (payload && typeof payload === "object") {
    return Object.entries(payload)
      .map(([key, value]) => {
        if (!key) return null;
        if (typeof value === "string") {
          return {
            id: String(key).trim(),
            title: value.trim(),
            link: `https://sobakapav.ru/services/${String(key).trim()}`,
          };
        }
        if (value && typeof value === "object") {
          const id =
            value.id ||
            value.slug ||
            value.code ||
            value.serviceId ||
            key ||
            extractIdFromLink(value.link || value.url);
          const title = value.title || value.name || value.label || "";
          const link =
            value.link ||
            value.url ||
            (id ? `https://sobakapav.ru/services/${id}` : "");
          if (!id) return null;
          return {
            id: String(id).trim(),
            title: String(title).trim(),
            link: String(link).trim(),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  return [];
};

const readLocalServices = async () => {
  const index = await safeReadJson(INDEX_PATH, { items: [] });
  if (Array.isArray(index.items) && index.items.length > 0) {
    return index.items;
  }

  let entries = [];
  try {
    entries = await fs.readdir(SERVICES_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    const servicePath = path.join(SERVICES_DIR, entry.name, "service.json");
    const service = await safeReadJson(servicePath, null);
    if (!service?.id || !service?.title) continue;
    items.push({ id: service.id, title: service.title });
  }
  return items;
};

const collectUsedServiceIds = async () => {
  const ids = new Set();
  let proposalDirs = [];

  try {
    proposalDirs = await fs.readdir(PROPOSALS_DIR, { withFileTypes: true });
  } catch {
    return ids;
  }

  for (const proposalDir of proposalDirs) {
    if (!proposalDir.isDirectory()) continue;
    const versionsDir = path.join(PROPOSALS_DIR, proposalDir.name, "versions");
    let versionDirs = [];
    try {
      versionDirs = await fs.readdir(versionsDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const versionDir of versionDirs) {
      if (!versionDir.isDirectory()) continue;
      const proposalPath = path.join(
        versionsDir,
        versionDir.name,
        "proposal.json"
      );
      const proposal = await safeReadJson(proposalPath, null);
      const serviceId = proposal?.serviceId;
      if (serviceId && typeof serviceId === "string") {
        ids.add(serviceId);
      }
    }
  }

  return ids;
};

export const syncServices = async ({
  force = false,
  now = new Date(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  log = false,
  throwOnError = false,
} = {}) => {
  const today = toLocalDateString(now);
  const syncState = await safeReadJson(SYNC_PATH, {});

  if (!force && syncState.lastSyncDate === today) {
    return {
      status: "skipped",
      reason: "already-synced",
      lastSyncDate: syncState.lastSyncDate ?? "",
      missingServiceIds: syncState.missingServiceIds ?? [],
      missingFields: syncState.missingFields ?? [],
    };
  }

  let payload;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    payload = await response.json();
  } catch (error) {
    if (log) {
      console.warn("Failed to fetch services list:", error);
    }
    const fallbackItems = await readLocalServices();
    if (fallbackItems.length > 0) {
      await writeJson(INDEX_PATH, {
        schemaVersion: 1,
        items: fallbackItems,
      });
    }
    if (throwOnError) throw error;
    return {
      status: "failed",
      reason: "fetch-failed",
      error: String(error?.message ?? error),
      fallbackCount: fallbackItems.length,
    };
  }

  const normalized = normalizeItems(payload);
  if (normalized.length === 0) {
    const fallbackItems = await readLocalServices();
    if (fallbackItems.length > 0) {
      await writeJson(INDEX_PATH, {
        schemaVersion: 1,
        items: fallbackItems,
      });
    }
    return {
      status: "failed",
      reason: "empty-source",
      itemsCount: normalized.length,
    };
  }
  const sourceMap = new Map(normalized.map((item) => [item.id, item]));

  const missingFields = [];
  const updatedItems = [];

  for (const item of normalized) {
    const serviceDir = path.join(SERVICES_DIR, item.id);
    const servicePath = path.join(serviceDir, "service.json");
    const existing = await safeReadJson(servicePath, {});

    const title = item.title || existing.title || "";
    const link = item.link || existing.link || "";

    const missing = [];
    if (!item.title) missing.push("title");
    if (!item.link) missing.push("link");
    if (missing.length > 0) {
      missingFields.push({ id: item.id, missing });
    }

    await fs.mkdir(serviceDir, { recursive: true });

    const createdAt = existing.createdAt || now.toISOString();
    await writeJson(servicePath, {
      schemaVersion: 1,
      id: item.id,
      title,
      link,
      createdAt,
      updatedAt: now.toISOString(),
    });

    updatedItems.push({ id: item.id, title });
  }

  await writeJson(INDEX_PATH, {
    schemaVersion: 1,
    items: updatedItems,
  });

  const usedServiceIds = await collectUsedServiceIds();
  const missingServiceIds = Array.from(usedServiceIds).filter(
    (id) => !sourceMap.has(id)
  );

  const syncResult = {
    status: "synced",
    syncedAt: now.toISOString(),
    lastSyncDate: today,
    sourceUrl: SOURCE_URL,
    itemsCount: updatedItems.length,
    missingServiceIds,
    missingFields,
  };

  await writeJson(SYNC_PATH, {
    schemaVersion: 1,
    ...syncResult,
  });

  if (log) {
    if (missingServiceIds.length > 0) {
      console.warn(
        "Missing services in source:",
        missingServiceIds.join(", ")
      );
    }
    if (missingFields.length > 0) {
      console.warn("Services with missing fields in source:", missingFields);
    }
  }

  return syncResult;
};

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const force = process.argv.includes("--force");
  const result = await syncServices({ force, log: true });
  if (result.status === "failed") {
    process.exitCode = 1;
  }
}
