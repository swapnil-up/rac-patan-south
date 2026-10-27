import type { Collection } from "tinacms";

export default {
  label: "Resources",
  name: "resource",
  path: "content/resources",
  format: "md",
  defaultItem: () => ({
    title: "New Resource",
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
      name: "description",
      label: "Description",
      ui: { component: "textarea" },
    },
    {
      type: "string",
      name: "link",
      label: "Link URL",
      description: "External link to the resource. Used when no file is uploaded.",
    },
    {
      type: "string",
      name: "source",
      label: "Source",
      description: "Publisher or organisation, for example Rotary International or Rotaract District 3292.",
    },
    {
      type: "image",
      name: "file",
      label: "File",
      description: "Upload PDF, document, or other file",
    },
  ],
} satisfies Collection;
