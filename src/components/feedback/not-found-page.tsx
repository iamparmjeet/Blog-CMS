import { Link } from "@tanstack/react-router";
import { Logo } from "../shared/logo";

export function NotFoundPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-app-bg">
			<div className="flex flex-col items-center gap-8">
				<Logo />
				<div className="text-center">
					<div className="font-bold text-[80px] text-text-primary leading-none tracking-[-0.04em]">
						404
					</div>
					<div className="mt-3 font-semibold text-[17px] text-text-primary tracking-[-0.02em]">
						Page not found
					</div>
					<div className="mt-1.5 text-[13px] text-text-muted">
						The page you're looking for doesn't exist or has been moved.
					</div>
					<Link
						to="/"
						className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-[#d4d4d4] text-[13px] transition-colors hover:text-text-primary"
						style={{
							background: "linear-gradient(135deg, #0867f2 0%, #1746c8 100%)",
							boxShadow: "0 0 0 1px rgba(124,58,237,0.3)",
						}}
					>
						← Back to home
					</Link>
				</div>
			</div>
		</div>
	);
}
