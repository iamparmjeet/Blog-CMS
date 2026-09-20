import { join } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	const isTest = mode === "test" || process.env.VITEST === "true";
	const localStatePath =
		process.env.CLOUDFLARE_LOCAL_STATE_PATH ??
		join(process.env.XDG_RUNTIME_DIR ?? "/tmp", "contentos-wrangler-state");

	return {
		resolve: { tsconfigPaths: true },
		plugins: [
			devtools(),
			!isTest &&
				cloudflare({
					persistState: { path: localStatePath },
					viteEnvironment: { name: "ssr" },
				}),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
			babel({ presets: [reactCompilerPreset()] }),
		],
	};
});
