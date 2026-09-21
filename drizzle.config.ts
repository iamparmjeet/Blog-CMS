import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./src/db/drizzle",
	schema: "./src/db/full-schema.ts",
	dialect: "sqlite",
});
