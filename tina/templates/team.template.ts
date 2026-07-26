import type { Template } from "tinacms";

export default {
  name: "team",
  label: "Team Section",
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
      name: "members",
      label: "Team Members",
      description: "Select team members to display",
      list: true,
      fields: [
        {
          type: "reference",
          name: "member",
          label: "Team Member",
          collections: ["team"],
        },
      ],
    },
  ],
} satisfies Template;
