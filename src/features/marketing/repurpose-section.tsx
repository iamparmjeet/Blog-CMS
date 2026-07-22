import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";

const platforms = [
	{
		dotColor: "bg-zinc-300",
		name: "X / Twitter",
		heading: "Thread format · Auto-numbered",
		body: (
			<>
				Building in public is the new cold email. Here&apos;s what 90 days of
				shipping in the open taught me ↓
				<br />
				<br />
				Week 1: You think nobody is watching. Wrong. The first post got 3 DMs
				from people with the exact same problem.
			</>
		),
	},
	{
		dotColor: "bg-[#0a66c2]",
		name: "LinkedIn",
		heading: "Long-form · Professional tone",
		body: (
			<>
				After three years of Notion, I built something I actually want to use.
				<br />
				<br />→ The best tool is shaped to how you think
				<br />→ Public accountability accelerates iteration
				<br />→ Shipping imperfect beats waiting for perfect
			</>
		),
	},
	{
		dotColor: "bg-[#e1306c]",
		name: "Instagram",
		heading: "Caption + hashtags",
		body: "Built the tool I always wanted.\n\nAfter 3 years of fighting Notion, I spent 3 weeks building my own CMS. Zero friction between idea and published.",
		hashtags: "#buildinpublic #indiedev #writing #tools",
	},
];

export function RepurposeSection() {
	return (
		<section id="repurpose" className="py-24">
			<div className="mx-auto max-w-275 px-6">
				<AnimateOnScroll>
					<div className="mx-auto mb-16 flex max-w-2xl flex-col items-center gap-4 text-center">
						<span className="text-xs font-semibold uppercase tracking-[0.06em] text-violet-500">
							Repurpose
						</span>
						<h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
							One post. Three platforms.
						</h2>
						<p className="max-w-135 text-[15px] leading-relaxed text-zinc-500">
							The repurpose panel lives alongside your editor. Pick a platform,
							click Generate, and get platform-native content — streamed to you
							in real time.
						</p>
					</div>
				</AnimateOnScroll>

				<div className="grid gap-3 sm:grid-cols-3">
					{platforms.map((p, i) => (
						<AnimateOnScroll key={p.name} delay={i * 100}>
							<div className="overflow-hidden rounded-xl border border-white/5 bg-[#0d0d0d]">
								<div className="flex items-center gap-2 border-b border-white/5 px-4 py-3.5">
									<span className={`h-1.5 w-1.5 rounded-full ${p.dotColor}`} />
									<span className="text-xs font-semibold text-zinc-300">
										{p.name}
									</span>
								</div>
								<div className="p-4">
									<strong className="mb-1.5 block text-xs font-medium text-zinc-500">
										{p.heading}
									</strong>
									<p className="whitespace-pre-line text-xs leading-relaxed text-zinc-600">
										{p.body}
									</p>
									{p.hashtags && (
										<p className="mt-2.5 text-[11px] text-violet-500/70">
											{p.hashtags}
										</p>
									)}
								</div>
							</div>
						</AnimateOnScroll>
					))}
				</div>
			</div>
		</section>
	);
}
