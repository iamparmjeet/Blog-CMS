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
		<div className="flex h-full flex-col bg-background">
			{/* title */}
			<div className="flex h-10 items-center justify-between gap-3 border-border border-b px-4 sm:px-6">
				<span className="truncate text-muted-foreground text-xs">
					← Posts / Why I Ditched Notion for a Custom CMS
				</span>
				<span className="shrink-0 font-medium text-emerald-500 text-xs">
					✓ Saved
				</span>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden">
				<div className="mx-auto max-w-2xl px-6 py-6 sm:px-10 sm:py-10">
					<h1 className="font-semibold text-foreground text-xl leading-snug tracking-[-0.02em]">
						Why I Ditched Notion
						<br />
						for a Custom CMS
					</h1>
					<p className="mt-2 font-mono text-[10px] text-muted-foreground">
						/why-i-ditched-notion
					</p>
					<Separator className="my-6 bg-border sm:my-7" />

					{/* Floating toolbar*/}
					<div className="mb-6 inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-1 sm:mb-8">
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
							<IconSparkles className="h-4 w-4 text-brand" />
						</ToolButton>
					</div>

					{/* Content Body */}
					<div className="space-y-4 text-[13px] text-muted-foreground leading-relaxed">
						<p>
							After three years of using Notion, I finally built something that
							actually matches how I think. This is not a hot take — it is about
							removing friction between having an idea and publishing it.
						</p>

						<blockquote className="border-brand/40 border-l-2 pl-4 text-foreground italic">
							&ldquo;It started with the sluggishness.&rdquo;
						</blockquote>

						<p className="hidden sm:block">
							Not performance sluggishness. I mean the mental cost of managing a
							system when all I wanted to do was write.
						</p>

						<h2 className="hidden pt-2 font-semibold text-foreground text-sm sm:block">
							So I built something
						</h2>

						<p className="hidden sm:block">
							Three weeks, one GitHub repo, a lot of late nights. The result is
							a CMS shaped exactly to how I think, with zero features I did not
							personally need.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function ToolButton({
	children,
	active,
}: {
	children: React.ReactNode;
	active?: boolean;
}) {
	return <Button variant={active ? "brand" : "outline"}>{children}</Button>;
}
