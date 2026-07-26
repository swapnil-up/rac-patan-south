import type { Collection } from "tinacms";

export default {
  label: "Events",
  name: "event",
  path: "content/events",
  format: "md",
  defaultItem: () => ({
    title: "New Event",
    date: new Date().toISOString(),
    type: "upcoming",
  }),
  fields: [
    {
      type: "string",
      name: "title",
      label: "Title",
      required: true,
      isTitle: true,
    },
    {
      type: "string",
      name: "slug",
      label: "Slug",
      description: "URL-friendly identifier (auto-generated from title if empty)",
    },
    {
      type: "datetime",
      name: "date",
      label: "Date",
      required: true,
    },
    {
      type: "datetime",
      name: "endDate",
      label: "End Date",
      description: "For multi-day events",
    },
    {
      type: "string",
      name: "location",
      label: "Location",
    },
    {
      type: "string",
      name: "description",
      label: "Description",
      ui: { component: "textarea" },
    },
    {
      type: "string",
      name: "type",
      label: "Type",
      options: ["upcoming", "past", "recurring"],
      ui: {
        component: "select",
      },
    },
    {
      type: "string",
      name: "registrationLink",
      label: "Registration Link",
    },
    {
      type: "image",
      name: "image",
      label: "Image",
    },
  ],
  ui: {
    filename: {
      readonly: false,
      slugify: (values: any) =>
        values?.slug || values?.title
          ?.toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-"),
    },
  },
} satisfies Collection;
