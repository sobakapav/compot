import fs from "fs/promises";
import path from "path";

const SOURCE_URL =
  process.env.CASES_URL ?? "https://sobakapav.ru/listPortfolioAsJson";
const FORCE = process.argv.includes("--force");

const rootDir = process.cwd();
const casesDir = path.join(rootDir, "data", "cases");
const linksDir = path.join(rootDir, "data", "links");
const previewsDir = path.join(rootDir, "public", "case-previews");
const syncFile = path.join(linksDir, "case-sync.json");
const servicesIndexPath = path.join(rootDir, "data", "services", "index.json");

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

const normalizeTitleKey = (value) =>
  String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const loadServiceTitleMap = async () => {
  try {
    const raw = await fs.readFile(servicesIndexPath, "utf-8");
    const data = JSON.parse(raw);
    const items = data.items ?? [];
    const map = new Map();
    for (const item of items) {
      if (!item?.title || !item?.id) continue;
      map.set(normalizeTitleKey(item.title), item.id);
    }
    return map;
  } catch {
    return new Map();
  }
};

const buildServiceAliasMap = () => {
  const aliases = new Map();
  const add = (title, id) => aliases.set(normalizeTitleKey(title), id);
  add("Продуктовая команда", "product-team");
  add("Работа в продуктовой команде", "product-team");
  add("Продуктовое исследование", "research");
  add("UX-исследование", "research");
  add("Точечный редизайн", "redesign");
  add("Точечный редизайн интерфейса", "redesign");
  add("UX-дизайн под ключ", "ux-design");
  add("UX/UI-дизайн под ключ", "ux-design");
  add("UX/UI дизайн под ключ", "ux-design");
  add("UX-отдел на аутсорсе", "ux-outsource");
  add("UI-редизайн", "ui-redesign");
  add("UX-аудит", "ux-audit");
  add("Контент-дизайн", "content-design");
  add("Добавление новой функциональности", "new-features");
  add("Прототип под инвестиции", "prototype");
  return aliases;
};

const normalizeByKeywords = (value) => {
  const key = normalizeTitleKey(value);
  if (key.includes("продуктов") && key.includes("команд")) return "product-team";
  if (key.includes("исслед")) return "research";
  if (key.includes("точечн") && key.includes("редизайн")) return "redesign";
  if (key.includes("ux") && key.includes("дизайн") && key.includes("под ключ"))
    return "ux-design";
  if (key.includes("ux") && key.includes("аутсорс")) return "ux-outsource";
  if (key.includes("ui") && key.includes("редизайн")) return "ui-redesign";
  if (key.includes("ux") && key.includes("аудит")) return "ux-audit";
  if (key.includes("контент")) return "content-design";
  if (key.includes("нов") && key.includes("функциональ"))
    return "new-features";
  if (key.includes("прототип")) return "prototype";
  return null;
};

const normalizeServiceIdsWithMap = (services, map) => {
  const aliasMap = buildServiceAliasMap();
  const raw = normalizeServiceIds(services);
  return raw
    .map((value) => {
      const key = normalizeTitleKey(value);
      return (
        map.get(key) ||
        aliasMap.get(key) ||
        normalizeByKeywords(value) ||
        value
      );
    })
    .filter(Boolean);
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
  const text = await response.text();
  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };
  const direct = tryParse(text);
  if (direct) return { json: direct, raw: text };

  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch?.[1]) {
    const preJson = tryParse(preMatch[1].trim());
    if (preJson) return { json: preJson, raw: text };
  }

  const decodeEntities = (value) =>
    value
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ");

  const pMatch = text.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (pMatch?.[1]) {
    const decoded = decodeEntities(pMatch[1].trim());
    const pJson = tryParse(decoded);
    if (pJson) return { json: pJson, raw: text };
  }

  const bracketStart = text.indexOf("[");
  const bracketEnd = text.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd !== -1 && bracketEnd > bracketStart) {
    const slice = decodeEntities(text.slice(bracketStart, bracketEnd + 1));
    const sliceJson = tryParse(slice);
    if (sliceJson) return { json: sliceJson, raw: text };
  }

  const stripped = text.replace(/<[^>]*>/g, "").trim();
  const strippedJson = tryParse(stripped);
  if (strippedJson) return { json: strippedJson, raw: text };

  return { json: null, raw: text };
};

const fetchSource = async () => {
  const urls = [
    SOURCE_URL,
    `${SOURCE_URL}?format=json`,
    `${SOURCE_URL}?_format=json`,
  ];

  for (const url of urls) {
    const { json, raw } = await fetchJson(url);
    if (json) return { json, raw, url };
    if (raw?.trim().startsWith("<!DOCTYPE")) {
      await fs.mkdir(linksDir, { recursive: true });
      await fs.writeFile(path.join(linksDir, "cases-raw.html"), raw, "utf-8");
      await writeJson(path.join(linksDir, "cases-raw-meta.json"), { url });
    }
  }

  throw new Error("Remote response is not valid JSON");
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

  const serviceTitleMap = await loadServiceTitleMap();
  const indexItems = [];
  let updatedCount = 0;
  let downloadedCount = 0;

  for (const item of items) {
    const link = buildLink(item);
    const id = deriveId(item, link);
    if (!id) continue;

    const title = pickFirst(item, ["title", "name", "caseName", "projectTitle"]);
    const clientName = pickFirst(item, [
      "clientName",
      "client",
      "customer",
      "company",
      "brand",
    ]);
    const preview = pickFirst(item, ["preview", "excerpt", "summary", "short"]);
    const description = pickFirst(item, ["description", "text", "details"]);
    const previewUrl = resolvePreviewUrl(item);
    const serviceIds = normalizeServiceIdsWithMap(
      item?.services ?? item?.serviceIds,
      serviceTitleMap
    );

    const caseDir = path.join(casesDir, id);
    await fs.mkdir(caseDir, { recursive: true });
    const casePath = path.join(caseDir, "case.json");
    const existing = await readJson(casePath, {});

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
      clientName,
      clientLogoFile: existing.clientLogoFile ?? "",
      preview,
      title,
      description,
      createdAt: existing.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      previewImageSourceUrl,
      previewImageFile,
      serviceIds,
    };
    await writeJson(casePath, nextCase);

    indexItems.push({ id, serviceIds });
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
