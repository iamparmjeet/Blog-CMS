import { sql } from "drizzle-orm";
import {
	foreignKey,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const todos = sqliteTable("todos", {
	id: integer({ mode: "number" }).primaryKey({
		autoIncrement: true,
	}),
	title: text().notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(unixepoch())`,
	),
});

export const settings = sqliteTable(
	"settings",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),
		displayName: text("display_name"),
		blogTitle: text("blog_title"),
		domain: text("domain"),
		bio: text("bio"),
		accentColor: text("accent_color").notNull().default("#7c3aed"),
		defaultModel: text("default_model")
			.notNull()
			.default("google/gemini-2.5-flash"),
		seoMeta: integer("seo_meta", { mode: "boolean" }).notNull().default(true),
		rssFeed: integer("rss_feed", { mode: "boolean" }).notNull().default(true),
		readingTime: integer("reading_time", { mode: "boolean" })
			.notNull()
			.default(false),
		// Comma-separated list of origin URLs allowed to fetch the public JSON
		// feed (e.g. "https://site-a.com,https://site-b.com"). Empty = no CORS.
		allowedOrigins: text("allowed_origins"),
		umamiShareUrl: text("umami_share_url"),
		bucketName: text("bucket_name"),
		publicUrl: text("public_url"),
		accountId: text("account_id"),
		// Free-text note describing the author's tone/voice, used to steer AI
		// post generation toward "my style".
		writingStyle: text("writing_style"),
		// Optional pasted sample of the author's writing — few-shot reference for
		// AI generation. Falls back to published posts when empty.
		writingSample: text("writing_sample"),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(table) => [
		foreignKey({ columns: [table.userId], foreignColumns: [user.id] }),
	],
);

export const posts = sqliteTable(
	"posts",
	{
		id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text().notNull(),
		slug: text().notNull(),
		status: text().notNull().default("draft"),
		body: text(),
		wordCount: integer({ mode: "number" }).notNull().default(0),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(table) => [
		foreignKey({ columns: [table.userId], foreignColumns: [user.id] }),
	],
);

export const media = sqliteTable(
	"media",
	{
		id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// Links media to the post it was uploaded into (null for library uploads).
		// Used only to derive the display name; the R2 object key stays immutable.
		postId: integer("post_id").references(() => posts.id, {
			onDelete: "set null",
		}),
		name: text().notNull(),
		type: text().notNull(),
		size: text().notNull(),
		dims: text().notNull().default(""),
		duration: text(),
		fileKey: text("file_key"),
		url: text().notNull(),
		status: text().notNull().default("pending"),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
	},
	(table) => [
		foreignKey({ columns: [table.userId], foreignColumns: [user.id] }),
	],
);
