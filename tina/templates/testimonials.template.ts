import type { Template } from "tinacms";

export default {
  name: "testimonials",
  label: "Testimonials Section",
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
      name: "items",
      label: "Testimonials",
      description: "Select testimonials to display",
      list: true,
      fields: [
        {
          type: "reference",
          name: "item",
          label: "Testimonial",
          collections: ["testimonial"],
        },
      ],
    },
  ],
} satisfies Template;
