import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  return ["", "/login", "/register"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
