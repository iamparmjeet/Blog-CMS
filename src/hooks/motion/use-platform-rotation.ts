import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const PLATFORMS = ["Twitter Thread", "LinkedIn Post", "Instagram Caption"];

export function usePlatformRotation() {
	const shouldReduceMotion = useReducedMotion();
	const [index, setIndex] = useState(0);

	useEffect(() => {
		if (shouldReduceMotion) return;

		const timer = setInterval(() => {
			setIndex((i) => (i + 1) % PLATFORMS.length);
		}, 2000);

		return () => clearInterval(timer);
	}, [shouldReduceMotion]);

	return PLATFORMS[index];
}
