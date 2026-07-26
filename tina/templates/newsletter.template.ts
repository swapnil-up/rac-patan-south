import type { Template } from "tinacms";

export default {
  name: "newsletter",
  label: "Newsletter Signup",
  fields: [
    {
      type: "string",
      name: "id",
      label: "Anchor ID",
      description: "Optional ID for linking to this section",
    },
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
    {
      type: "string",
      name: "placeholder",
      label: "Input Placeholder",
    },
    {
      type: "string",
      name: "buttonText",
      label: "Button Text",
    },
  ],
} satisfies Template;
