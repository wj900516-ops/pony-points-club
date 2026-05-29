import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pony: {
          purple: "#a78bfa",
          purpleDeep: "#7c3aed",
          pink: "#f9a8d4",
          pinkDeep: "#ec4899",
          sky: "#7dd3fc",
          skyDeep: "#0ea5e9",
          cream: "#fff7fb",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        pony: "0 10px 30px -10px rgba(124, 58, 237, 0.35)",
      },
      backgroundImage: {
        "pony-gradient":
          "linear-gradient(135deg, #a78bfa 0%, #f9a8d4 50%, #7dd3fc 100%)",
        "pony-gradient-soft":
          "linear-gradient(135deg, #ede9fe 0%, #fce7f3 50%, #e0f2fe 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
