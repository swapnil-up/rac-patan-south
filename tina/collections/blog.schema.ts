import type { Collection } from "tinacms";

export default {
  label: "Blog Posts",
  name: "blog",
  path: "content/blog",
  format: "md",
  defaultItem: () => ({
    title: "New Post",
    date: new Date().toISOString(),
    author: "",
    excerpt: "",
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
      type: "string",
      name: "author",
      label: "Author",
    },
    {
      type: "string",
      name: "excerpt",
      label: "Excerpt",
      ui: { component: "textarea" },
    },
    {
      type: "image",
      name: "coverImage",
      label: "Cover Image",
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body",
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
