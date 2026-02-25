import fs from "fs/promises";
import path from "path";

const servicesDir = path.join(process.cwd(), "data", "services");
const indexPath = path.join(servicesDir, "index.json");
const templatePath = path.join(servicesDir, "_templates", "service.json");

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
};

const writeJson = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const isDirectory = (entry) => entry?.isDirectory?.();

const main = async () => {
  const entries = await fs.readdir(servicesDir, { withFileTypes: true });
  const serviceDirs = entries
    .filter(
      (entry) => isDirectory(entry) && entry.name !== "_templates"
    )
    .map((entry) => entry.name);

  const renameQueue = [];
  const indexItems = [];

  for (const dirName of serviceDirs) {
    const filePath = path.join(servicesDir, dirName, "service.json");
    let data;
    try {
      data = await readJson(filePath);
    } catch {
      continue;
    }
    const nextId = data.id || dirName;
    data.id = nextId;
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);

    indexItems.push({
      id: nextId,
      title: data.title ?? "",
      serviceGroup: data.serviceGroup ?? "",
      image: data.image ?? "",
    });

    if (dirName !== nextId) {
      renameQueue.push({ from: dirName, to: nextId });
    }
  }

  for (const { from, to } of renameQueue) {
    const fromPath = path.join(servicesDir, from);
    const toPath = path.join(servicesDir, to);
    try {
      await fs.rename(fromPath, toPath);
    } catch {
      // ignore rename issues
    }
  }

  await writeJson(indexPath, {
    schemaVersion: 1,
    items: indexItems,
  });

  try {
    const template = await readJson(templatePath);
    template.id = "service-id";
    await writeJson(templatePath, template);
  } catch {
    // ignore template update failures
  }
};

await main();
