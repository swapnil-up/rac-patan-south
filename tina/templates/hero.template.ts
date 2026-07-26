import type { Template } from "tinacms";

export default {
  name: "hero",
  label: "Hero Banner",
  fields: [
    {
      type: "string",
      name: "headline",
      label: "Headline",
      isTitle: true,
      required: true,
    },
    {
      type: "string",
      name: "subtext",
      label: "Subtext",
      ui: { component: "textarea" },
    },
    {
      type: "string",
      name: "ctaText",
      label: "Button Text",
    },
    {
      type: "string",
      name: "ctaLink",
      label: "Button Link",
    },
    {
      type: "image",
      name: "backgroundImage",
      label: "Background Image",
    },
  ],
} satisfies Template;
