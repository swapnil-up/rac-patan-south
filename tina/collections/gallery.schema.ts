import type { Collection } from "tinacms";

export default {
  label: "Galleries",
  name: "gallery",
  path: "content/gallery",
  format: "md",
  defaultItem: () => ({
    title: "New Album",
    date: new Date().toISOString(),
  }),
  fields: [
    {
      type: "string",
      name: "title",
      label: "Album Title",
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
    },
    {
      type: "image",
      name: "cover",
      label: "Cover Photo",
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
  ],
} satisfies Collection;
