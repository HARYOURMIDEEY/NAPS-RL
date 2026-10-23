import { del } from "@vercel/blob";

/**
 * Vercel Blob storage.
 *
 * Uploads go DIRECTLY from the admin's browser to Blob (see
 * app/api/admin/materials/upload/route.ts). They must not pass through a
 * serverless function, because Vercel rejects request bodies over ~4.5 MB.
 *
 * ACCESS CONTROL NOTE: this SDK version stores files at public URLs with
 * unguessable random names. Students download through
 * /api/materials/[id]/download, which requires a signed-in, active account.
 * Anyone who somehow obtained the raw blob URL could still fetch the file, so
 * don't upload content that must never leave the platform.
 */

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg",
  "application/zip",
];

/** Only accept file URLs that really point at Vercel Blob storage. */
export function isTrustedBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function deleteUploadedFile(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    console.error("Failed to delete blob:", err);
  }
}
