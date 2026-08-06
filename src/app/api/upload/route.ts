import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const TTL_MS = 72 * 60 * 60 * 1000; // 72 Hours Time-to-Live

async function purgeExpiredItems(dbPath: string, uploadsDir: string) {
  try {
    const dbContent = await fs.readFile(dbPath, "utf-8");
    const db: Record<string, any> = JSON.parse(dbContent);
    const now = Date.now();
    let modified = false;

    for (const [id, item] of Object.entries(db)) {
      const createdAt = new Date(item.created_at).getTime();
      if (now - createdAt > TTL_MS) {
        // Delete image file if it exists locally
        if (item.image_url && item.image_url.startsWith("/uploads/")) {
          const filename = path.basename(item.image_url);
          const filepath = path.join(uploadsDir, filename);
          try {
            await fs.unlink(filepath);
          } catch {
            // Ignore file deletion errors if file already deleted
          }
        }
        delete db[id];
        modified = true;
      }
    }

    if (modified) {
      await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    }
  } catch {
    // If DB reading fails, proceed safely
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    const format = formData.get("format") as string;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate UUID
    const id = crypto.randomUUID();
    const filename = `${id}.png`;

    // Ensure public/uploads exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const dbPath = path.join(process.cwd(), "db.json");

    // Execute TTL cleanup of expired records > 72h
    await purgeExpiredItems(dbPath, uploadsDir);

    // Save image to public/uploads (or Vercel Blob if configured)
    let imageUrl = `/uploads/${filename}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(`badges/${filename}`, file, {
          access: "public",
        });
        imageUrl = blob.url;
      } catch (blobErr) {
        console.warn("Vercel Blob upload failed, using local file fallback:", blobErr);
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, buffer);
      }
    } else {
      const filepath = path.join(uploadsDir, filename);
      await fs.writeFile(filepath, buffer);
    }

    // Read DB
    let db: Record<string, any> = {};
    try {
      const dbContent = await fs.readFile(dbPath, "utf-8");
      db = JSON.parse(dbContent);
    } catch {
      // File doesn't exist, start fresh
    }

    db[id] = {
      id,
      image_url: imageUrl,
      format_type: format,
      created_at: new Date().toISOString(),
    };

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    const response = NextResponse.json({ id, url: `/builder/${id}` }, { status: 200 });
    response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return response;
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
