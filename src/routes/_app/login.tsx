import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth/auth-client";
import { checkUserExists } from "#/lib/auth/check-user";

export const Route = createFileRoute("/_app/login")({
	loader: () => checkUserExists(),
	component: LoginPage,
});

function LoginPage() {
	const { hasUser } = Route.useLoaderData();

	if (hasUser) return <HasUserComponent />;

	return (
		<>
			<SocialLoginComponent />;
		</>
	);
}

function HasUserComponent() {
	return (
		<div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
			<div className="flex w-85 flex-col items-center gap-6">
				<div
					className="flex h-10 w-10 items-center justify-center rounded-[10px]"
					style={{
						background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
						boxShadow:
							"0 0 0 1px rgba(124,58,237,0.3), 0 8px 24px rgba(124,58,237,0.2)",
					}}
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path
							d="M4 6h8M4 10h12M4 14h9"
							stroke="#fff"
							strokeWidth="1.75"
							strokeLinecap="round"
						/>
					</svg>
				</div>

				<div className="rounded-[10px] border border-[#1f1f1f] bg-[#111111] p-6 text-center">
					<div className="text-sm font-semibold text-[#d4d4d4]">
						Instance already claimed
					</div>
					<p className="mt-2 text-[13px] leading-relaxed text-[#525252]">
						This content.os instance has been set up by its owner. Registration
						and new logins are disabled.
					</p>
				</div>

				<div className="text-[11px] text-[#333]">
					content.os v0.1 — self-hosted
				</div>
			</div>
		</div>
	);
}

function SocialLoginComponent() {
	const handleSocial = (provider: "github" | "google") => {
		authClient.signIn.social({
			provider,
			callbackURL: "/dashboard",
		});
	};

	return (
		<div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
			<div className="flex w-85 flex-col">
				{/* Brand */}
				<div className="mb-10 flex flex-col items-center gap-3">
					<div
						className="flex h-10 w-10 items-center justify-center rounded-[10px]"
						style={{
							background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
							boxShadow:
								"0 0 0 1px rgba(124,58,237,0.3), 0 8px 24px rgba(124,58,237,0.2)",
						}}
					>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path
								d="M4 6h8M4 10h12M4 14h9"
								stroke="#fff"
								strokeWidth="1.75"
								strokeLinecap="round"
							/>
						</svg>
					</div>
					<div className="text-center">
						<div className="text-[17px] font-semibold tracking-[-0.02em] text-[#e5e5e5]">
							content<span className="font-normal text-[#525252]">.os</span>
						</div>
						<div className="mt-1 text-[13px] text-[#525252]">
							Your writing stack. Nothing else.
						</div>
					</div>
				</div>

				{/* Card */}
				<div className="flex flex-col gap-2.5 rounded-[10px] border border-[#1f1f1f] bg-[#111111] p-6">
					<div className="mb-1.5">
						<div className="mb-1 text-sm font-semibold text-[#d4d4d4]">
							Claim this instance
						</div>
						<div className="text-xs text-[#525252]">
							Sign in once to become the owner. No one else can join after.
						</div>
					</div>

					<Button
						size="lg"
						type="button"
						onClick={() => handleSocial("github")}
						className="flex items-center justify-center gap-2   border-[#222] bg-[#141414] text-[13px] font-medium text-[#d4d4d4] transition-colors hover:border-[#333] hover:bg-[#1a1a1a]"
					>
						<IconBrandGithub size={16} />
						Continue with GitHub
					</Button>
					<Button
						size="lg"
						type="button"
						onClick={() => handleSocial("google")}
						className="flex items-center justify-center gap-2 border border-[#222] bg-[#141414] text-[13px] font-medium text-[#d4d4d4] transition-colors hover:border-[#333] hover:bg-[#1a1a1a]"
					>
						<IconBrandGoogle size={16} />
						Continue with Google
					</Button>

					<div className="mt-1 text-center text-[11px] text-[#404040]">
						Single-user · Self-hosted · No subscription
					</div>
				</div>

				<div className="mt-5 text-center text-[11px] text-[#333]">
					content.os v0.1 — built in public
				</div>
			</div>
		</div>
	);
}
