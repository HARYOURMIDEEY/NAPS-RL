import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUser } from "@/lib/require-user";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage";

/**
 * Issues short-lived upload tokens so the admin's browser can send the file
 * DIRECTLY to Vercel Blob. (Routing big files through a serverless function
 * fails: Vercel rejects request bodies over ~4.5 MB.)
 *
 * Authorisation happens in onBeforeGenerateToken, which only runs for the
 * browser's token request (it carries the admin's session cookie). Blob's own
 * completion callback is not trusted for anything here — the material record
 * is created afterwards by POST /api/admin/materials.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname.startsWith("campaigns/")) {
          const auth = await requireUser(["SUPER_ADMIN"]);
          if (!auth.ok) throw new Error(auth.error);
          return {
            allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maximumSizeInBytes: 5 * 1024 * 1024,
          };
        }

        const auth = await requireUser(["ADMIN", "SUPER_ADMIN"]);
        if (!auth.ok) throw new Error(auth.error);
        if (!pathname.startsWith("materials/")) throw new Error("Invalid upload path.");

        return {
          allowedContentTypes: ALLOWED_UPLOAD_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
        };
      },
      onUploadCompleted: async () => {
        // Intentionally empty (see note above).
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
