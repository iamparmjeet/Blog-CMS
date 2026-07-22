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
				style={{
					background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
					boxShadow:
						"0 0 0 1px rgba(124,58,237,0.3), 0 8px 24px rgba(124,58,237,0.2)",
				}}
			>
				<svg
					aria-hidden="true"
					width={styles.svg}
					height={styles.svg}
					viewBox="0 0 20 20"
					fill="none"
				>
					<path
						d="M4 6h8M4 10h12M4 14h9"
						stroke="currentColor"
						strokeWidth="1.75"
						strokeLinecap="round"
						className="text-white"
					/>
				</svg>
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
