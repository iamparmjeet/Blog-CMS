import { IconArrowRight } from "@tabler/icons-react";
import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";
import { Button } from "@/components/ui/button";

export function FinalCTASection() {
	return (
		<section className="py-24 text-center">
			<div className="mx-auto max-w-275 px-6">
				<AnimateOnScroll>
					<h2 className="mb-4 text-4xl font-semibold tracking-[-0.04em] text-zinc-100 sm:text-6xl">
						Ready to write?
					</h2>
					<p className="mb-9 text-[15px] text-zinc-600">
						Deploy in minutes. Your writing stack, set up in seconds.
					</p>
					<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
						<Button size="lg">
							<a href="/dashboard" className="flex items-center">
								Get started free
								<IconArrowRight className="ml-2 h-4 w-4" />
							</a>
						</Button>
						<Button variant="outline" size="lg">
							<a href="https://github.com" target="_blank" rel="noreferrer">
								Read the docs
							</a>
						</Button>
					</div>
				</AnimateOnScroll>
			</div>
		</section>
	);
}
