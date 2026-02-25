import fs from "fs/promises";
import path from "path";

const rootDir = process.cwd();
const casesDir = path.join(rootDir, "data", "cases");
const rawPath = path.join(rootDir, "data", "links", "cases-raw.json");
const indexPath = path.join(casesDir, "index.json");

const readJson = async (filePath, fallback = null) => {
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

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeList = (values) =>
  toArray(values)
    .map((value) => {
      if (!value) return "";
      if (typeof value === "string") return value;
      return value.id || value.slug || value.code || value.name || value.title || "";
    })
    .filter(Boolean)
    .map((value) => String(value));

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.portfolio)) return payload.portfolio;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
};

const main = async () => {
  const raw = await readJson(rawPath, null);
  if (!raw) {
    throw new Error("cases-raw.json not found");
  }
  const items = extractItems(raw);
  if (items.length === 0) {
    throw new Error("cases-raw.json contains no items");
  }

  const indexItems = [];
  for (const item of items) {
    const id = String(item.id || item.slug || item.code || "");
    if (!id) continue;
    const casePath = path.join(casesDir, id, "case.json");
    const existing = await readJson(casePath, {});

    const link =
      item.link ||
      item.url ||
      (id ? `https://sobakapav.ru/portfolio/${id}` : existing.link || "");
    const clientId = item.clientId ? String(item.clientId) : "";
    const services = normalizeList(item.services ?? item.serviceIds);
    const markets = normalizeList(item.markets ?? item.market);
    const year =
      typeof item.year === "number"
        ? item.year
        : typeof item.year === "string"
          ? Number(item.year.slice(0, 4)) || ""
          : "";
    const image = item.image || "";

    const nextCase = {
      ...existing,
      link,
      clientId,
      services,
      markets,
      year,
      previewImageSourceUrl:
        existing.previewImageSourceUrl || image || existing.previewImageSourceUrl,
      image: existing.image || image || "",
      updatedAt: new Date().toISOString(),
    };

    if ("serviceIds" in nextCase) {
      delete nextCase.serviceIds;
    }

    await writeJson(casePath, nextCase);
    indexItems.push({
      id,
      services,
      markets,
      clientId,
      year,
      title: nextCase.title ?? "",
      clientName: nextCase.clientName ?? "",
    });
  }

  await writeJson(indexPath, { schemaVersion: 1, items: indexItems });
};

await main();
