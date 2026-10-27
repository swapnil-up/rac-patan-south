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
      name: "category",
      label: "Category",
      options: [
        "community_service",
        "professional_development",
        "international_service",
        "club_service",
        "fellowship",
        "fundraiser",
        "partnership",
        "installation",
        "meeting",
        "recruitment",
        "other",
      ],
      ui: { component: "select" },
    },
    {
      type: "string",
      name: "rotaYear",
      label: "Rotary Year",
      description: "Rotary year in YYYY-YY format, e.g. 2024-25",
    },
    {
      type: "string",
      name: "sourceUrl",
      label: "Source URL",
      description: "Original Instagram or Blogspot post",
    },
    {
      type: "string",
      name: "sourceType",
      label: "Source Type",
      description: "instagram_post, instagram_reel, blogspot_post, or manual",
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
    {
      type: "object",
      name: "photos",
      label: "Photos",
      list: true,
      ui: {
        itemProps: (item: any) => ({
          label: item?.caption || "Photo",
        }),
      },
      fields: [
        {
          type: "image",
          name: "image",
          label: "Image",
          required: true,
        },
        {
          type: "string",
          name: "caption",
          label: "Caption",
        },
      ],
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
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
