import { IconWand } from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface ContentLine {
	id: string;
	text: string;
}

const PLATFORM_CONTENT: Record<string, string[]> = {
	twitter: [
		"🧵 Thread (1/4)",
		"",
		"Building in public is the new cold email.",
		"",
		"Here's what 90 days taught me ↓",
		"",
		"Week 1: You think nobody is watching.",
		"Week 2: Three people DM you.",
		"Week 4: Someone asks to buy.",
		"",
		"Stop optimizing. Start publishing.",
	],
	linkedin: [
		"After three years in Notion, I realized",
		"I was not writing. I was organizing.",
		"",
		"So I built my own CMS. Three weeks:",
		"",
		"→ Faster publishing",
		"→ AI repurposing built in",
		"→ One click to publish",
		"",
		"Sometimes the best tool is the one you build.",
	],
	instagram: [
		"Built the writing tool I always wanted ✨",
		"",
		"No distractions. No dashboards.",
		"Just writing. Then one click converts",
		"everything into threads, posts, and captions.",
		"",
		"#buildinpublic #indiedev #writing",
	],
};

const PLATFORM_LINES: Record<string, ContentLine[]> = Object.fromEntries(
	Object.entries(PLATFORM_CONTENT).map(([platform, lines]) => [
		platform,
		lines.map((text, i) => ({ id: `${platform}-${i}`, text })),
	]),
);

const tabs = ["Twitter", "LinkedIn", "Instagram"] as const;
const activeTab = tabs[0];

export function RepurposePanel({ className }: { className?: string }) {
	const lines = PLATFORM_LINES[activeTab.toLowerCase()];

	return (
		<aside
			className={cn(
				"flex h-full flex-col border-white/5 border-l bg-zinc-950",
				className,
			)}
		>
			{/* Button*/}
			<div className="flex items-center gap-2 border-white/5 border-b px-4 py-3">
				<IconWand className="h-4 w-4 text-violet-400" />
				<span className="font-semibold text-xs text-zinc-300">Repurpose</span>
			</div>

			{/* Tabs */}
			<div className="flex gap-0.5 border-white/5 border-b p-2">
				{tabs.map((tab) => (
					<Button
						key={tab}
						size="sm"
						variant={tab === activeTab ? "purple" : "outline"}
					>
						{tab}
					</Button>
				))}
			</div>

			<div className="px-3 py-3">
				<Button variant="secondary" className="h-9 w-full text-xs" size="sm">
					<IconWand className="mr-1.5 h-3.5 w-3.5" />
					Generate
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto px-3 pb-3">
				<div className="rounded-lg border border-white/5 bg-black px-4 py-3.5">
					{lines.map((line, i) => (
						<p
							key={line.id}
							className={`text-[11px] leading-6 ${
								line.text.startsWith("#") || line.text.startsWith("→")
									? "text-violet-400/80"
									: i === 0
										? "font-semibold text-zinc-300"
										: line.text
											? "text-zinc-500"
											: "h-2"
							}`}
						>
							{line.text || "\u00A0"}
						</p>
					))}
					<span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-violet-500 align-text-bottom motion-reduce:animate-none" />
				</div>
			</div>
		</aside>
	);
}
