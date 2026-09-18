import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";

export function QuoteSection() {
	return (
		<section className="border-white/5 border-y py-20">
			<div className="mx-auto max-w-180 px-6 text-center">
				<AnimateOnScroll>
					<div className="mb-2 font-serif text-5xl text-white/10 leading-none">
						&ldquo;
					</div>
					<p className="mx-auto mb-5 max-w-170 font-medium text-xl text-zinc-300 leading-relaxed tracking-[-0.02em] sm:text-2xl">
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
