import { IconChartBar, IconExternalLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState } from "#/components/content-os/ui";
import { buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import type { AnalyticsDisplay } from "../analytics.config";

const EXTERNAL_REL = "noopener noreferrer";

function ExternalDashboardLink({
	className,
	url,
}: {
	className?: string;
	url: string;
}) {
	return (
		<a
			className={cn(buttonVariants({ variant: "outline" }), "gap-2", className)}
			href={url}
			rel={EXTERNAL_REL}
			target="_blank"
		>
			Open Umami dashboard
			<IconExternalLink aria-hidden="true" className="size-3.5" />
		</a>
	);
}

export function AnalyticsPage({ config }: { config: AnalyticsDisplay }) {
	const [embedBlocked, setEmbedBlocked] = useState(false);

	if (config.status === "unconfigured") {
		return (
			<main className="mx-auto flex w-full max-w-[1120px] flex-col px-4 pt-7 pb-16 sm:px-8 sm:pt-10 lg:px-12">
				<header className="flex flex-col gap-5">
					<div>
						<h1 className="font-semibold text-[28px] text-text-primary tracking-[-0.035em] sm:text-[32px]">
							Analytics
						</h1>
						<p className="mt-1.5 text-[13px] text-text-muted">
							Traffic and reading behavior for published posts.
						</p>
					</div>
				</header>

				<div className="mt-8 rounded-lg border border-border bg-flat-surface">
					<EmptyState
						action={
							<Link className={buttonVariants()} to="/settings">
								Open Settings
							</Link>
						}
						description="Paste your Umami share URL in Settings → Publishing → Umami analytics. Until it is configured, no traffic data is shown here or anywhere public."
						icon={<IconChartBar aria-hidden="true" className="size-5" />}
						title="Umami is not connected"
					/>
				</div>
			</main>
		);
	}

	const showEmbed =
		config.mode === "embed" && config.source === "share-url" && !embedBlocked;

	return (
		<main className="mx-auto flex w-full max-w-[1120px] flex-col px-4 pt-7 pb-16 sm:px-8 sm:pt-10 lg:px-12">
			<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-semibold text-[28px] text-text-primary tracking-[-0.035em] sm:text-[32px]">
						Analytics
					</h1>
					<p className="mt-1.5 text-[13px] text-text-muted">
						{showEmbed
							? "Live traffic from your Umami share dashboard."
							: "Your Umami dashboard opens in a new tab."}
					</p>
				</div>

				{showEmbed ? <ExternalDashboardLink url={config.url} /> : null}
			</header>

			{showEmbed ? (
				<section
					aria-label="Umami dashboard"
					className="mt-8 min-h-[560px] flex-1 overflow-hidden rounded-lg border border-border bg-flat-surface"
				>
					<iframe
						className="h-[min(75vh,720px)] w-full border-0"
						onError={() => setEmbedBlocked(true)}
						referrerPolicy="no-referrer"
						src={config.url}
						title="Umami analytics dashboard"
					/>
				</section>
			) : (
				<div className="mt-8 rounded-lg border border-border bg-flat-surface">
					<EmptyState
						action={<ExternalDashboardLink url={config.url} />}
						description={
							config.source === "env"
								? "This instance has UMAMI_URL configured on the server. Open the dashboard in a new tab to review traffic; no credentials are exposed to the browser."
								: "The dashboard could not be embedded on this page (the share URL may block framing). Open it in a new tab instead."
						}
						icon={<IconChartBar aria-hidden="true" className="size-5" />}
						title="Open your Umami dashboard"
					/>
				</div>
			)}
		</main>
	);
}
