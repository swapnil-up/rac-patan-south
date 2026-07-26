import type { Template } from "tinacms";

export default {
  name: "contact",
  label: "Contact Section",
  fields: [
    {
      type: "string",
      name: "title",
      label: "Section Title",
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
