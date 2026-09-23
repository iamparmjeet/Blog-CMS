import { motion, useReducedMotion } from "motion/react";
import { BrowserHeader } from "./browser-header";
import { Editor } from "./editor";
import { RepurposePanel } from "./repurpose-panel";
import { Sidebar } from "./sidebar";

export function DashMock() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			aria-hidden="true"
			inert
			animate={shouldReduceMotion ? { y: 0 } : { y: [0, -6, 0] }}
			transition={{
				duration: 6,
				repeat: Infinity,
				ease: "easeInOut",
			}}
			className="pageowl-demo relative mx-auto w-full select-none overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_60px_rgba(7,29,85,0.12)]"
		>
			<BrowserHeader />
			<div className="grid h-100 grid-cols-1 sm:grid-cols-[1fr_260px] lg:h-155 lg:grid-cols-[200px_1fr_280px]">
				<Sidebar className="hidden lg:flex" />
				<Editor />
				<RepurposePanel className="hidden sm:flex" />
			</div>
		</motion.div>
	);
}
