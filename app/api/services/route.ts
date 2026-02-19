import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "services", "index.json");
  try {
    const { syncServices } = await import(
      "../../../scripts/sync-services.mjs"
    );
    await syncServices();
  } catch {
    // If sync fails or can't load, still return the current list.
  }
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ items: data.items ?? [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
