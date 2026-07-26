import type { Collection } from "tinacms";

import heroTemplate from "../templates/hero.template";
import aboutTemplate from "../templates/about.template";
import servicesTemplate from "../templates/services.template";
import teamTemplate from "../templates/team.template";
import testimonialsTemplate from "../templates/testimonials.template";
import contactTemplate from "../templates/contact.template";
import ctaTemplate from "../templates/cta.template";

export default {
  label: "Pages",
  name: "page",
  path: "content/page",
  format: "mdx",
  fields: [
    {
      type: "object",
      name: "sections",
      label: "Page Sections",
      description: "Add, remove, and reorder sections on this page",
      list: true,
      templates: [
        heroTemplate,
        aboutTemplate,
        servicesTemplate,
        teamTemplate,
        testimonialsTemplate,
        contactTemplate,
        ctaTemplate,
      ],
    },
  ],
  ui: {
    router: ({ document }: { document: any }) =>
      document._sys.filename === "home"
        ? "/"
        : `/${document._sys.filename}`,
  },
} satisfies Collection;
