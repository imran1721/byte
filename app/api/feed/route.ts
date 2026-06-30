import { NextResponse } from "next/server";
import { getFeedPage } from "@/lib/feed";

export const revalidate = 1800;

export async function GET(req: Request) {
  const page = Number(new URL(req.url).searchParams.get("page") ?? "0");
  try {
    const items = await getFeedPage(Number.isFinite(page) ? Math.max(0, page) : 0);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/feed]", err);
    return NextResponse.json({ error: "feed_failed", items: [] }, { status: 502 });
  }
}
