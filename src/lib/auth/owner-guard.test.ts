import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { user } from "#/db/auth-schema";
import { assertOwnerClaimAllowed } from "./owner";

function createThrowawayDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0 NOT NULL,
      image TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
  `);
	return drizzle(sqlite);
}

async function readOwnerEmail(
	db: ReturnType<typeof createThrowawayDb>,
): Promise<string | null> {
	const [owner] = await db.select({ email: user.email }).from(user).limit(1);

	return owner?.email ?? null;
}

describe("owner claim guard (throwaway DB)", () => {
	let db: ReturnType<typeof createThrowawayDb>;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("allows the first claim on an empty instance", async () => {
		const existingEmail = await readOwnerEmail(db);

		expect(existingEmail).toBeNull();
		expect(() =>
			assertOwnerClaimAllowed(existingEmail, "owner@example.com"),
		).not.toThrow();
	});

	it("allows the owner to return with the same email", async () => {
		await db.insert(user).values({
			id: "owner-1",
			name: "Owner",
			email: "owner@example.com",
		});

		const existingEmail = await readOwnerEmail(db);

		expect(() =>
			assertOwnerClaimAllowed(existingEmail, "Owner@Example.com"),
		).not.toThrow();
	});

	it("rejects a second distinct user", async () => {
		await db.insert(user).values({
			id: "owner-1",
			name: "Owner",
			email: "owner@example.com",
		});

		const existingEmail = await readOwnerEmail(db);

		expect(() =>
			assertOwnerClaimAllowed(existingEmail, "intruder@example.com"),
		).toThrow("This instance has already been claimed.");
	});
});
