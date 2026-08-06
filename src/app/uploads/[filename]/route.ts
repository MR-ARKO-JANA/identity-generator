import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type Props = {
  params: Promise<{ filename: string }>;
};

export async function GET(req: Request, { params }: Props) {
  try {
    const { filename } = await params;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(process.cwd(), "public", "uploads", safeFilename);

    const fileBuffer = await fs.readFile(filepath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Image not found", { status: 404 });
  }
}
