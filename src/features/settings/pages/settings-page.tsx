import { useState } from "react";
import { UserAvatar } from "#/components/content-os/ui";
import { Button } from "#/components/ui/button";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import {
	AccentPicker,
	EndpointRow,
	IntegrationRow,
	SettingsInput,
	SettingsSection,
	SettingsTextarea,
	SettingsToggleRow,
} from "../components/settings-widgets";
import {
	DEFAULT_SETTINGS,
	MODEL_OPTIONS,
	type SettingsForm,
} from "../settings.types";

export function SettingsPage({ user }: { user: AuthenticatedUser }) {
	const [form, setForm] = useState<SettingsForm>(() => ({
		...DEFAULT_SETTINGS,
		displayName: user.name,
	}));

	function update<TKey extends keyof SettingsForm>(
		key: TKey,
		value: SettingsForm[TKey],
	) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	const feedBase = form.domain
		? `https://${form.domain.replace(/^https?:\/\//, "")}`
		: "https://your-domain.com";

	return (
		<main className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-border border-b px-8 py-3.5">
				<h1 className="font-semibold text-[15px] text-text-primary tracking-[-0.01em]">
					Settings
				</h1>

				<div className="flex items-center gap-3">
					<span className="text-[11px] text-text-muted">
						Not saved — settings storage is not connected yet
					</span>
					<Button disabled size="sm" type="button">
						Save changes
					</Button>
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
				<div className="mx-auto flex max-w-[560px] flex-col gap-10">
					<SettingsSection title="Account">
						<div className="flex items-center gap-3">
							<UserAvatar
								className="size-12"
								image={user.image}
								name={form.displayName || user.name}
							/>
							<Button disabled size="sm" type="button" variant="outline">
								Change avatar
							</Button>
						</div>

						<SettingsInput
							label="Display name"
							onChange={(event) => update("displayName", event.target.value)}
							value={form.displayName}
						/>
						<SettingsInput
							description="Your sign-in address from the connected OAuth account."
							label="Email"
							readOnly
							value={user.email}
						/>
					</SettingsSection>

					<SettingsSection
						description="Used for charts, highlights, and the publish switch."
						title="Appearance"
					>
						<AccentPicker
							onChange={(value) => update("accentColor", value)}
							value={form.accentColor}
						/>
					</SettingsSection>

					<SettingsSection
						description="Used for generation and repurposing once AI is connected."
						title="AI model"
					>
						<label className="flex flex-col gap-1.5">
							<span className="font-medium text-text-secondary text-xs">
								Default model
							</span>
							<select
								className="rounded-md border border-border bg-app-bg px-3 py-1.5 text-[13px] text-text-body outline-none transition-colors focus:border-text-dim"
								onChange={(event) => update("defaultModel", event.target.value)}
								value={form.defaultModel}
							>
								{MODEL_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
					</SettingsSection>

					<SettingsSection title="Writing style">
						<SettingsTextarea
							description="Describe the voice the AI should match."
							label="Style guide"
							onChange={(event) => update("writingStyle", event.target.value)}
							placeholder="Direct, conversational, no filler."
							value={form.writingStyle}
						/>
						<SettingsTextarea
							description="Paste a sample you want future drafts to emulate."
							label="Sample"
							onChange={(event) => update("writingSample", event.target.value)}
							placeholder="A paragraph you are happy with."
							value={form.writingSample}
						/>
					</SettingsSection>

					<SettingsSection title="Site">
						<SettingsInput
							label="Blog title"
							onChange={(event) => update("blogTitle", event.target.value)}
							value={form.blogTitle}
						/>
						<SettingsInput
							description="Your public-facing URL. Used in the feed and preview."
							label="Domain"
							mono
							onChange={(event) => update("domain", event.target.value)}
							placeholder="your-domain.com"
							value={form.domain}
						/>
						<SettingsTextarea
							description="Used in meta tags and the RSS feed description."
							label="Bio"
							onChange={(event) => update("bio", event.target.value)}
							placeholder="What this blog is about."
							value={form.bio}
						/>
					</SettingsSection>

					<SettingsSection
						description="CORS-gated endpoints that expose published posts only."
						title="Public JSON feed"
					>
						<SettingsTextarea
							description="One origin per line. Other origins receive no publishable content."
							label="Allowed origins"
							onChange={(event) => update("allowedOrigins", event.target.value)}
							placeholder={"https://your-site.com\nhttps://another-site.com"}
							value={form.allowedOrigins}
						/>
						<div className="flex flex-col gap-2">
							<EndpointRow label="Collection" url={`${feedBase}/api/posts`} />
							<EndpointRow
								label="Single post"
								url={`${feedBase}/api/posts/:slug`}
							/>
						</div>
					</SettingsSection>

					<SettingsSection title="Publishing">
						<SettingsToggleRow
							checked={form.seoMeta}
							description="Generate og:title and og:description from post content."
							label="SEO meta tags"
							onChange={(checked) => update("seoMeta", checked)}
						/>
						<SettingsToggleRow
							checked={form.rssFeed}
							description="Expose /feed.xml for readers and aggregators."
							label="RSS feed"
							onChange={(checked) => update("rssFeed", checked)}
						/>
						<SettingsToggleRow
							checked={form.readingTime}
							description="Show the estimated read time on published posts."
							label="Reading time"
							onChange={(checked) => update("readingTime", checked)}
						/>
					</SettingsSection>

					<SettingsSection title="Integrations">
						<IntegrationRow
							description={`OAuth sign-in · ${user.email}`}
							name="GitHub"
							tone="connected"
						/>
						<IntegrationRow
							description={`OAuth sign-in · ${user.email}`}
							name="Google"
							tone="connected"
						/>
						<IntegrationRow
							description="Import posts from a Notion database."
							name="Notion"
							tone="disconnected"
						/>
					</SettingsSection>

					<SettingsSection
						description="Paste a public share URL to power the analytics page."
						title="Umami analytics"
					>
						<SettingsInput
							label="Share URL"
							mono
							onChange={(event) => update("umamiShareUrl", event.target.value)}
							placeholder="https://umami.example.com/share/…"
							value={form.umamiShareUrl}
						/>
					</SettingsSection>

					<SettingsSection
						description="Cloudflare R2 bucket used for media uploads."
						title="Storage"
					>
						<IntegrationRow
							description="Binding declared · uploads are not connected yet"
							name="Cloudflare R2"
							tone="disconnected"
						/>
						<SettingsInput
							label="Bucket name"
							mono
							onChange={(event) => update("bucket", event.target.value)}
							value={form.bucket}
						/>
						<SettingsInput
							label="Public URL"
							mono
							onChange={(event) => update("publicUrl", event.target.value)}
							placeholder="https://media.your-domain.com"
							value={form.publicUrl}
						/>
						<SettingsInput
							label="Account ID"
							mono
							onChange={(event) => update("accountId", event.target.value)}
							placeholder="a1b2c3d4e5f6…"
							value={form.accountId}
						/>
					</SettingsSection>

					<SettingsSection title="Danger zone">
						<div className="flex flex-col gap-3 rounded-md border border-danger/20 bg-danger/[0.03] p-3">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="font-medium text-[13px] text-text-body">
										Export all data
									</p>
									<p className="mt-0.5 text-[11px] text-text-muted">
										Download all posts as a Markdown archive.
									</p>
								</div>
								<Button disabled size="sm" type="button" variant="outline">
									Export .md
								</Button>
							</div>

							<div className="flex items-center justify-between gap-4 border-danger/10 border-t pt-3">
								<div>
									<p className="font-medium text-[13px] text-danger">
										Delete account
									</p>
									<p className="mt-0.5 text-[11px] text-text-muted">
										Permanently delete all posts and data.
									</p>
								</div>
								<Button disabled size="sm" type="button" variant="destructive">
									Delete
								</Button>
							</div>
						</div>
					</SettingsSection>
				</div>
			</div>
		</main>
	);
}
