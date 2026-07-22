import { IconWand } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";

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

const tabs = ["Twitter", "LinkedIn", "Instagram"] as const;

export function RepurposePanel() {
	const [active, setActive] = useState<number>(0);
	const platform = tabs[active].toLowerCase();
	const lines = PLATFORM_CONTENT[platform];

	return (
		<aside className="flex h-full flex-col border-l border-white/5 bg-zinc-950">
			{/* Button*/}
			<div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
				<IconWand className="h-4 w-4 text-violet-400" />
				<span className="text-xs font-semibold text-zinc-300">Repurpose</span>
			</div>

			{/* Tabs */}
			<div className="flex gap-0.5 border-b border-white/5 p-2">
				{tabs.map((tab, i) => (
					<Button
						key={tab}
						onClick={() => setActive(i)}
						size="sm"
						variant={i === active ? "purple" : "outline"}
					>
						{tab}
					</Button>
				))}
			</div>

			<div className="px-3 py-3">
				<Button variant="secondary" className="w-full h-9 text-xs" size="sm">
					<IconWand className="mr-1.5 h-3.5 w-3.5" />
					Generate
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto px-3 pb-3">
				<div className="rounded-lg border border-white/5 bg-black px-4 py-3.5">
					{lines.map((line, i) => (
						<p
							key={i}
							className={`text-[11px] leading-6 ${
								line.startsWith("#") || line.startsWith("→")
									? "text-violet-400/80"
									: i === 0
										? "font-semibold text-zinc-300"
										: line
											? "text-zinc-500"
											: "h-2"
							}`}
						>
							{line || "\u00A0"}
						</p>
					))}
					<span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-violet-500 align-text-bottom" />
				</div>
			</div>
		</aside>
	);
}
