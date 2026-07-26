import type { Collection } from "tinacms";

export default {
  label: "Site Settings",
  name: "settings",
  path: "content/settings",
  format: "json",
  ui: {
    global: true,
  },
  fields: [
    {
      type: "string",
      name: "siteName",
      label: "Site Name",
      required: true,
    },
    {
      type: "string",
      name: "tagline",
      label: "Tagline",
    },
    {
      type: "string",
      name: "contactEmail",
      label: "Contact Email",
    },
    {
      type: "string",
      name: "contactPhone",
      label: "Contact Phone",
    },
    {
      type: "string",
      name: "address",
      label: "Address",
      ui: { component: "textarea" },
    },
    {
      type: "object",
      name: "navLinks",
      ui: {
        itemProps(item) {
          return { label: item?.label || "Nav Link" };
        },
        defaultItem: {
          label: "About",
          url: "#about",
        },
      },
      label: "Navigation Links",
      description: "Links shown in the header nav and footer quick links",
      list: true,
      fields: [
        {
          type: "string",
          name: "label",
          label: "Label",
          required: true,
        },
        {
          type: "string",
          name: "url",
          label: "URL",
          required: true,
        },
      ],
    },
    {
      type: "object",
      name: "socialLinks",
      ui: {
        itemProps(item) {
          return { label: item?.label || "Social Link" };
        },
        defaultItem: {
          label: "Facebook",
          url: "#",
        },
      },
      label: "Social Links",
      description: "Links shown in the footer Connect section",
      list: true,
      fields: [
        {
          type: "string",
          name: "label",
          label: "Label",
          required: true,
        },
        {
          type: "string",
          name: "url",
          label: "URL",
          required: true,
        },
      ],
    },
    {
      type: "string",
      name: "formEndpoint",
      label: "Contact Form Endpoint",
      description: "URL for form submissions (e.g. Formspree endpoint)",
    },
    {
      type: "string",
      name: "footerText",
      label: "Footer Copyright Text",
      ui: { component: "textarea" },
    },
    {
      type: "object",
      name: "brand",
      label: "Brand & Theme",
      description: "Logo, favicon, and brand colors for your NGO",
      fields: [
        {
          type: "image",
          name: "logo",
          label: "Logo",
          description: "Appears in the navbar (ideal height: 40px)",
        },
        {
          type: "image",
          name: "favicon",
          label: "Favicon",
          description: "Browser tab icon (.ico or .png)",
        },
        {
          type: "object",
          name: "colors",
          label: "Brand Colors",
          description: "Set your NGO's color palette",
          fields: [
            {
              type: "string",
              name: "primary",
              label: "Primary",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "primaryDark",
              label: "Primary Dark",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "primaryLight",
              label: "Primary Light",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "accent",
              label: "Accent",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "accentLight",
              label: "Accent Light",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "accentHover",
              label: "Accent Hover",
              description: "Darker accent for hover states (auto-derived if empty)",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "gold",
              label: "Gold / Secondary",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "goldLight",
              label: "Gold Light",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "goldHover",
              label: "Gold Hover",
              description: "Darker gold for hover states (auto-derived if empty)",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "green",
              label: "Green / Success",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "greenLight",
              label: "Green Light",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "footerBg",
              label: "Footer Background",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "heroBgStart",
              label: "Hero Gradient Start",
              description: "Darkest gradient color at top of hero/CTA sections",
              ui: { component: "color" },
            },
            {
              type: "string",
              name: "bodyBg",
              label: "Page Background",
              ui: { component: "color" },
            },
          ],
        },
      ],
    },
  ],
} satisfies Collection;
