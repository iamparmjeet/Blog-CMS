import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";
import { PageOwlLogo } from "./page-owl-logo";

interface LogoProps {
	withTitle?: boolean;
	size?: "sm" | "md" | "lg";
	animated?: boolean;
	loop?: boolean;
	markClassName?: string;
	className?: string;
}

const sizeStyles = {
	sm: {
		root: "gap-2.5",
		icon: "size-8",
		wordmark: "text-base",
	},
	md: {
		root: "gap-3",
		icon: "size-9",
		wordmark: "text-lg",
	},
	lg: {
		root: "gap-2.5 sm:gap-3.5",
		icon: "size-9 sm:size-11",
		wordmark: "text-base sm:text-xl",
	},
} as const;

export function Logo({
	withTitle = true,
	size = "md",
	animated = false,
	loop = false,
	markClassName,
	className,
}: LogoProps) {
	const styles = sizeStyles[size];

	return (
		<Link
			to="/"
			aria-label={withTitle ? undefined : "PageOwl home"}
			className={cn("flex w-fit items-center", styles.root, className)}
		>
			{withTitle ? (
				<>
					<PageOwlLogo
						animated={animated}
						aria-hidden="true"
						className={cn("shrink-0", styles.icon, markClassName)}
						loop={loop}
						showWordmark={false}
					/>
					<span
						className={cn(
							"font-bold text-foreground tracking-[-0.055em]",
							styles.wordmark,
						)}
					>
						Page<span className="text-brand">Owl</span>
					</span>
				</>
			) : (
				<PageOwlLogo
					animated={animated}
					aria-hidden="true"
					className={cn("shrink-0", styles.icon, markClassName)}
					loop={loop}
					showWordmark={false}
				/>
			)}
		</Link>
	);
}
