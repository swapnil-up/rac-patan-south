import type { Template } from "tinacms";

export default {
  name: "hero",
  label: "Hero Banner",
  fields: [
    {
      type: "string",
      name: "eyebrow",
      label: "Eyebrow",
      description: "Small line above the headline, e.g. Lalitpur · Patan · Chartered 2012",
    },
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
      label: "Primary Button Text",
    },
    {
      type: "string",
      name: "ctaLink",
      label: "Primary Button Link",
    },
    {
      type: "string",
      name: "secondaryCtaText",
      label: "Secondary Button Text",
    },
    {
      type: "string",
      name: "secondaryCtaLink",
      label: "Secondary Button Link",
    },
    {
      type: "string",
      name: "stampText",
      label: "Stamp Text",
      description: "Shown inside the circular stamp, e.g. Service Above Self",
    },
    {
      type: "image",
      name: "backgroundImage",
      label: "Background Image",
      description: "Used as a full-bleed backdrop when no hero photos are added.",
    },
    {
      type: "object",
      name: "photos",
      label: "Hero Photos",
      list: true,
      ui: {
        itemProps(item) {
          return { label: item?.caption || "Hero photo" };
        },
      },
      fields: [
        {
          type: "image",
          name: "image",
          label: "Image",
        },
        {
          type: "string",
          name: "caption",
          label: "Caption",
        },
      ],
    },
  ],
} satisfies Template;
