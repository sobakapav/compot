import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import { proposalSchema } from "../../../lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const proposalPayload = body?.proposal ?? body;
    const parsed = proposalSchema.safeParse(proposalPayload ?? {});
    if (!parsed.success) {
      const fallback = proposalSchema.parse({});
      const payload = {
        proposal: fallback,
        selectedCaseIds: body?.selectedCaseIds ?? [],
        planTasks: body?.planTasks ?? [],
      };
      const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tmpDir = path.join(process.cwd(), "data", "tmp-pdf");
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, `${token}.json`),
        JSON.stringify(payload),
        "utf-8"
      );
      const printUrl = `${new URL(request.url).origin}/print?token=${token}`;
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setViewportSize({ width: 794, height: 1123 });
      await page.goto(printUrl, { waitUntil: "networkidle" });
      try {
        await page.waitForSelector(".proposal-page", { timeout: 10000 });
        await page.waitForTimeout(300);
      } catch {
        // Continue even if the wait times out; we'll still attempt to render.
      }
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      const pdfBytes = new Uint8Array(pdf);
      await browser.close();
      await fs.rm(path.join(tmpDir, `${token}.json`), { force: true });
      const fileName =
        typeof body?.fileName === "string" && body.fileName.trim()
          ? body.fileName.trim()
          : null;
      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName ?? "sbkpv_cmpr.pdf"}"`,
        },
      });
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    const origin = new URL(request.url).origin;
    const payload = {
      proposal: parsed.data,
      selectedCaseIds: body?.selectedCaseIds ?? [],
      planTasks: body?.planTasks ?? [],
    };
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tmpDir = path.join(process.cwd(), "data", "tmp-pdf");
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, `${token}.json`),
      JSON.stringify(payload),
      "utf-8"
    );
    const printUrl = `${origin}/print?token=${token}`;
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.goto(printUrl, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector(".proposal-page", { timeout: 10000 });
      await page.waitForTimeout(300);
      const contentReady = await page.evaluate(() => {
        const el = document.querySelector(".proposal-page");
        const text = (el?.textContent ?? "").replace(/\s+/g, "");
        return { hasEl: !!el, textLen: text.length };
      });
      console.log("[pdf] contentReady", contentReady);
    } catch {
      // Continue even if the wait times out; we'll still attempt to render.
    }
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    const pdfBytes = new Uint8Array(pdf);
    await browser.close();
    await fs.rm(path.join(tmpDir, `${token}.json`), { force: true });

    const fileName =
      typeof body?.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim()
        : null;
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName ?? "sbkpv_cmpr.pdf"}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
