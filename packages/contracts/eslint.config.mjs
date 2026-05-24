import { config as baseConfig } from "@veridit/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**"]
  }
];
