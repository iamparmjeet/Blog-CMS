import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";

export function QuoteSection() {
	return (
		<section className="border-y border-white/5 py-20">
			<div className="mx-auto max-w-180 px-6 text-center">
				<AnimateOnScroll>
					<div className="text-5xl leading-none text-white/10 font-serif mb-2">
						&ldquo;
					</div>
					<p className="mx-auto mb-5 max-w-170 text-xl font-medium tracking-[-0.02em] leading-relaxed text-zinc-300 sm:text-2xl">
						I spent three years optimizing Notion instead of writing. After
						building content.os, I write every single day.
					</p>
					<p className="text-xs text-zinc-700">
						<strong className="font-medium text-zinc-500">Alex Morgan</strong> ·
						Building in public since 2023
					</p>
				</AnimateOnScroll>
			</div>
		</section>
	);
}
