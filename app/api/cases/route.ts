import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const indexPath = path.join(process.cwd(), "data", "cases", "index.json");
    const raw = await fs.readFile(indexPath, "utf-8");
    const data = JSON.parse(raw);
    const indexItems = data.items ?? [];
    const items = indexItems.map((item: { id: string }) => item.id);
    const serviceMap = new Map<string, string[]>(
      indexItems.map((item: { id: string; services?: string[]; serviceIds?: string[] }) => [
        item.id,
        item.services ?? item.serviceIds ?? [],
      ])
    );
    const results = await Promise.all(
      items.map(async (id: string) => {
        try {
          const filePath = path.join(
            process.cwd(),
            "data",
            "cases",
            id,
            "case.json"
          );
          const caseRaw = await fs.readFile(filePath, "utf-8");
          const parsed = JSON.parse(caseRaw);
          return {
            id: parsed.id,
            title: parsed.title ?? "",
            clientName: parsed.clientName ?? "",
            clientId: parsed.clientId ?? "",
            preview: parsed.preview ?? "",
            previewImageFile: parsed.previewImageFile ?? "",
            previewImageSourceUrl: parsed.previewImageSourceUrl ?? "",
            image: parsed.image ?? "",
            link: parsed.link ?? "",
            services:
              parsed.services ?? parsed.serviceIds ?? serviceMap.get(parsed.id) ?? [],
            markets: parsed.markets ?? [],
            year: parsed.year ?? "",
          };
        } catch {
          return null;
        }
      })
    );
    return NextResponse.json({ items: results.filter(Boolean) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
