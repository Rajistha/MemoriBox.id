import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "no-undef": "error",
      "no-alert": "error",
      "no-restricted-globals": ["error", "alert", "confirm", "prompt", "print"],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "alert", message: "Gunakan useModal().notify() alih-alih window.alert" },
        { object: "window", property: "confirm", message: "Gunakan useModal().confirm() alih-alih window.confirm" },
        { object: "window", property: "prompt", message: "Gunakan useModal().prompt() alih-alih window.prompt" },
        { object: "window", property: "print", message: "Dilarang window.print(), ekspor lewat Unduh PDF modal" },
        { object: "window", property: "open", message: "Gunakan openExternal() di dalam modal WhatsApp/Tautan" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
