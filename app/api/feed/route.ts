import { NextResponse } from "next/server";
import { getFeedPage } from "@/lib/feed";

export const revalidate = 1800;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const page = Number(params.get("page") ?? "0");
  const mode = params.get("mode") === "latest" ? "latest" : "trending";
  const query = params.get("q") ?? "";
  try {
    const items = await getFeedPage(
      Number.isFinite(page) ? Math.max(0, page) : 0,
      mode,
      query,
    );
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/feed]", err);
    return NextResponse.json({ error: "feed_failed", items: [] }, { status: 502 });
  }
}
