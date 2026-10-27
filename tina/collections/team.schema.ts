import type { Collection } from "tinacms";

export default {
  label: "Team Members",
  name: "team",
  path: "content/team",
  format: "md",
  defaultItem: () => ({
    name: "New Team Member",
    role: "",
    bio: "",
  }),
  fields: [
    {
      type: "string",
      name: "name",
      label: "Name",
      required: true,
      isTitle: true,
    },
    {
      type: "string",
      name: "role",
      label: "Role",
    },
    {
      type: "image",
      name: "photo",
      label: "Photo",
    },
    {
      type: "string",
      name: "bio",
      label: "Biography",
      ui: { component: "textarea" },
    },
    {
      type: "string",
      name: "term",
      label: "Term",
      description: "Rotary year or board term, e.g. 2015-16",
    },
    {
      type: "number",
      name: "order",
      label: "Order",
      description: "Display order within a term",
    },
  ],
  ui: {
    filename: {
      readonly: false,
      slugify: (values: any) =>
        values?.name
          ?.toLowerCase()
          .replace(/\s+/g, "-"),
    },
  },
} satisfies Collection;
