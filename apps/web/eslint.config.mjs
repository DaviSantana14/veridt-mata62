import path from "path";
import { fileURLToPath } from "url";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..");

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: root,
        project: [
          path.join(root, "apps/api-gateway/tsconfig.json"),
          path.join(root, "apps/identity-service/tsconfig.json"),
          path.join(root, "apps/report-service/tsconfig.json"),
          path.join(root, "apps/web/tsconfig.json"),
        ],
      },
    },
  },
]);