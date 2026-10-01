import type { MetadataRoute } from "next";

// Public pages may be indexed; app, vendor-assessment and API routes may not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup"],
      disallow: ["/dashboard", "/assess/", "/api/", "/auth/"],
    },
  };
}
