import { motion, type Transition, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface AnimateOnScrollProps {
	children: ReactNode;
	delay?: number;
	className?: string;
}

export function AnimateOnScroll({
	children,
	delay = 0,
	className,
}: AnimateOnScrollProps) {
	const shouldReduceMotion = useReducedMotion();

	const transition: Transition = {
		duration: 0.7,
		delay: delay / 1000,
		ease: [0.16, 1, 0.3, 1],
	};

	return (
		<motion.div
			className={className}
			initial={
				shouldReduceMotion
					? { opacity: 1 }
					: { opacity: 0, y: 16, filter: "blur(2px)" }
			}
			whileInView={{
				opacity: 1,
				y: 0,
				filter: "blur(0px)",
			}}
			viewport={{
				once: true,
				amount: 0.12,
			}}
			transition={transition}
		>
			{children}
		</motion.div>
	);
}
