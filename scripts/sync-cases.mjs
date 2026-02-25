import fs from "fs/promises";
import path from "path";

const SOURCE_URL =
  process.env.CASES_URL ?? "https://sobakapav.ru/listPortfolio.json";
const FORCE = process.argv.includes("--force");

const rootDir = process.cwd();
const casesDir = path.join(rootDir, "data", "cases");
const linksDir = path.join(rootDir, "data", "links");
const previewsDir = path.join(rootDir, "public", "case-previews");
const syncFile = path.join(linksDir, "case-sync.json");
const clientsIndexPath = path.join(rootDir, "data", "clients", "index.json");

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const readJson = async (filePath, fallback = null) => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const buildLink = (item) => {
  const link = pickFirst(item, ["link", "url", "href"]);
  if (link) return link;
  const slug = pickFirst(item, ["id", "slug", "code", "caseId", "name"]);
  if (slug) return `https://sobakapav.ru/portfolio/${slug}`;
  return "";
};

const deriveId = (item, link) => {
  const direct = pickFirst(item, ["id", "slug", "code", "caseId", "name"]);
  if (direct) return String(direct);
  if (link) {
    const clean = link.replace(/\/$/, "");
    const parts = clean.split("/");
    return parts[parts.length - 1] || "";
  }
  return "";
};

const normalizeServiceIds = (services) => {
  const list = toArray(services).map((service) => {
    if (!service) return "";
    if (typeof service === "string") return service;
    return (
      service.id ||
      service.slug ||
      service.code ||
      service.name ||
      service.title ||
      ""
    );
  });
  return list.filter(Boolean).map((value) => String(value));
};

const normalizeServiceIdsWithMap = (services) => normalizeServiceIds(services);

const normalizeMarketIds = (markets) => {
  const list = toArray(markets).map((market) => {
    if (!market) return "";
    if (typeof market === "string") return market;
    return market.id || market.slug || market.code || market.name || market.title || "";
  });
  return list.filter(Boolean).map((value) => String(value));
};

const resolvePreviewUrl = (item) =>
  pickFirst(item, [
    "previewImageSourceUrl",
    "previewImage",
    "previewImageUrl",
    "previewUrl",
    "image",
    "imageUrl",
    "cover",
    "coverUrl",
  ]);

const readClientsIndex = async () => {
  const data = await readJson(clientsIndexPath, { items: [] });
  if (!Array.isArray(data.items)) return new Map();
  return new Map(
    data.items
      .filter((item) => item?.id)
      .map((item) => [String(item.id), String(item.title ?? "")])
  );
};

const extensionFromUrl = (url) => {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || "";
  } catch {
    return "";
  }
};

const extensionFromContentType = (contentType) => {
  if (!contentType) return "";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/svg+xml")) return ".svg";
  return "";
};

const downloadPreview = async (id, sourceUrl, existingUrl) => {
  if (!sourceUrl) return { previewImageFile: "", previewImageSourceUrl: "" };
  if (existingUrl && existingUrl === sourceUrl) {
    const ext = extensionFromUrl(sourceUrl);
    const fallbackExt = ext || ".webp";
    const fileName = `${id}${fallbackExt}`;
    const filePath = path.join(previewsDir, fileName);
    try {
      await fs.access(filePath);
      return {
        previewImageFile: `/case-previews/${fileName}`,
        previewImageSourceUrl: sourceUrl,
      };
    } catch {
      // continue to download
    }
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    return { previewImageFile: "", previewImageSourceUrl: sourceUrl };
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "";
  const ext = extensionFromUrl(sourceUrl) || extensionFromContentType(contentType) || ".webp";
  const fileName = `${id}${ext}`;
  await fs.mkdir(previewsDir, { recursive: true });
  await fs.writeFile(path.join(previewsDir, fileName), Buffer.from(arrayBuffer));
  return {
    previewImageFile: `/case-previews/${fileName}`,
    previewImageSourceUrl: sourceUrl,
  };
};

const shouldRunToday = async () => {
  if (FORCE) return true;
  const state = await readJson(syncFile, {});
  const today = getTodayKey();
  if (state?.lastRun === today) return false;
  return true;
};

const saveRunState = async () => {
  await writeJson(syncFile, { lastRun: getTodayKey(), updatedAt: new Date().toISOString() });
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cases: ${response.status}`);
  }
  const json = await response.json();
  return { json, raw: JSON.stringify(json) };
};

const fetchSource = async () => {
  const { json, raw } = await fetchJson(SOURCE_URL);
  return { json, raw, url: SOURCE_URL };
};

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
  const run = await shouldRunToday();
  if (!run) return;

  const clientsMap = await readClientsIndex();

  let payload;
  try {
    const fetched = await fetchSource();
    payload = fetched.json;
    await writeJson(path.join(linksDir, "cases-raw.json"), payload);
  } catch (error) {
    console.warn("[cases] Failed to fetch remote cases", error);
    return;
  }

  const items = extractItems(payload);
  if (items.length === 0) {
    const keys = payload && typeof payload === "object" ? Object.keys(payload) : [];
    console.warn("[cases] No items found in payload", keys);
    return;
  }

  const indexItems = [];
  let updatedCount = 0;
  let downloadedCount = 0;

  for (const item of items) {
    const link = buildLink(item);
    const id = deriveId(item, link);
    if (!id) continue;

    const caseDir = path.join(casesDir, id);
    await fs.mkdir(caseDir, { recursive: true });
    const casePath = path.join(caseDir, "case.json");
    const existing = await readJson(casePath, {});

    const title = pickFirst(item, ["title", "name", "caseName", "projectTitle"]);
    const clientId = pickFirst(item, ["clientId", "client", "clientCode", "clientSlug"]);
    const clientNameFromMap = clientId ? clientsMap.get(String(clientId)) : "";
    const clientName = clientNameFromMap || pickFirst(item, [
      "clientName",
      "clientTitle",
      "client",
      "customer",
      "company",
      "brand",
    ]) || existing.clientName || "";
    const preview =
      pickFirst(item, ["preview", "excerpt", "summary", "short"]) ||
      existing.preview ||
      "";
    const description =
      pickFirst(item, ["description", "text", "details"]) ||
      existing.description ||
      "";
    const previewUrl = resolvePreviewUrl(item);
    const image = previewUrl || existing.image || "";
    const servicesRaw = normalizeServiceIdsWithMap(
      item?.services ?? item?.serviceIds
    );
    const services =
      servicesRaw.length > 0 ? servicesRaw : existing.services ?? [];
    const marketsRaw = normalizeMarketIds(item?.markets ?? item?.market);
    const markets =
      marketsRaw.length > 0 ? marketsRaw : existing.markets ?? [];
    const yearRaw = pickFirst(item, ["year", "years", "date", "createdAt"]);
    const year =
      typeof yearRaw === "number"
        ? yearRaw
        : typeof yearRaw === "string"
        ? Number(yearRaw.slice(0, 4)) || ""
        : "";

    let previewImageFile = existing.previewImageFile ?? "";
    let previewImageSourceUrl = existing.previewImageSourceUrl ?? "";
    if (previewUrl) {
      const downloaded = await downloadPreview(id, previewUrl, previewImageSourceUrl);
      if (downloaded.previewImageFile && downloaded.previewImageFile !== previewImageFile) {
        downloadedCount += 1;
      }
      previewImageFile = downloaded.previewImageFile || previewImageFile;
      previewImageSourceUrl =
        downloaded.previewImageSourceUrl || previewImageSourceUrl;
    }

    const nextCase = {
      schemaVersion: 1,
      id,
      link,
      clientId: clientId ? String(clientId) : "",
      clientName,
      clientLogoFile: existing.clientLogoFile ?? "",
      preview,
      title,
      description,
      createdAt: existing.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      previewImageSourceUrl,
      previewImageFile,
      image,
      services,
      markets,
      year,
    };
    await writeJson(casePath, nextCase);

    indexItems.push({ id, services, markets, clientId: clientId ? String(clientId) : "", year });
    updatedCount += 1;
  }

  await writeJson(path.join(casesDir, "index.json"), {
    schemaVersion: 1,
    items: indexItems,
  });

  await saveRunState();
  console.log(
    `[cases] Updated ${updatedCount} cases. Downloaded ${downloadedCount} previews.`
  );
};

await main();
