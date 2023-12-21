import { defineConfig } from "$fresh/server.ts";

import sassPlugin from "./plugins/sass.ts";

export default defineConfig({ plugins: [sassPlugin()] });
