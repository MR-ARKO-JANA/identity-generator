import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const TTL_MS = 72 * 60 * 60 * 1000;

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "db.json");
    try {
      const dbContent = await fs.readFile(dbPath, "utf-8");
      const db = JSON.parse(dbContent);
      const now = Date.now();

      const items = Object.values(db)
        .filter((item: any) => now - new Date(item.created_at).getTime() <= TTL_MS)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const response = NextResponse.json({ items }, { status: 200 });
      response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      return response;
    } catch {
      return NextResponse.json({ items: [] }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch archive" }, { status: 500 });
  }
}
