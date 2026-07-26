import type { Template } from "tinacms";

export default {
  name: "cta",
  label: "Call-to-Action Banner",
  fields: [
    {
      type: "string",
      name: "text",
      label: "Text",
    },
    {
      type: "string",
      name: "buttonText",
      label: "Button Text",
    },
    {
      type: "string",
      name: "buttonLink",
      label: "Button Link",
    },
  ],
} satisfies Template;
