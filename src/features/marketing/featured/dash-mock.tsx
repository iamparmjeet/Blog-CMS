import { motion } from "motion/react";
import { BrowserHeader } from "./browser-header";
import { Editor } from "./editor";
import { RepurposePanel } from "./repurpose-panel";
import { Sidebar } from "./sidebar";

export function DashMock() {
	return (
		<motion.div
			animate={{ y: [0, -6, 0] }}
			transition={{
				duration: 6,
				repeat: Infinity,
				ease: "easeInOut",
			}}
			className="relative mx-auto w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_80px_rgba(0,0,0,0.6)]"
		>
			<BrowserHeader />
			<div className="grid h-155 grid-cols-[200px_1fr_280px]">
				<Sidebar />
				<Editor />
				<RepurposePanel />
			</div>
		</motion.div>
	);
}
