import { NextResponse } from "next/server";
import { getDataRepoStatus } from "../../../../lib/data-repo";

export const runtime = "nodejs";

export async function GET() {
  const status = await getDataRepoStatus();
  return NextResponse.json(status);
}
