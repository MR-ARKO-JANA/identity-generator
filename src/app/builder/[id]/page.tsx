import { Metadata } from "next";
import { promises as fs } from "fs";
import path from "path";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  try {
    const dbPath = path.join(process.cwd(), "db.json");
    const dbContent = await fs.readFile(dbPath, "utf-8");
    const db = JSON.parse(dbContent);
    return Object.keys(db).map((id) => ({ id }));
  } catch {
    return [];
  }
}

async function getBadgeData(id: string) {
  try {
    const dbPath = path.join(process.cwd(), "db.json");
    const dbContent = await fs.readFile(dbPath, "utf-8");
    const db = JSON.parse(dbContent);
    return db[id] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { id } = await params;
  const badgeData = await getBadgeData(id);

  if (!badgeData) {
    return {
      title: "Badge Not Found - Hacker House Goa 2026",
    };
  }

  const baseUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://hhgoa.com";
  const imageUrl = badgeData.image_url.startsWith("http")
    ? badgeData.image_url
    : `${baseUrl}${badgeData.image_url}`;

  const isPfp = badgeData.format_type === "PFP_FRAME";
  const imageWidth = 1200;
  const imageHeight = isPfp ? 1200 : 675;

  return {
    title: "HH Goa 2026 Builder Identity",
    description: "Check out my Hacker House Goa 2026 Builder ID. 4 days. AI x Crypto. Multichain. #FrameInGoa",
    openGraph: {
      title: "HH Goa 2026 Builder Identity",
      description: "Check out my Hacker House Goa 2026 Builder ID. 4 days. AI x Crypto. Multichain. #FrameInGoa",
      url: `${baseUrl}/builder/${id}`,
      siteName: "Hacker House Goa 2026",
      images: [
        {
          url: imageUrl,
          width: imageWidth,
          height: imageHeight,
          alt: "Hacker House Goa 2026 Identity Card",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@247pmstudio",
      title: "HH Goa 2026 Builder Identity",
      description: "Check out my Hacker House Goa 2026 Builder ID. 4 days. AI x Crypto. Multichain. #FrameInGoa",
      images: [imageUrl],
    },
    other: {
      "og:image:width": String(imageWidth),
      "og:image:height": String(imageHeight),
    },
  };
}

export default async function BuilderPage({ params }: Props) {
  const { id } = await params;
  const badgeData = await getBadgeData(id);

  if (!badgeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B5C36] text-[#FDF8E4] font-mono">
        <div className="border-2 border-[#FDF8E4] p-8 bg-[#0B5C36] text-center">
          <h1 className="text-2xl font-bold mb-4">404 - BADGE NOT FOUND</h1>
          <p className="text-sm opacity-80 mb-6">This badge may have expired (72h TTL) or does not exist.</p>
          <a
            href="/"
            className="inline-block bg-[#FF007F] text-white px-6 py-2 border-2 border-[#FDF8E4] uppercase font-bold"
          >
            CREATE NEW BADGE
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B5C36] p-4 md:p-8 relative">
      {/* Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-20 mix-blend-overlay">
        <svg height="100%" width="100%">
          <filter id="noiseFilter">
            <feTurbulence baseFrequency="0.65" numOctaves={3} stitchTiles="stitch" type="fractalNoise" />
          </filter>
          <rect filter="url(#noiseFilter)" height="100%" width="100%" />
        </svg>
      </div>

      <div className="bg-[#FDF8E4] border-4 border-[#0B5C36] p-4 md:p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.5)] max-w-4xl w-full relative z-10">
        <div className="flex justify-between items-center border-b-2 border-[#0B5C36] pb-4 mb-6">
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl md:text-4xl text-[#0B5C36] uppercase font-black">
            HH GOA 2026 IDENTITY
          </h1>
          <span className="font-[family-name:var(--font-space-mono)] text-xs bg-[#FF007F] text-white px-3 py-1 border border-[#0B5C36] font-bold">
            VERIFIED_BADGE
          </span>
        </div>

        <div className="flex flex-col items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badgeData.image_url}
            alt="Hacker House Goa 2026 Builder Identity"
            className="max-w-full h-auto border-2 border-[#0B5C36] shadow-[8px_8px_0_0_#FF007F]"
          />

          <div className="mt-8 flex gap-4">
            <a
              href="/"
              className="bg-[#FF007F] text-white font-[family-name:var(--font-space-mono)] font-bold uppercase py-3 px-8 border-2 border-[#0B5C36] shadow-[6px_6px_0_0_#0B5C36] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0_0_#0B5C36] transition-all inline-block"
            >
              CREATE YOUR OWN BADGE
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
