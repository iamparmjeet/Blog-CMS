import { IconArrowRight, IconBrandGithub } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";
import { buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";

export function FinalCTASection() {
	return (
		<section className="py-24">
			<div className="mx-auto max-w-275 px-6">
				<AnimateOnScroll>
					<div className="relative isolate overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] px-6 py-16 text-center sm:px-16">
						{/* Accent glow */}
						<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_70%_at_50%_0%,rgba(124,58,237,0.16),transparent_70%)]" />
						<div className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-violet-500/50 to-transparent" />

						<h2 className="text-balance font-semibold text-4xl text-zinc-100 tracking-[-0.04em] sm:text-5xl">
							Ready to write?
						</h2>
						<p className="mx-auto mt-4 max-w-100 text-[15px] text-zinc-500 leading-relaxed">
							Deploy in minutes. Your writing stack, set up in seconds.
						</p>

						<div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
							<Link
								to="/dashboard"
								className={cn(buttonVariants({ size: "lg" }), "gap-2")}
							>
								Get started free
								<IconArrowRight className="size-4" />
							</Link>
							<a
								href="https://github.com/iamparmjeet/blog-cms"
								target="_blank"
								rel="noreferrer"
								className={cn(
									buttonVariants({ variant: "outline", size: "lg" }),
									"gap-2",
								)}
							>
								<IconBrandGithub className="size-4" />
								View on GitHub
							</a>
						</div>

						<p className="mt-7 text-xs text-zinc-600">
							MIT licensed · Self-hosted · No subscription
						</p>
					</div>
				</AnimateOnScroll>
			</div>
		</section>
	);
}
