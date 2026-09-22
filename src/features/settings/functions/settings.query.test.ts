import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import {
	accountInputSchema,
	DEFAULT_PROFILE,
	identityInputSchema,
	publishingInputSchema,
	readOwnerProfile,
	upsertAccount,
	upsertIdentity,
	upsertPublishing,
} from "./settings.query";

const OWNER = "owner-1";

function createThrowawayDb(): Db {
	const sqlite = new Database(":memory:");

	sqlite.exec(`
		CREATE TABLE settings (
			user_id text PRIMARY KEY NOT NULL,
			display_name text,
			blog_title text,
			domain text,
			bio text,
			accent_color text DEFAULT '#7c3aed' NOT NULL,
			theme_mode text DEFAULT 'night' NOT NULL,
			surface_tint text,
			default_model text DEFAULT 'google/gemini-2.5-flash' NOT NULL,
			seo_meta integer DEFAULT 1 NOT NULL,
			rss_feed integer DEFAULT 1 NOT NULL,
			time_zone text DEFAULT 'Asia/Kolkata' NOT NULL,
			reading_time integer DEFAULT 0 NOT NULL,
			allowed_origins text,
			umami_share_url text,
			bucket_name text,
			public_url text,
			account_id text,
			writing_style text,
			writing_sample text,
			updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
		);
	`);

	return drizzle(sqlite) as unknown as Db;
}

describe("settings profile schemas", () => {
	it("accepts valid identity input", () => {
		expect(
			identityInputSchema.safeParse({
				blogTitle: "ContentOS",
				domain: "blog.example.com",
				bio: "Notes on building things.",
			}).success,
		).toBe(true);
	});

	it("accepts an https URL domain and rejects junk", () => {
		expect(
			identityInputSchema.safeParse({
				blogTitle: "T",
				domain: "https://blog.example.com",
				bio: "",
			}).success,
		).toBe(true);
		expect(
			identityInputSchema.safeParse({
				blogTitle: "T",
				domain: "not a url",
				bio: "",
			}).success,
		).toBe(false);
		expect(
			identityInputSchema.safeParse({
				blogTitle: "T",
				domain: "https://blog.example.com/path",
				bio: "",
			}).success,
		).toBe(false);
	});

	it("validates time zones and umami URLs", () => {
		expect(
			publishingInputSchema.safeParse({
				timeZone: "Asia/Kolkata",
				umamiShareUrl: "",
				seoMeta: true,
				rssFeed: true,
				readingTime: false,
			}).success,
		).toBe(true);
		expect(
			publishingInputSchema.safeParse({
				timeZone: "Not/AZone",
				umamiShareUrl: "",
				seoMeta: true,
				rssFeed: true,
				readingTime: false,
			}).success,
		).toBe(false);
		expect(
			publishingInputSchema.safeParse({
				timeZone: "UTC",
				umamiShareUrl: "https://umami.example.com/share/abc",
				seoMeta: true,
				rssFeed: true,
				readingTime: false,
			}).success,
		).toBe(true);
		expect(
			publishingInputSchema.safeParse({
				timeZone: "UTC",
				umamiShareUrl: "javascript:alert(1)",
				seoMeta: true,
				rssFeed: true,
				readingTime: false,
			}).success,
		).toBe(false);
	});

	it("requires publishing toggles as booleans", () => {
		expect(
			publishingInputSchema.safeParse({
				timeZone: "UTC",
				umamiShareUrl: "",
			}).success,
		).toBe(false);
		expect(
			publishingInputSchema.safeParse({
				timeZone: "UTC",
				umamiShareUrl: "",
				seoMeta: true,
				rssFeed: true,
				readingTime: false,
			}).success,
		).toBe(true);
	});

	it("requires a non-empty default model", () => {
		expect(
			accountInputSchema.safeParse({
				displayName: "Owner",
				defaultModel: "",
				writingStyle: "",
				writingSample: "",
			}).success,
		).toBe(false);
	});
});

describe("owner settings profile (throwaway DB)", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("returns defaults when no row exists", async () => {
		expect(await readOwnerProfile(db, OWNER)).toEqual(DEFAULT_PROFILE);
	});

	it("persists identity, account, and publishing groups independently", async () => {
		await upsertIdentity(db, OWNER, {
			blogTitle: "Parm Writes",
			domain: "writes.example.com",
			bio: "Essays.",
		});
		await upsertAccount(db, OWNER, {
			displayName: "Parm",
			defaultModel: "openai/gpt-4o-mini",
			writingStyle: "Direct.",
			writingSample: "Sample text.",
		});
		await upsertPublishing(db, OWNER, {
			timeZone: "Europe/Berlin",
			umamiShareUrl: "https://umami.example.com/share/x",
			seoMeta: false,
			rssFeed: true,
			readingTime: true,
		});

		const profile = await readOwnerProfile(db, OWNER);
		expect(profile.blogTitle).toBe("Parm Writes");
		expect(profile.domain).toBe("writes.example.com");
		expect(profile.bio).toBe("Essays.");
		expect(profile.displayName).toBe("Parm");
		expect(profile.defaultModel).toBe("openai/gpt-4o-mini");
		expect(profile.writingStyle).toBe("Direct.");
		expect(profile.writingSample).toBe("Sample text.");
		expect(profile.timeZone).toBe("Europe/Berlin");
		expect(profile.umamiShareUrl).toBe("https://umami.example.com/share/x");
		expect(profile.seoMeta).toBe(false);
		expect(profile.rssFeed).toBe(true);
		expect(profile.readingTime).toBe(true);
	});

	it("does not clobber other groups on update", async () => {
		await upsertIdentity(db, OWNER, {
			blogTitle: "First",
			domain: "",
			bio: "",
		});
		await upsertPublishing(db, OWNER, {
			timeZone: "UTC",
			umamiShareUrl: "",
			seoMeta: true,
			rssFeed: true,
			readingTime: false,
		});

		await upsertIdentity(db, OWNER, {
			blogTitle: "Second",
			domain: "second.example.com",
			bio: "",
		});

		const profile = await readOwnerProfile(db, OWNER);
		expect(profile.blogTitle).toBe("Second");
		expect(profile.timeZone).toBe("UTC");
	});
});
