import { defineConfig } from "tinacms";

import settingsCollection from "./collections/settings.schema";
import pageCollection from "./collections/page.schema";
import teamCollection from "./collections/team.schema";
import testimonialCollection from "./collections/testimonial.schema";

export default defineConfig({
  telemetry: "disabled",
  clientId: process.env.TINA_PUBLIC_CLIENT_ID,
  branch:
    process.env.TINA_PUBLIC_BRANCH ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.HEAD ||
    "main",
  token: process.env.TINA_TOKEN,
  media: {
    tina: {
      publicFolder: "public",
      mediaRoot: "uploads",
    },
  },
  build: {
    publicFolder: "public",
    outputFolder: "admin",
    basePath: process.env.TINA_BASE_PATH || undefined,
  },
  schema: {
    collections: [
      settingsCollection,
      pageCollection,
      teamCollection,
      testimonialCollection,
    ],
  },
});
