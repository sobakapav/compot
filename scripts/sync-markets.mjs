import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SOURCE_URL =
  process.env.MARKETS_URL ?? "https://sobakapav.ru/listMarkets.json";
const MARKETS_DIR = path.join(process.cwd(), "data", "markets");
const INDEX_PATH = path.join(MARKETS_DIR, "index.json");
const SYNC_PATH = path.join(MARKETS_DIR, "sync.json");

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

const normalizeMarkets = (payload) => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.markets)
        ? payload.markets
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
        const id = item.id || item.code || item.slug || item.marketId || item.name;
        const title = item.title || item.name || "";
        if (!id) return null;
        return {
          id: String(id).trim(),
          title: String(title).trim(),
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
          };
        }
        if (value && typeof value === "object") {
          const id =
            value.id || value.code || value.slug || value.marketId || key || "";
          const title = value.title || value.name || "";
          if (!id) return null;
          return {
            id: String(id).trim(),
            title: String(title).trim(),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  return [];
};

const readLocalMarkets = async () => {
  const index = await safeReadJson(INDEX_PATH, { items: [] });
  if (Array.isArray(index.items) && index.items.length > 0) {
    return index.items;
  }

  let entries = [];
  try {
    entries = await fs.readdir(MARKETS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    const marketPath = path.join(MARKETS_DIR, entry.name, "market.json");
    const market = await safeReadJson(marketPath, null);
    if (!market?.id || !market?.title) continue;
    items.push({ id: market.id, title: market.title });
  }
  return items;
};

export const syncMarkets = async ({
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
      console.warn("Failed to fetch markets list:", error);
    }
    const fallbackItems = await readLocalMarkets();
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

  const normalized = normalizeMarkets(payload);
  if (normalized.length === 0) {
    const fallbackItems = await readLocalMarkets();
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
    const marketDir = path.join(MARKETS_DIR, item.id);
    const marketPath = path.join(marketDir, "market.json");
    const existing = await safeReadJson(marketPath, {});

    const title = item.title || existing.title || "";

    const missing = [];
    if (!item.title) missing.push("title");
    if (missing.length > 0) {
      missingFields.push({ id: item.id, missing });
    }

    await fs.mkdir(marketDir, { recursive: true });

    const createdAt = existing.createdAt || now.toISOString();
    await writeJson(marketPath, {
      schemaVersion: 1,
      id: item.id,
      title,
      createdAt,
      updatedAt: now.toISOString(),
    });

    updatedItems.push({ id: item.id, title });
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
    console.warn("Markets with missing fields in source:", missingFields);
  }

  return syncResult;
};

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const force = process.argv.includes("--force");
  const strict = force || process.env.SYNC_STRICT === "1";
  const result = await syncMarkets({ force, log: true });
  if (result.status === "failed") {
    if (strict) {
      process.exitCode = 1;
    } else {
      console.warn("[markets] Sync failed, continuing in non-strict mode.");
    }
  }
}
