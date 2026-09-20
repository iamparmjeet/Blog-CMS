import type { MediaItem } from "./media.types";

export const THUMBNAIL_COLORS = [
	"#7c3aed",
	"#2563eb",
	"#059669",
	"#dc2626",
	"#d97706",
	"#0891b2",
] as const;

export const DEMO_MEDIA_ITEMS: MediaItem[] = [
	{
		dims: "1200×630",
		id: 1,
		kind: "image",
		name: "hero-notion-workspace.png",
		sizeKb: 2150,
		uploadedAt: "2026-09-12T09:24:00.000Z",
		url: "https://media.example.com/hero-notion-workspace.png",
	},
	{
		dims: "1440×900",
		id: 2,
		kind: "image",
		name: "content-os-dashboard.png",
		sizeKb: 1434,
		uploadedAt: "2026-09-10T15:02:00.000Z",
		url: "https://media.example.com/content-os-dashboard.png",
	},
	{
		dims: "1080×1920",
		duration: "0:29",
		id: 3,
		kind: "video",
		name: "building-in-public-reel.mp4",
		sizeKb: 12595,
		uploadedAt: "2026-09-08T11:47:00.000Z",
		url: "https://media.example.com/building-in-public-reel.mp4",
	},
	{
		dims: "800×600",
		id: 4,
		kind: "image",
		name: "workflow-diagram.png",
		sizeKb: 845,
		uploadedAt: "2026-09-05T08:12:00.000Z",
		url: "https://media.example.com/workflow-diagram.png",
	},
	{
		dims: "1200×630",
		id: 5,
		kind: "image",
		name: "async-workflow-cover.png",
		sizeKb: 1843,
		uploadedAt: "2026-09-02T18:35:00.000Z",
		url: "https://media.example.com/async-workflow-cover.png",
	},
	{
		dims: "1080×1920",
		duration: "0:45",
		id: 6,
		kind: "video",
		name: "ai-tools-demo.mp4",
		sizeKb: 8909,
		uploadedAt: "2026-08-29T13:20:00.000Z",
		url: "https://media.example.com/ai-tools-demo.mp4",
	},
];
