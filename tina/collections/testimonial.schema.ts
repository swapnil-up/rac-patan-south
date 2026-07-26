import type { Collection } from "tinacms";

export default {
  label: "Testimonials",
  name: "testimonial",
  path: "content/testimonial",
  format: "md",
  defaultItem: () => ({
    quote: "",
    author: "New Author",
    role: "",
    organization: "",
  }),
  fields: [
    {
      type: "string",
      name: "quote",
      label: "Quote",
      required: true,
      ui: { component: "textarea" },
    },
    {
      type: "string",
      name: "author",
      label: "Author",
      required: true,
      isTitle: true,
    },
    {
      type: "string",
      name: "role",
      label: "Role",
    },
    {
      type: "string",
      name: "organization",
      label: "Organization",
    },
    {
      type: "image",
      name: "photo",
      label: "Photo",
    },
  ],
  ui: {
    filename: {
      readonly: false,
      slugify: (values: any) =>
        values?.author
          ?.toLowerCase()
          .replace(/\s+/g, "-"),
    },
  },
} satisfies Collection;
