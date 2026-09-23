import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Logo } from "#/components/shared/logo";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth/auth-client";
import { checkUserExists } from "#/lib/auth/check-user";

export const Route = createFileRoute("/_app/login")({
	validateSearch: (search: Record<string, unknown>) => ({
		...(search.error === "instance-claimed"
			? { error: "instance-claimed" as const }
			: {}),
		...(typeof search.redirect === "string"
			? { redirect: search.redirect }
			: {}),
	}),
	loader: async () => {
		const data = await checkUserExists();

		// Owner already signed in  - login has nothing left to do
		if (data.user) {
			throw redirect({ to: "/dashboard", replace: true });
		}
		return data;
	},
	component: LoginPage,
});

function LoginPage() {
	const { hasUser } = Route.useLoaderData();
	const { error } = Route.useSearch();

	if (hasUser)
		return (
			<OwnerReturnComponent instanceClaimed={error === "instance-claimed"} />
		);

	return <FirstClaimComponent />;
}

function OwnerReturnComponent({
	instanceClaimed,
}: {
	instanceClaimed: boolean;
}) {
	return (
		<div className="flex h-screen items-center justify-center bg-app-bg">
			<div className="flex w-85 flex-col">
				<BrandHeader />
				<div className="flex flex-col gap-2.5 rounded-[10px] border border-border bg-card p-6">
					<div className="mb-1.5">
						<div className="mb-1 font-semibold text-sm text-text-body">
							{instanceClaimed
								? "This account isn't the owner"
								: "Welcome back"}
						</div>
						<div className="text-text-muted text-xs">
							{instanceClaimed
								? "Sign in with the owner account to continue."
								: "Sign in with your owner account to manage this instance."}
						</div>
					</div>

					<SocialButtons useDifferentAccount={instanceClaimed} />

					<div className="mt-1 text-center text-[11px] text-text-dim">
						Single-user · Self-hosted · No subscription
					</div>
				</div>

				<div className="mt-5 text-center text-[11px] text-text-ghost">
					PageOwl · self-hosted
				</div>

				<DemoLink />
			</div>
		</div>
	);
}

function FirstClaimComponent() {
	return (
		<div className="flex h-screen items-center justify-center bg-app-bg">
			<div className="flex w-85 flex-col">
				<BrandHeader />

				{/* Card */}
				<div className="flex flex-col gap-2.5 rounded-[10px] border border-border bg-card p-6">
					<div className="mb-1.5">
						<div className="mb-1 font-semibold text-sm text-text-body">
							Claim this instance
						</div>
						<div className="text-text-muted text-xs">
							Sign in once to become the owner. No one else can join after.
						</div>
					</div>

					<SocialButtons />

					<div className="mt-1 text-center text-[11px] text-text-dim">
						Single-user · Self-hosted · No subscription
					</div>
				</div>

				<div className="mt-5 text-center text-[11px] text-text-ghost">
					PageOwl · built in public
				</div>

				<DemoLink />
			</div>
		</div>
	);
}

function DemoLink() {
	return (
		<div className="mt-4 text-center text-[11px]">
			<span className="text-text-ghost">Just looking? </span>
			<Link
				className="text-text-dim underline-offset-4 transition-colors hover:text-text-body hover:underline"
				to="/demo"
			>
				Explore the live demo
			</Link>
		</div>
	);
}

function BrandHeader() {
	return (
		<div className="mb-10 flex flex-col items-center gap-3">
			<Logo animated size="lg" />
			<div className="text-center">
				<div className="mt-1 text-[13px] text-text-muted">
					Your writing stack. Nothing else.
				</div>
			</div>
		</div>
	);
}

function SocialButtons({ useDifferentAccount = false }) {
	const handleSocial = (provider: "github" | "google") => {
		authClient.signIn.social({
			provider,
			callbackURL: "/dashboard",
		});
	};

	return (
		<>
			<Button
				size="lg"
				type="button"
				onClick={() => handleSocial("github")}
				className="flex items-center justify-center gap-2 border border-border bg-secondary font-medium text-[13px] text-text-body transition-colors hover:border-text-dim hover:bg-muted"
			>
				<IconBrandGithub size={16} />
				{useDifferentAccount ? "Use GitHub instead" : "Continue with GitHub"}
			</Button>
			<Button
				size="lg"
				type="button"
				onClick={() => handleSocial("google")}
				className="flex items-center justify-center gap-2 border border-border bg-secondary font-medium text-[13px] text-text-body transition-colors hover:border-text-dim hover:bg-muted"
			>
				<IconBrandGoogle size={16} />
				{useDifferentAccount ? "Use Google instead" : "Continue with Google"}
			</Button>
		</>
	);
}
