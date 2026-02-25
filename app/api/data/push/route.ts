import { NextResponse } from "next/server";
import { pushDataRepo } from "../../../../lib/data-repo";

export const runtime = "nodejs";

export async function POST() {
  const result = await pushDataRepo("manual");
  return NextResponse.json(result);
}
