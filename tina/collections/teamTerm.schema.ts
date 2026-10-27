import type { Collection } from "tinacms";

export default {
  label: "Team Terms",
  name: "teamTerm",
  path: "content/team-terms",
  format: "md",
  defaultItem: () => ({
    year: "New Term",
    president: "",
    notes: "",
  }),
  fields: [
    {
      type: "string",
      name: "year",
      label: "Rota Year",
      description: "Rotary year in YYYY-YY format, e.g. 2024-25",
      required: true,
      isTitle: true,
    },
    {
      type: "string",
      name: "president",
      label: "President",
      description: "Leave blank if the president is not yet confirmed",
    },
    {
      type: "image",
      name: "presidentPhoto",
      label: "President Photo",
    },
    {
      type: "string",
      name: "notes",
      label: "Notes",
      description: "Open questions or missing records for this term",
      ui: { component: "textarea" },
    },
    {
      type: "object",
      name: "board",
      label: "Board of Directors",
      list: true,
      ui: {
        itemProps: (item: any) => ({
          label: item?.name
            ? `${item.name}${item.role ? ` — ${item.role}` : ""}`
            : item?.role || "Board member",
        }),
      },
      fields: [
        {
          type: "string",
          name: "name",
          label: "Name",
        },
        {
          type: "string",
          name: "role",
          label: "Role",
        },
        {
          type: "image",
          name: "photo",
          label: "Photo",
        },
        {
          type: "string",
          name: "note",
          label: "Note",
          description: "Add a question mark or clarification if the record is uncertain",
        },
      ],
    },
    {
      type: "string",
      name: "source",
      label: "Source",
      description: "Where this record came from",
    },
  ],
  ui: {
    filename: {
      readonly: false,
      slugify: (values: any) =>
        values?.year
          ?.toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-"),
    },
  },
} satisfies Collection;
