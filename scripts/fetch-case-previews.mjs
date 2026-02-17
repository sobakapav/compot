import fs from "fs";
import path from "path";

const root = process.cwd();
const casesDir = path.join(root, "data", "cases");
const outDir = path.join(root, "public", "case-previews");

const entries = fs
  .readdirSync(casesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_templates");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const toFileName = (caseId, url) => {
  const extMatch = url.match(/\.(\w+)(\?|$)/);
  const ext = extMatch ? extMatch[1] : "webp";
  return `${caseId}.${ext}`;
};

const run = async () => {
  for (const entry of entries) {
    const casePath = path.join(casesDir, entry.name, "case.json");
    const raw = fs.readFileSync(casePath, "utf-8");
    const data = JSON.parse(raw);
    const sourceUrl = data.previewImageSourceUrl;
    if (!sourceUrl) continue;

    const fileName = data.previewImageFile?.split("/").pop() || toFileName(entry.name, sourceUrl);
    const outPath = path.join(outDir, fileName);

    if (fs.existsSync(outPath)) continue;

    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.error(`Failed to fetch ${sourceUrl}: ${res.status}`);
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved ${outPath}`);
  }
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
