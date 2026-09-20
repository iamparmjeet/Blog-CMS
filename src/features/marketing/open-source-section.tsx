import {
	IconBrandGithub,
	IconGitFork,
	IconLicense,
	IconServer,
	IconStar,
} from "@tabler/icons-react";
import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";
import { buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";

const REPO_URL = "https://github.com/iamparmjeet/blog-cms";

const meta = [
	{ icon: IconLicense, label: "MIT licensed" },
	{ icon: IconServer, label: "Self-hosted" },
	{ icon: IconGitFork, label: "Fork it, own it" },
];

const installSteps = [
	{ prompt: "$", command: "git clone github.com/iamparmjeet/blog-cms" },
	{ prompt: "$", command: "cd blog-cms && bun install" },
	{ prompt: "$", command: "bun run db:push" },
	{ prompt: "$", command: "bun run deploy" },
];

export function OpenSourceSection() {
	return (
		<section
			id="open-source"
			className="border-white/5 border-b bg-[#060606] py-24"
		>
			<div className="mx-auto grid max-w-275 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
				<AnimateOnScroll>
					<div className="flex flex-col items-start">
						<h2 className="text-balance font-semibold text-3xl text-zinc-100 tracking-[-0.03em] sm:text-4xl">
							Open source. Self-hosted. Yours.
						</h2>
						<p className="mt-4 max-w-135 text-[15px] text-zinc-500 leading-relaxed">
							No subscription, no seat limits, no lock-in. Clone the repo, point
							it at your domain, and keep every post in a database you control.
						</p>

						<ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
							{meta.map(({ icon: Icon, label }) => (
								<li
									key={label}
									className="inline-flex items-center gap-1.5 text-xs text-zinc-500"
								>
									<Icon className="size-3.5 text-violet-400/80" />
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

				<AnimateOnScroll delay={100}>
					<div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]">
						<div className="flex items-center gap-3 border-white/5 border-b px-4 py-3.5">
							<div className="flex gap-1.5">
								<span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
							</div>
							<span className="font-medium text-[11px] text-zinc-500">
								terminal
							</span>
						</div>
						<pre className="overflow-x-auto px-5 py-5 font-mono text-[12px] leading-7">
							<code>
								{installSteps.map((step) => (
									<span key={step.command} className="block">
										<span className="mr-2 text-violet-400/70">
											{step.prompt}
										</span>
										<span className="text-zinc-300">{step.command}</span>
									</span>
								))}
								<span className="mt-1 block text-emerald-500">
									✓ Deployed to your-domain.com
								</span>
							</code>
						</pre>
					</div>

					<a
						href={REPO_URL}
						target="_blank"
						rel="noreferrer"
						className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-violet-400"
					>
						<IconBrandGithub className="size-3.5" />
						Browse the source
					</a>
				</AnimateOnScroll>
			</div>
		</section>
	);
}
