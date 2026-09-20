import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";

interface LogoProps {
	withTitle?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const sizeStyles = {
	sm: {
		root: "gap-2",
		icon: "size-8 rounded-lg",
		svg: 16,
		title: "text-xs",
	},
	md: {
		root: "gap-3",
		icon: "size-10 rounded-[10px]",
		svg: 20,
		title: "text-sm",
	},
	lg: {
		root: "gap-3",
		icon: "size-12 rounded-xl",
		svg: 24,
		title: "text-base",
	},
} as const;

export function Logo({ withTitle = true, size = "md", className }: LogoProps) {
	const styles = sizeStyles[size];

	return (
		<Link
			to="/"
			aria-label={withTitle ? undefined : "ContentOS home"}
			className={cn("flex w-fit items-center", styles.root, className)}
		>
			<div
				className={cn("flex shrink-0 items-center justify-center", styles.icon)}
			>
				<img
					alt=""
					aria-hidden="true"
					className="size-full"
					height={styles.svg}
					src="/favicon.svg"
					width={styles.svg}
				/>
			</div>

			{withTitle && (
				<span className={cn("font-semibold tracking-tight", styles.title)}>
					content
					<span className="text-muted-foreground">.OS</span>
				</span>
			)}
		</Link>
	);
}
