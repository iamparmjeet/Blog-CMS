import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "#/components/content-os/ui";
import { Button } from "#/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	AccentPicker,
	EndpointRow,
	IntegrationRow,
	SettingsInput,
	SettingsSection,
	SettingsTextarea,
	SettingsToggleRow,
	SurfaceTintPicker,
	ThemeModeControl,
} from "#/features/settings/components/settings-widgets";
import {
	type AppearanceSettings,
	DEFAULT_SETTINGS,
	MODEL_OPTIONS,
	type SettingsForm,
} from "#/features/settings/settings.types";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { cn } from "#/lib/utils";

export type DemoSettingsTab =
	| "appearance"
	| "account"
	| "site"
	| "publishing"
	| "storage";

type SectionKey = "account" | "appearance" | "feed" | "publishing" | "site";

const DEMO_FORM: SettingsForm = {
	...DEFAULT_SETTINGS,
	allowedOrigins: "https://your-site.com\nhttps://another-site.com",
	bio: "Notes on writing, tools, and building in public.",
	blogTitle: "PageOwl Demo",
	displayName: "Demo Writer",
	domain: "your-domain.com",
	readingTime: true,
	timeZone: "Asia/Kolkata",
	writingSample:
		"Publishing once and syndicating everywhere is how a small audience compounds.",
	writingStyle: "Direct, conversational, no filler.",
};

const DEMO_STORAGE = {
	accountId: "a1b2c3d4e5f6…",
	bucketName: "contentos",
	publicUrl: "https://media.your-domain.com",
};

interface DemoSettingsProps {
	appearance: AppearanceSettings;
	onAppearanceChange: (appearance: AppearanceSettings) => void;
	onTabChange: (tab: DemoSettingsTab) => void;
	tab: DemoSettingsTab;
	user: AuthenticatedUser;
}

export function DemoSettings({
	appearance,
	onAppearanceChange,
	onTabChange,
	tab,
	user,
}: DemoSettingsProps) {
	const [form, setForm] = useState<SettingsForm>(DEMO_FORM);
	const [dirty, setDirty] = useState<Record<SectionKey, boolean>>({
		account: false,
		appearance: false,
		feed: false,
		publishing: false,
		site: false,
	});

	function update<Key extends keyof SettingsForm>(
		section: SectionKey,
		key: Key,
		value: SettingsForm[Key],
	) {
		setForm((previous) => ({ ...previous, [key]: value }));
		setDirty((previous) => ({ ...previous, [section]: true }));
	}

	function clearDirty(section: SectionKey) {
		setDirty((previous) => ({ ...previous, [section]: false }));
	}

	return (
		<main className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 items-center justify-between gap-3 border-border border-b px-5 py-4 sm:px-8">
				<div>
					<h1 className="font-semibold text-base text-text-primary tracking-[-0.02em]">
						Settings
					</h1>
					<p className="mt-0.5 text-[11px] text-text-muted">
						Demo values. Nothing is saved.
					</p>
				</div>
			</header>

			<Tabs
				className="flex min-h-0 flex-1 flex-col gap-0"
				onValueChange={(value) => onTabChange(value as DemoSettingsTab)}
				value={tab}
			>
				<div className="shrink-0 overflow-x-auto border-border border-b px-5 sm:px-8">
					<TabsList
						className="h-auto w-full justify-start gap-4 rounded-none border-0 bg-transparent p-0"
						variant="line"
					>
						<TabsTrigger value="appearance">Appearance</TabsTrigger>
						<TabsTrigger value="account">Account</TabsTrigger>
						<TabsTrigger value="site">Site</TabsTrigger>
						<TabsTrigger value="publishing">Publishing</TabsTrigger>
						<TabsTrigger value="storage">Storage</TabsTrigger>
					</TabsList>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
					<TabsContent className="flex flex-col gap-10" value="appearance">
						<div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
							<SettingsSection
								description="Theme, accent, and surface tint apply to this sandbox live."
								title="Appearance"
							>
								<ThemeModeControl
									onChange={(value) => {
										onAppearanceChange({ ...appearance, themeMode: value });
										setDirty((previous) => ({
											...previous,
											appearance: true,
										}));
									}}
									value={appearance.themeMode}
								/>
								<AccentPicker
									onChange={(value) => {
										onAppearanceChange({ ...appearance, accentColor: value });
										setDirty((previous) => ({
											...previous,
											appearance: true,
										}));
									}}
									value={appearance.accentColor}
								/>
								<SurfaceTintPicker
									onChange={(value) => {
										onAppearanceChange({ ...appearance, surfaceTint: value });
										setDirty((previous) => ({
											...previous,
											appearance: true,
										}));
									}}
									value={appearance.surfaceTint}
								/>
								<DemoSaveRow
									dirty={dirty.appearance}
									hint="Applies live in the demo"
									onSave={() => clearDirty("appearance")}
								/>
							</SettingsSection>
						</div>
					</TabsContent>

					<TabsContent className="flex flex-col gap-10" value="account">
						<div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
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
									onChange={(event) =>
										update("account", "displayName", event.target.value)
									}
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
								description="Used for generation and repurposing once AI is connected."
								title="AI model"
							>
								<label className="flex flex-col gap-1.5">
									<span className="font-medium text-text-secondary text-xs">
										Default model
									</span>
									<select
										className="rounded-md border border-border bg-app-bg px-3 py-1.5 text-[13px] text-text-body outline-none transition-colors focus:border-text-dim"
										onChange={(event) =>
											update("account", "defaultModel", event.target.value)
										}
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
									onChange={(event) =>
										update("account", "writingStyle", event.target.value)
									}
									placeholder="Direct, conversational, no filler."
									value={form.writingStyle}
								/>
								<SettingsTextarea
									description="Paste a sample you want future drafts to emulate."
									label="Sample"
									onChange={(event) =>
										update("account", "writingSample", event.target.value)
									}
									placeholder="A paragraph you are happy with."
									value={form.writingSample}
								/>
								<DemoSaveRow
									dirty={dirty.account}
									hint="Demo values are local only"
									onSave={() => clearDirty("account")}
								/>
							</SettingsSection>
						</div>
					</TabsContent>

					<TabsContent className="flex flex-col gap-10" value="site">
						<div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
							<SettingsSection title="Site">
								<SettingsInput
									label="Blog title"
									onChange={(event) =>
										update("site", "blogTitle", event.target.value)
									}
									value={form.blogTitle}
								/>
								<SettingsInput
									description="Your public-facing URL. Used in the feed and preview."
									label="Domain"
									mono
									onChange={(event) =>
										update("site", "domain", event.target.value)
									}
									placeholder="your-domain.com"
									value={form.domain}
								/>
								<SettingsTextarea
									description="Used in meta tags and the RSS feed description."
									label="Bio"
									onChange={(event) =>
										update("site", "bio", event.target.value)
									}
									placeholder="What this blog is about."
									value={form.bio}
								/>
								<DemoSaveRow
									dirty={dirty.site}
									hint="Demo values are local only"
									onSave={() => clearDirty("site")}
								/>
							</SettingsSection>

							<SettingsSection
								description="CORS-gated endpoints that expose published posts only."
								title="Public JSON feed"
							>
								<SettingsTextarea
									description="One origin per line. Other origins receive no publishable content."
									label="Allowed origins"
									onChange={(event) =>
										update("feed", "allowedOrigins", event.target.value)
									}
									placeholder={
										"https://your-site.com\nhttps://another-site.com"
									}
									value={form.allowedOrigins}
								/>
								<DemoSaveRow
									dirty={dirty.feed}
									hint="Allowlist drives CORS for /api/posts"
									onSave={() => clearDirty("feed")}
								/>
								<div className="flex flex-col gap-2">
									<EndpointRow
										label="Collection"
										url={`https://${form.domain}/api/posts`}
									/>
									<EndpointRow
										label="Single post"
										url={`https://${form.domain}/api/posts/:slug`}
									/>
								</div>
							</SettingsSection>
						</div>
					</TabsContent>

					<TabsContent className="flex flex-col gap-10" value="publishing">
						<div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
							<SettingsSection
								description="Time zone used for writing activity and future scheduling."
								title="Publishing preferences"
							>
								<SettingsInput
									description="IANA time zone, for example Asia/Kolkata."
									label="Time zone"
									mono
									onChange={(event) =>
										update("publishing", "timeZone", event.target.value)
									}
									placeholder="Asia/Kolkata"
									value={form.timeZone}
								/>
							</SettingsSection>

							<SettingsSection title="Publishing">
								<SettingsToggleRow
									checked={form.seoMeta}
									description="Generate og:title and og:description from post content."
									label="SEO meta tags"
									onChange={(checked) =>
										update("publishing", "seoMeta", checked)
									}
								/>
								<SettingsToggleRow
									checked={form.rssFeed}
									description="Expose /rss for readers and aggregators."
									label="RSS feed"
									onChange={(checked) =>
										update("publishing", "rssFeed", checked)
									}
								/>
								<SettingsToggleRow
									checked={form.readingTime}
									description="Show the estimated read time on published posts."
									label="Reading time"
									onChange={(checked) =>
										update("publishing", "readingTime", checked)
									}
								/>
								<DemoSaveRow
									dirty={dirty.publishing}
									hint="Demo values are local only"
									onSave={() => clearDirty("publishing")}
								/>
							</SettingsSection>

							<SettingsSection
								description="Paste a public share URL to power the analytics page."
								title="Umami analytics"
							>
								<SettingsInput
									label="Share URL"
									mono
									onChange={(event) =>
										update("publishing", "umamiShareUrl", event.target.value)
									}
									placeholder="https://umami.example.com/share/…"
									value={form.umamiShareUrl}
								/>
								<DemoSaveRow
									dirty={dirty.publishing}
									hint="Demo values are local only"
									onSave={() => clearDirty("publishing")}
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
						</div>
					</TabsContent>

					<TabsContent className="flex flex-col gap-10" value="storage">
						<div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
							<SettingsSection
								description="Cloudflare R2 bucket used for media uploads. Read-only — configured via environment variables."
								title="Storage"
							>
								<IntegrationRow
									description="Binding and credentials configured · direct uploads enabled"
									name="Cloudflare R2"
									tone="connected"
								/>
								<SettingsInput
									label="Bucket name"
									mono
									readOnly
									value={DEMO_STORAGE.bucketName}
								/>
								<SettingsInput
									label="Public URL"
									mono
									readOnly
									value={DEMO_STORAGE.publicUrl}
								/>
								<SettingsInput
									label="Account ID"
									mono
									readOnly
									value={DEMO_STORAGE.accountId}
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
												Download posts, settings, media files, and activity as a
												JSON backup.
											</p>
										</div>
										<Button disabled size="sm" type="button" variant="outline">
											Download backup
										</Button>
									</div>

									<div className="flex items-center justify-between gap-4 border-danger/10 border-t pt-3">
										<div>
											<p className="font-medium text-[13px] text-text-body">
												Restore from backup
											</p>
											<p className="mt-0.5 text-[11px] text-text-muted">
												Merge or replace data from a version-1 export.
											</p>
										</div>
										<Button disabled size="sm" type="button" variant="outline">
											Choose file
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
										<Button
											disabled
											size="sm"
											type="button"
											variant="destructive"
										>
											Delete
										</Button>
									</div>
								</div>
							</SettingsSection>
						</div>
					</TabsContent>
				</div>
			</Tabs>
		</main>
	);
}

function DemoSaveRow({
	dirty,
	hint,
	onSave,
}: {
	dirty: boolean;
	hint: string;
	onSave: () => void;
}) {
	const [state, setState] = useState<"idle" | "saved" | "saving">("idle");
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		if (dirty) {
			setState("idle");
		}
	}, [dirty]);

	useEffect(
		() => () => {
			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
			}
		},
		[],
	);

	function handleSave() {
		setState("saving");
		onSave();
		timerRef.current = window.setTimeout(() => setState("saved"), 500);
	}

	const label =
		state === "saving"
			? "Saving…"
			: state === "saved" && !dirty
				? "Saved"
				: dirty
					? "Unsaved changes"
					: hint;

	return (
		<div className="flex items-center justify-end gap-3">
			<span
				aria-live="polite"
				className={cn(
					"text-[11px]",
					state === "saved" && !dirty ? "text-success" : "text-text-muted",
				)}
			>
				{label}
			</span>
			<Button
				disabled={!dirty || state === "saving"}
				onClick={handleSave}
				size="sm"
				type="button"
			>
				{state === "saving" ? "Saving…" : "Save"}
			</Button>
		</div>
	);
}
