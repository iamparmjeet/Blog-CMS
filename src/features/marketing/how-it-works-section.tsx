import { AnimateOnScroll } from "#/components/motion/animate-on-scroll";

const steps = [
	{
		number: "01",
		title: "Write",
		description:
			"Open the editor and write your post. Autosave handles the rest — no save button, no draft management, just writing.",
	},
	{
		number: "02",
		title: "Publish",
		description:
			"Toggle the switch in the sidebar. Your post goes live on your domain. Toggle it off to unpublish. No modals, no confirmation dialogs.",
	},
	{
		number: "03",
		title: "Repurpose",
		description:
			"Open the side panel, pick a platform, and click Generate. Watch your post transform into platform-native content, streamed in real time.",
	},
];

export function HowItWorksSection() {
	return (
		<section id="how" className="border-y border-white/5 bg-[#060606] py-24">
			<div className="mx-auto max-w-275 px-6">
				<AnimateOnScroll>
					<div className="mx-auto mb-16 flex max-w-2xl flex-col items-center gap-4 text-center">
						<span className="text-xs font-semibold uppercase tracking-[0.06em] text-violet-500">
							How it works
						</span>
						<h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
							Simple by design.
						</h2>
					</div>
				</AnimateOnScroll>

				<div className="grid gap-10 sm:grid-cols-3">
					{steps.map((step, i) => (
						<AnimateOnScroll key={step.title} delay={i * 100}>
							<div className="flex flex-col gap-3.5">
								<span className="font-mono text-[11px] font-medium tracking-[0.04em] text-violet-500">
									{step.number} ——
								</span>
								<h3 className="text-base font-semibold tracking-[-0.01em] text-zinc-200">
									{step.title}
								</h3>
								<p className="text-[13px] leading-relaxed text-zinc-600">
									{step.description}
								</p>
							</div>
						</AnimateOnScroll>
					))}
				</div>
			</div>
		</section>
	);
}
