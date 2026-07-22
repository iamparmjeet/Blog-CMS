import { useEffect, useState } from "react";

const PLATFORMS = ["Twitter Thread", "LinkedIn Post", "Instagram Caption"];

export function usePlatformRotation() {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setIndex((i) => (i + 1) % PLATFORMS.length);
		}, 2000);

		return () => clearInterval(timer);
	}, []);
	return PLATFORMS[index];
}
