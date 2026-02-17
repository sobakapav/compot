import { NextResponse } from "next/server";
import { chromium } from "playwright";
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
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
      const printUrl = `${new URL(request.url).origin}/print?data=${encodeURIComponent(encoded)}`;
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
      await browser.close();
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="proposal.pdf"',
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
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    const printUrl = `${origin}/print?data=${encodeURIComponent(encoded)}`;
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
    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="proposal.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
