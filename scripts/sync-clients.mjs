import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SOURCE_URL =
  process.env.CLIENTS_URL ?? "https://sobakapav.ru/listClients.json";
const CLIENTS_DIR = path.join(process.cwd(), "data", "clients");
const INDEX_PATH = path.join(CLIENTS_DIR, "index.json");
const SYNC_PATH = path.join(CLIENTS_DIR, "sync.json");

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
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeClients = (payload) => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.clients)
        ? payload.clients
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
        const id = item.id || item.code || item.slug || item.clientId || item.name;
        const title = item.title || item.name || "";
        const logo = item.logo || item.image || item.logoUrl || "";
        const link = item.link || item.url || "";
        const markets = toArray(item.markets ?? item.market).map((value) =>
          typeof value === "string"
            ? value
            : value?.id || value?.slug || value?.code || value?.title || ""
        );
        if (!id) return null;
        return {
          id: String(id).trim(),
          title: String(title).trim(),
          logo: String(logo).trim(),
          link: String(link).trim(),
          markets: markets.filter(Boolean).map((value) => String(value)),
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
            logo: "",
            link: "",
            markets: [],
          };
        }
        if (value && typeof value === "object") {
          const id =
            value.id || value.code || value.slug || value.clientId || key || "";
          const title = value.title || value.name || "";
          const logo = value.logo || value.image || value.logoUrl || "";
          const link = value.link || value.url || "";
          const markets = toArray(value.markets ?? value.market).map((market) =>
            typeof market === "string"
              ? market
              : market?.id || market?.slug || market?.code || market?.title || ""
          );
          if (!id) return null;
          return {
            id: String(id).trim(),
            title: String(title).trim(),
            logo: String(logo).trim(),
            link: String(link).trim(),
            markets: markets.filter(Boolean).map((value) => String(value)),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  return [];
};

const readLocalClients = async () => {
  const index = await safeReadJson(INDEX_PATH, { items: [] });
  if (Array.isArray(index.items) && index.items.length > 0) {
    return index.items;
  }

  let entries = [];
  try {
    entries = await fs.readdir(CLIENTS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    const clientPath = path.join(CLIENTS_DIR, entry.name, "client.json");
    const client = await safeReadJson(clientPath, null);
    if (!client?.id || !client?.title) continue;
    items.push({
      id: client.id,
      title: client.title,
      logo: client.logo ?? "",
      link: client.link ?? "",
      markets: client.markets ?? [],
    });
  }
  return items;
};

export const syncClients = async ({
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
      console.warn("Failed to fetch clients list:", error);
    }
    const fallbackItems = await readLocalClients();
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

  const normalized = normalizeClients(payload);
  if (normalized.length === 0) {
    const fallbackItems = await readLocalClients();
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

  const missingFields = [];
  const updatedItems = [];

  for (const item of normalized) {
    const clientDir = path.join(CLIENTS_DIR, item.id);
    const clientPath = path.join(clientDir, "client.json");
    const existing = await safeReadJson(clientPath, {});

    const title = item.title || existing.title || "";
    const logo = item.logo || existing.logo || "";
    const link = item.link || existing.link || "";
    const markets = item.markets?.length ? item.markets : existing.markets || [];

    const missing = [];
    if (!item.title) missing.push("title");
    if (!item.logo) missing.push("logo");
    if (!item.link) missing.push("link");
    if (!item.markets || item.markets.length === 0) missing.push("markets");
    if (missing.length > 0) {
      missingFields.push({ id: item.id, missing });
    }

    await fs.mkdir(clientDir, { recursive: true });

    const createdAt = existing.createdAt || now.toISOString();
    await writeJson(clientPath, {
      schemaVersion: 1,
      id: item.id,
      title,
      logo,
      link,
      markets,
      createdAt,
      updatedAt: now.toISOString(),
    });

    updatedItems.push({ id: item.id, title, logo, link, markets });
  }

  await writeJson(INDEX_PATH, {
    schemaVersion: 1,
    items: updatedItems,
  });

  const syncResult = {
    status: "synced",
    syncedAt: now.toISOString(),
    lastSyncDate: today,
    sourceUrl: SOURCE_URL,
    itemsCount: updatedItems.length,
    missingFields,
  };

  await writeJson(SYNC_PATH, {
    schemaVersion: 1,
    ...syncResult,
  });

  if (log && missingFields.length > 0) {
    console.warn("Clients with missing fields in source:", missingFields);
  }

  return syncResult;
};

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const force = process.argv.includes("--force");
  const strict = force || process.env.SYNC_STRICT === "1";
  const result = await syncClients({ force, log: true });
  if (result.status === "failed") {
    if (strict) {
      process.exitCode = 1;
    } else {
      console.warn("[clients] Sync failed, continuing in non-strict mode.");
    }
  }
}
