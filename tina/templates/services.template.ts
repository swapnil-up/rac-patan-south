import type { Template } from "tinacms";

export default {
  name: "services",
  label: "Services Grid",
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
    },
    {
      type: "object",
      name: "services",
      label: "Services",
      list: true,
      fields: [
        {
          type: "string",
          name: "title",
          label: "Service Title",
        },
        {
          type: "string",
          name: "description",
          label: "Description",
          ui: { component: "textarea" },
        },
      ],
    },
  ],
} satisfies Template;
