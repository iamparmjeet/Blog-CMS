import { IconArrowRight, IconBrandGithub } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { PageOwlLogo } from "#/components/shared/page-owl-logo";
import { Badge } from "#/components/ui/badge";
import { buttonVariants } from "#/components/ui/button";
import { usePlatformRotation } from "#/hooks/motion/use-platform-rotation";
import { cn } from "#/lib/utils";
import { DashMock } from "./featured/dash-mock";

const itemProps: Record<string, unknown> = {
	initial: { opacity: 0, y: 20, filter: "blur(4px)" },
	animate: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
	},
};

export function Hero() {
	const platform = usePlatformRotation();

	return (
		<section
			id="features"
			className="relative isolate flex min-h-dvh flex-col items-center justify-center pt-16"
		>
			{/* Background */}
			<div className="absolute inset-0 -z-30 bg-background" />

			{/* Subtle radial glow */}
			<div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(11,130,246,0.08),transparent_70%)]" />

			{/* Grid overlay */}
			<div className="mask-[radial-gradient(circle_at_50%_0%,black_30%,transparent_70%)] absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(8,103,242,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(8,103,242,0.035)_1px,transparent_1px)] bg-size-[56px_56px]" />

			<div className="container mx-auto max-w-6xl px-6 py-12">
				<div className="mx-auto flex max-w-280 flex-col items-center text-center">
					{/* Badge */}
					<motion.div {...itemProps}>
						<Badge
							variant="outline"
							className="gap-2 border-brand/20 bg-card/80 px-4 py-3 text-foreground text-xs"
						>
							<PageOwlLogo
								animated={false}
								aria-hidden="true"
								className="size-5"
								showWordmark={false}
								title=""
							/>
							Open Source · Self-hosted · No subscription
						</Badge>
					</motion.div>

					{/* Heading*/}
					<motion.h1
						{...itemProps}
						className="mt-10 text-balance font-bold text-5xl tracking-[-0.04em] sm:text-7xl"
					>
						Write Once. <br />{" "}
						<span className="bg-linear-to-r from-[#0b82f6] via-[#0867f2] to-[#1746c8] bg-clip-text text-transparent dark:from-[#12b8f4] dark:via-[#0b82f6] dark:to-[#2563eb]">
							Ship everywhere.
						</span>
					</motion.h1>

					{/* Subtitle*/}
					<motion.p
						{...itemProps}
						className="mt-8 max-w-lg text-base text-muted-foreground leading-7"
					>
						A distraction-free CMS with{" "}
						<span className="font-medium text-foreground">
							AI-powered repurposing
						</span>{" "}
						built in. Write once and instantly generate platform-ready content
						for Twitter, LinkedIn and Instagram.
					</motion.p>

					{/* Platform Rotation*/}
					<motion.div
						{...itemProps}
						className="mt-6 flex items-center gap-1.5 text-muted-foreground text-sm"
					>
						<span>Generate your next</span>
						<AnimatePresence mode="wait" initial={false}>
							<motion.span
								key={platform}
								initial={{ opacity: 0, y: 6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								transition={{ duration: 0.35, ease: "easeOut" }}
								className="font-semibold text-brand"
							>
								{platform}
							</motion.span>
						</AnimatePresence>
						<span>from any article.</span>
					</motion.div>

					{/*Button*/}
					<motion.div
						{...itemProps}
						className="mt-8 flex flex-col gap-3 sm:flex-row"
					>
						<a
							href="#open-source"
							className={cn(
								buttonVariants({ variant: "purple", size: "lg" }),
								"group gap-2",
							)}
						>
							Self-host it free
							<IconArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
						</a>
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
					</motion.div>
					{/* Browser Window */}
					<motion.div {...itemProps} className="mt-16 w-full">
						<DashMock />
					</motion.div>
				</div>
			</div>
		</section>
	);
}
