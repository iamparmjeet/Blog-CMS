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
			<div className="flex h-10 items-center justify-between border-white/5 border-b px-6">
				<span className="text-xs text-zinc-600">
					← Posts / Why I Ditched Notion for a Custom CMS
				</span>
				<span className="font-medium text-emerald-500 text-xs">✓ Saved</span>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden">
				<div className="mx-auto max-w-2xl px-10 py-10">
					<h1 className="font-semibold text-white text-xl leading-snug tracking-[-0.02em]">
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
					<div className="space-y-4 text-[13px] text-zinc-400 leading-relaxed">
						<p>
							After three years of using Notion, I finally built something that
							actually matches how I think. This is not a hot take — it is about
							removing friction between having an idea and publishing it.
						</p>

						<blockquote className="border-violet-500/40 border-l-2 pl-4 text-zinc-300 italic">
							&ldquo;It started with the sluggishness.&rdquo;
						</blockquote>

						<p>
							Not performance sluggishness. I mean the mental cost of managing a
							system when all I wanted to do was write.
						</p>

						<h2 className="pt-2 font-semibold text-sm text-zinc-200">
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
