import type { Template } from "tinacms";

export default {
  name: "sponsorGrid",
  label: "Sponsor Grid",
  fields: [
    {
      type: "string",
      name: "title",
      label: "Title",
      isTitle: true,
      required: true,
    },
    {
      type: "string",
      name: "subtitle",
      label: "Subtitle",
      ui: { component: "textarea" },
    },
  ],
} satisfies Template;
