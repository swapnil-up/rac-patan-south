import type { Collection } from "tinacms";

export default {
  label: "Sponsors",
  name: "sponsor",
  path: "content/sponsors",
  format: "md",
  defaultItem: () => ({
    name: "New Sponsor",
    tier: "silver",
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
      type: "image",
      name: "logo",
      label: "Logo",
    },
    {
      type: "string",
      name: "url",
      label: "Website URL",
    },
    {
      type: "string",
      name: "tier",
      label: "Tier",
      options: ["platinum", "gold", "silver", "bronze"],
      ui: {
        component: "select",
      },
    },
  ],
} satisfies Collection;
