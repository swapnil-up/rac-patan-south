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
