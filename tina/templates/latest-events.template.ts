import type { Template } from "tinacms";

export default {
  name: "latestEvents",
  label: "Latest Events",
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
      type: "number",
      name: "count",
      label: "Number of events",
      description: "How many recent events to show (default 3)",
    },
  ],
} satisfies Template;
