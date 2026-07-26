import type { Template } from "tinacms";

export default {
  name: "about",
  label: "About Section",
  fields: [
    {
      type: "string",
      name: "id",
      label: "Anchor ID",
      description: "Optional ID for linking to this section (e.g., 'why-join')",
    },
    {
      type: "string",
      name: "title",
      label: "Title",
      isTitle: true,
      required: true,
    },
    {
      type: "rich-text",
      name: "content",
      label: "Content",
    },
    {
      type: "image",
      name: "image",
      label: "Image",
    },
  ],
} satisfies Template;
