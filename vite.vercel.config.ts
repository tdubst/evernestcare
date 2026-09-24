import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const startRouteTreeFooter = [
  `import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}`,
];

export default defineConfig({
  define: {
    "import.meta.env.VITE_STATIC_CLIENT": JSON.stringify("true"),
  },
  plugins: [
    {
      name: "evernest-vercel-static-entry",
      enforce: "pre",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          return html.replace(/\/src\/client\.tsx/g, "/src/client.vercel.tsx");
        },
      },
    },
    tanstackRouter({
      autoCodeSplitting: true,
      routeTreeFileFooter: startRouteTreeFooter,
      target: "react",
    }),
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    react(),
  ],
  build: {
    rollupOptions: {
      input: "index.html",
    },
  },
  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
      "node:async_hooks": `${process.cwd()}/src/lib/vercel/async-hooks-browser-shim.ts`,
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
});
