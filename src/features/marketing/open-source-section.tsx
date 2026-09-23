import {
	IconBrandGithub,
	IconFileText,
	IconGitFork,
	IconLicense,
	IconServer,
	IconStar,
} from "@tabler/icons-react";
import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";
import { buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";

const REPO_URL = "https://github.com/iamparmjeet/PageOwl";

const meta = [
	{ icon: IconLicense, label: "MIT licensed" },
	{ icon: IconServer, label: "Self-hosted" },
	{ icon: IconGitFork, label: "Fork it, own it" },
];

const installSteps = [
	{
		prompt: "$",
		command: `git clone ${REPO_URL}.git`,
	},
	{ prompt: "$", command: "cd PageOwl && bun install" },
	{ prompt: "$", command: "bun run db:migrate:remote" },
	{ prompt: "$", command: "bun run deploy" },
];

const DEPLOY_GUIDE_URL = `${REPO_URL}/blob/main/docs/deploy.md`;

export function OpenSourceSection() {
	return (
		<section
			id="open-source"
			className="border-border border-b bg-muted/30 py-24"
		>
			<div className="mx-auto grid max-w-275 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
				<AnimateOnScroll className="min-w-0">
					<div className="flex flex-col items-start">
						<h2 className="text-balance font-semibold text-3xl text-foreground tracking-[-0.03em] sm:text-4xl">
							Open source. Self-hosted. Yours.
						</h2>
						<p className="mt-4 max-w-135 text-[15px] text-muted-foreground leading-relaxed">
							No subscription, no seat limits, no lock-in. Clone the repo, point
							it at your domain, and keep every post in a database you control.
						</p>

						<ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
							{meta.map(({ icon: Icon, label }) => (
								<li
									key={label}
									className="inline-flex items-center gap-1.5 text-muted-foreground text-xs"
								>
									<Icon className="size-3.5 text-brand" />
									{label}
								</li>
							))}
						</ul>

						<a
							href={REPO_URL}
							target="_blank"
							rel="noreferrer"
							className={cn(
								buttonVariants({ variant: "purple", size: "lg" }),
								"mt-8 gap-2",
							)}
						>
							<IconStar className="size-4" />
							Star on GitHub
						</a>
					</div>
				</AnimateOnScroll>

				<AnimateOnScroll className="min-w-0" delay={100}>
					<div className="overflow-hidden rounded-xl border border-border bg-card">
						<div className="flex items-center gap-3 border-border border-b px-4 py-3.5">
							<div className="flex gap-1.5">
								<span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
							</div>
							<span className="font-medium text-[11px] text-muted-foreground">
								terminal
							</span>
						</div>
						<pre className="overflow-x-auto px-5 py-5 font-mono text-[12px] leading-7 max-sm:whitespace-pre-wrap max-sm:break-all">
							<code>
								{installSteps.map((step) => (
									<span key={step.command} className="block">
										<span className="mr-2 text-brand">{step.prompt}</span>
										<span className="text-foreground">{step.command}</span>
									</span>
								))}
								<span className="mt-1 block text-emerald-700 dark:text-emerald-400">
									✓ Deployed to your-domain.com
								</span>
							</code>
						</pre>
					</div>

					<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
						<a
							href={REPO_URL}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-brand"
						>
							<IconBrandGithub className="size-3.5" />
							Browse the source
						</a>
						<a
							href={DEPLOY_GUIDE_URL}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-brand"
						>
							<IconFileText className="size-3.5" />
							Deploy guide
						</a>
					</div>
				</AnimateOnScroll>
			</div>
		</section>
	);
}
