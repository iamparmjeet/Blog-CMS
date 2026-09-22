import { describe, expect, it } from "vitest";
import {
	parseWranglerJsonc,
	runDeployCheck,
	type WranglerConfig,
} from "./deploy-check";

const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
const REAL_ID = "142c33e3-399b-4eea-9164-10995ce4f115";

function baseConfig(databaseId: string): WranglerConfig {
	return {
		d1_databases: [
			{ binding: "DB", database_name: "blog-cms", database_id: databaseId },
		],
		r2_buckets: [{ binding: "MEDIA", bucket_name: "contentos" }],
	};
}

describe("parseWranglerJsonc", () => {
	it("parses jsonc with comments", () => {
		const raw = `{
			// binding comment
			"d1_databases": [{ "binding": "DB", "database_id": "${REAL_ID}" }],
			/* block */
			"r2_buckets": [{ "binding": "MEDIA", "bucket_name": "contentos" }]
		}`;
		const parsed = parseWranglerJsonc(raw);
		expect(parsed.d1_databases?.[0]?.database_id).toBe(REAL_ID);
		expect(parsed.r2_buckets?.[0]?.bucket_name).toBe("contentos");
	});
});

describe("runDeployCheck", () => {
	it("passes with real bindings and a real database id", () => {
		const result = runDeployCheck(baseConfig(REAL_ID));
		expect(result.ok).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("rejects the placeholder database id", () => {
		const result = runDeployCheck(baseConfig(PLACEHOLDER));
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("placeholder"))).toBe(true);
	});

	it("rejects a non-uuid database id", () => {
		const result = runDeployCheck(baseConfig("not-a-uuid"));
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("not a valid UUID"))).toBe(
			true,
		);
	});

	it("rejects missing DB binding", () => {
		const result = runDeployCheck({
			d1_databases: [],
			r2_buckets: [{ binding: "MEDIA", bucket_name: "contentos" }],
		});
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes('"DB"'))).toBe(true);
	});

	it("rejects missing MEDIA binding", () => {
		const result = runDeployCheck({
			d1_databases: [
				{ binding: "DB", database_name: "blog-cms", database_id: REAL_ID },
			],
			r2_buckets: [],
		});
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes('"MEDIA"'))).toBe(true);
	});

	it("rejects MEDIA binding without bucket_name", () => {
		const result = runDeployCheck({
			d1_databases: [
				{ binding: "DB", database_name: "blog-cms", database_id: REAL_ID },
			],
			r2_buckets: [{ binding: "MEDIA" }],
		});
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("bucket_name"))).toBe(true);
	});
});
