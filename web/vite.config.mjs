import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

import fs from "fs";
import path from "path";

const resolvePath = (str) => path.resolve(__dirname, str);

// Absolute imports from src (jsconfig baseUrl "src"): 'components/Foo', 'lib/api', 'config', ...
const srcDir = resolvePath("src");
const srcRoots = [
  ...new Set(fs.readdirSync(srcDir).map((name) => name.replace(/\.jsx?$/, ""))),
].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const srcAlias = {
  find: new RegExp(`^(${srcRoots.join("|")})(/.*)?$`),
  replacement: `${srcDir}/$1$2`,
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const API_URL = `${env.VITE_APP_BASE_NAME}`;
  const PORT = 3000;

  return {
    server: {
      // this ensures that the browser opens upon server start
      open: true,
      // this sets a default port to 3000
      port: PORT,
      host: true,
    },
    preview: {
      open: true,
      host: true,
    },
    define: {
      global: "window",
    },
    resolve: {
      alias: [
        srcAlias,
        // { find: '', replacement: path.resolve(__dirname, 'src') },
        // {
        //   find: /^~(.+)/,
        //   replacement: path.join(process.cwd(), 'node_modules/$1')
        // },
        // {
        //   find: /^src(.+)/,
        //   replacement: path.join(process.cwd(), 'src/$1')
        // }
        // {
        //   find: 'assets',
        //   replacement: path.join(process.cwd(), 'src/assets')
        // },
      ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          charset: false,
          verbose: true,
          quietDeps: true,
          silenceDeprecations: ['import'],
        },
        less: {
          charset: false,
        },
      },
      charset: false,
      postcss: {
        plugins: [
          {
            postcssPlugin: "internal:charset-removal",
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === "charset") {
                  atRule.remove();
                }
              },
            },
          },
        ],
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
      sourcemap: true,
      cssCodeSplit: true,
      rollupOptions: {
        input: {
          main: resolvePath("index.html"),
          legacy: resolvePath("index.html"),
        },
      },
    },
    base: API_URL,
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.js",
    },
  };
});