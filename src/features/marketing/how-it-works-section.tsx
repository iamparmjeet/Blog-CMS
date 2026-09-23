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
		<section id="how" className="border-border border-y bg-muted/30 py-24">
			<div className="mx-auto max-w-275 px-6">
				<AnimateOnScroll>
					<div className="mx-auto mb-16 flex max-w-2xl flex-col items-center gap-4 text-center">
						<span className="font-semibold text-brand text-xs uppercase tracking-[0.06em]">
							How it works
						</span>
						<h2 className="font-semibold text-3xl text-foreground tracking-[-0.03em] sm:text-4xl">
							Simple by design.
						</h2>
					</div>
				</AnimateOnScroll>

				<div className="grid gap-10 sm:grid-cols-3">
					{steps.map((step, i) => (
						<AnimateOnScroll key={step.title} delay={i * 100}>
							<div className="flex flex-col gap-3.5">
								<span className="font-medium font-mono text-[11px] text-brand tracking-[0.04em]">
									{step.number} ——
								</span>
								<h3 className="font-semibold text-base text-foreground tracking-[-0.01em]">
									{step.title}
								</h3>
								<p className="text-[13px] text-muted-foreground leading-relaxed">
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
