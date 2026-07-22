import {
	IconBold,
	IconCode,
	IconHeading,
	IconItalic,
	IconSparkles,
} from "@tabler/icons-react";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";

export function Editor() {
	return (
		<main className="flex h-full flex-col bg-black">
			{/* title */}
			<div className="flex h-10 items-center justify-between border-b border-white/5 px-6">
				<span className="text-xs text-zinc-600">
					← Posts / Why I Ditched Notion for a Custom CMS
				</span>
				<span className="text-xs font-medium text-emerald-500">✓ Saved</span>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden">
				<div className="mx-auto max-w-2xl px-10 py-10">
					<h1 className="text-xl font-semibold tracking-[-0.02em] text-white leading-snug">
						Why I Ditched Notion
						<br />
						for a Custom CMS
					</h1>
					<p className="mt-2 font-mono text-[10px] text-zinc-600">
						/why-i-diteched-notion
					</p>
					<Separator className="my-7 bg-white/5" />

					{/* Floating toolbar*/}
					<div className="mb-8 inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-zinc-900 p-1">
						<ToolButton>
							<IconBold className="h-4 w-4" />
						</ToolButton>
						<ToolButton active>
							<IconItalic className="h-4 w-4" />
						</ToolButton>
						<ToolButton>
							<IconHeading className="h-4 w-4" />
						</ToolButton>
						<ToolButton>
							<IconCode className="h-4 w-4" />
						</ToolButton>
						<ToolButton>
							<IconSparkles className="h-4 w-4 text-violet-400" />
						</ToolButton>
					</div>

					{/* Content Body */}
					<div className="space-y-4 text-[13px] leading-relaxed text-zinc-400">
						<p>
							After three years of using Notion, I finally built something that
							actually matches how I think. This is not a hot take — it is about
							removing friction between having an idea and publishing it.
						</p>

						<blockquote className="border-l-2 border-violet-500/40 pl-4 italic text-zinc-300">
							&ldquo;It started with the sluggishness.&rdquo;
						</blockquote>

						<p>
							Not performance sluggishness. I mean the mental cost of managing a
							system when all I wanted to do was write.
						</p>

						<h2 className="text-sm font-semibold text-zinc-200 pt-2">
							So I built something
						</h2>

						<p>
							Three weeks, one GitHub repo, a lot of late nights. The result is
							a CMS shaped exactly to how I think, with zero features I did not
							personally need.
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}

function ToolButton({
	children,
	active,
}: {
	children: React.ReactNode;
	active?: boolean;
}) {
	return <Button variant={active ? "purple" : "outline"}>{children}</Button>;
}
