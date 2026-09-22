import { useEffect, useState } from "react";
import { UserAvatar } from "#/components/content-os/ui";
import { Button, buttonVariants } from "#/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { cn } from "#/lib/utils";
import { setAppearance } from "../appearance";
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
} from "../components/settings-widgets";
import {
	getFeedSettings,
	getOwnerSettings,
	getStorageSettings,
	saveAccountSettings,
	saveAppearanceSettings,
	saveFeedSettings,
	saveIdentitySettings,
	savePublishingSettings,
} from "../functions/settings.function";
import {
	type AppearanceSettings,
	DEFAULT_SETTINGS,
	DEFAULT_STORAGE,
	MODEL_OPTIONS,
	type SettingsForm,
	type StorageSettings,
} from "../settings.types";

type SaveState = "idle" | "saving" | "saved" | "error";

interface SettingsPageProps {
	appearance: AppearanceSettings;
	user: AuthenticatedUser;
}

export function SettingsPage({ appearance, user }: SettingsPageProps) {
	const [form, setForm] = useState<SettingsForm>(() => ({
		...DEFAULT_SETTINGS,
		displayName: user.name,
		accentColor: appearance.accentColor,
		themeMode: appearance.themeMode,
		surfaceTint: appearance.surfaceTint,
	}));
	const [storage, setStorage] = useState<StorageSettings>(DEFAULT_STORAGE);
	const [isLoaded, setIsLoaded] = useState(false);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [identitySaveState, setIdentitySaveState] = useState<SaveState>("idle");
	const [accountSaveState, setAccountSaveState] = useState<SaveState>("idle");
	const [publishingSaveState, setPublishingSaveState] =
		useState<SaveState>("idle");
	const [isAppearanceDirty, setIsAppearanceDirty] = useState(false);
	const [isFeedDirty, setIsFeedDirty] = useState(false);
	const [feedSaveState, setFeedSaveState] = useState<SaveState>("idle");
	const [isIdentityDirty, setIsIdentityDirty] = useState(false);
	const [isAccountDirty, setIsAccountDirty] = useState(false);
	const [isPublishingDirty, setIsPublishingDirty] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const [profile, storageInfo, feedSettings] = await Promise.all([
					getOwnerSettings(),
					getStorageSettings(),
					getFeedSettings(),
				]);
				if (cancelled) {
					return;
				}
				setStorage(storageInfo);
				setForm((current) => ({
					...current,
					displayName: profile.displayName || current.displayName,
					blogTitle: profile.blogTitle,
					domain: profile.domain,
					bio: profile.bio,
					timeZone: profile.timeZone,
					defaultModel: profile.defaultModel,
					writingStyle: profile.writingStyle,
					writingSample: profile.writingSample,
					umamiShareUrl: profile.umamiShareUrl,
					seoMeta: profile.seoMeta,
					rssFeed: profile.rssFeed,
					readingTime: profile.readingTime,
					allowedOrigins: feedSettings.allowedOrigins,
				}));
				setIsLoaded(true);
			} catch {
				if (!cancelled) {
					setIsLoaded(true);
					setIdentitySaveState("error");
				}
			}
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	function update<TKey extends keyof SettingsForm>(
		key: TKey,
		value: SettingsForm[TKey],
	) {
		setForm((current) => ({ ...current, [key]: value }));

		if (key === "allowedOrigins") {
			setIsFeedDirty(true);
			setFeedSaveState("idle");
		}
	}

	function updateIdentity<TKey extends keyof SettingsForm>(
		key: TKey,
		value: SettingsForm[TKey],
	) {
		update(key, value);
		setIsIdentityDirty(true);
		setIdentitySaveState("idle");
	}

	function updateAccount<TKey extends keyof SettingsForm>(
		key: TKey,
		value: SettingsForm[TKey],
	) {
		update(key, value);
		setIsAccountDirty(true);
		setAccountSaveState("idle");
	}

	function updatePublishing<TKey extends keyof SettingsForm>(
		key: TKey,
		value: SettingsForm[TKey],
	) {
		update(key, value);
		setIsPublishingDirty(true);
		setPublishingSaveState("idle");
	}

	function updateAppearance<TKey extends keyof AppearanceSettings>(
		key: TKey,
		value: AppearanceSettings[TKey],
	) {
		setForm((current) => {
			const next = { ...current, [key]: value };
			setAppearance({
				accentColor: next.accentColor,
				surfaceTint: next.surfaceTint,
				themeMode: next.themeMode,
			});
			return next;
		});
		setIsAppearanceDirty(true);
		setSaveState("idle");
	}

	async function saveAppearance() {
		setSaveState("saving");
		try {
			await saveAppearanceSettings({
				data: {
					accentColor: form.accentColor,
					surfaceTint: form.surfaceTint,
					themeMode: form.themeMode,
				},
			});
			setIsAppearanceDirty(false);
			setSaveState("saved");
		} catch {
			setSaveState("error");
		}
	}

	async function saveFeed() {
		setFeedSaveState("saving");
		try {
			await saveFeedSettings({
				data: { allowedOrigins: form.allowedOrigins },
			});
			setIsFeedDirty(false);
			setFeedSaveState("saved");
		} catch {
			setFeedSaveState("error");
		}
	}

	async function saveIdentity() {
		setIdentitySaveState("saving");
		try {
			await saveIdentitySettings({
				data: {
					blogTitle: form.blogTitle,
					domain: form.domain,
					bio: form.bio,
				},
			});
			setIsIdentityDirty(false);
			setIdentitySaveState("saved");
		} catch {
			setIdentitySaveState("error");
		}
	}

	async function saveAccount() {
		setAccountSaveState("saving");
		try {
			await saveAccountSettings({
				data: {
					displayName: form.displayName,
					defaultModel: form.defaultModel,
					writingStyle: form.writingStyle,
					writingSample: form.writingSample,
				},
			});
			setIsAccountDirty(false);
			setAccountSaveState("saved");
		} catch {
			setAccountSaveState("error");
		}
	}

	async function savePublishing() {
		setPublishingSaveState("saving");
		try {
			await savePublishingSettings({
				data: {
					timeZone: form.timeZone,
					umamiShareUrl: form.umamiShareUrl,
					seoMeta: form.seoMeta,
					rssFeed: form.rssFeed,
					readingTime: form.readingTime,
				},
			});
			setIsPublishingDirty(false);
			setPublishingSaveState("saved");
		} catch {
			setPublishingSaveState("error");
		}
	}

	const feedBase = form.domain
		? `https://${form.domain.replace(/^https?:\/\//, "")}`
		: "https://your-domain.com";

	const statusLabel =
		saveState === "saving"
			? "Saving appearance…"
			: saveState === "saved"
				? "Appearance saved"
				: saveState === "error"
					? "Couldn't save appearance"
					: isAppearanceDirty
						? "Unsaved appearance changes"
						: !isLoaded
							? "Loading settings…"
							: "All changes saved";

	function sectionStatus(state: SaveState, dirty: boolean): string {
		return state === "saving"
			? "Saving…"
			: state === "saved"
				? "Saved"
				: state === "error"
					? "Couldn't save"
					: dirty
						? "Unsaved changes"
						: "";
	}

	function statusTone(state: SaveState): string {
		return state === "error"
			? "text-danger"
			: state === "saved"
				? "text-success"
				: "text-text-muted";
	}

	function SaveRow({
		dirty,
		disabled,
		onClick,
		state,
	}: {
		dirty: boolean;
		disabled?: boolean;
		onClick: () => void;
		state: SaveState;
	}) {
		return (
			<div className="flex items-center justify-end gap-3">
				<span
					aria-live="polite"
					className={cn("text-[11px]", statusTone(state))}
				>
					{sectionStatus(state, dirty)}
				</span>
				<Button
					disabled={!dirty || state === "saving" || disabled}
					onClick={onClick}
					size="sm"
					type="button"
				>
					{state === "saving" ? "Saving…" : "Save"}
				</Button>
			</div>
		);
	}

	return (
		<main className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-border border-b px-5 py-4 sm:flex-row sm:items-center sm:px-8">
				<h1 className="font-semibold text-base text-text-primary tracking-[-0.02em]">
					Settings
				</h1>

				<div className="flex items-center gap-3">
					<span
						aria-live="polite"
						className={cn(
							"text-[11px]",
							saveState === "error"
								? "text-danger"
								: saveState === "saved"
									? "text-success"
									: "text-text-muted",
						)}
					>
						{statusLabel}
					</span>
					<Button
						disabled={!isAppearanceDirty || saveState === "saving"}
						onClick={() => void saveAppearance()}
						size="sm"
						type="button"
					>
						{saveState === "saving" ? "Saving…" : "Save changes"}
					</Button>
				</div>
			</header>

			<Tabs
				className="flex min-h-0 flex-1 flex-col gap-0"
				defaultValue="appearance"
			>
				<div className="shrink-0 border-border border-b px-5 sm:px-8">
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
								description="Theme, accent, and surface tint apply live and save with the button above."
								title="Appearance"
							>
								<ThemeModeControl
									onChange={(value) => updateAppearance("themeMode", value)}
									value={form.themeMode}
								/>
								<AccentPicker
									onChange={(value) => updateAppearance("accentColor", value)}
									value={form.accentColor}
								/>
								<SurfaceTintPicker
									onChange={(value) => updateAppearance("surfaceTint", value)}
									value={form.surfaceTint}
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
										updateAccount("displayName", event.target.value)
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
											updateAccount("defaultModel", event.target.value)
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
										updateAccount("writingStyle", event.target.value)
									}
									placeholder="Direct, conversational, no filler."
									value={form.writingStyle}
								/>
								<SettingsTextarea
									description="Paste a sample you want future drafts to emulate."
									label="Sample"
									onChange={(event) =>
										updateAccount("writingSample", event.target.value)
									}
									placeholder="A paragraph you are happy with."
									value={form.writingSample}
								/>
								<SaveRow
									dirty={isAccountDirty}
									disabled={!isLoaded}
									onClick={() => void saveAccount()}
									state={accountSaveState}
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
										updateIdentity("blogTitle", event.target.value)
									}
									value={form.blogTitle}
								/>
								<SettingsInput
									description="Your public-facing URL. Used in the feed and preview."
									label="Domain"
									mono
									onChange={(event) =>
										updateIdentity("domain", event.target.value)
									}
									placeholder="your-domain.com"
									value={form.domain}
								/>
								<SettingsTextarea
									description="Used in meta tags and the RSS feed description."
									label="Bio"
									onChange={(event) =>
										updateIdentity("bio", event.target.value)
									}
									placeholder="What this blog is about."
									value={form.bio}
								/>
								<SaveRow
									dirty={isIdentityDirty}
									disabled={!isLoaded}
									onClick={() => void saveIdentity()}
									state={identitySaveState}
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
										update("allowedOrigins", event.target.value)
									}
									placeholder={
										"https://your-site.com\nhttps://another-site.com"
									}
									value={form.allowedOrigins}
								/>
								<div className="flex items-center gap-3">
									<span
										aria-live="polite"
										className={cn(
											"text-[11px]",
											feedSaveState === "error"
												? "text-danger"
												: feedSaveState === "saved"
													? "text-success"
													: "text-text-muted",
										)}
									>
										{feedSaveState === "saving"
											? "Saving feed origins…"
											: feedSaveState === "saved"
												? "Feed origins saved"
												: feedSaveState === "error"
													? "Couldn't save feed origins"
													: isFeedDirty
														? "Unsaved feed origin changes"
														: "Allowlist drives CORS for /api/posts"}
									</span>
									<Button
										disabled={!isFeedDirty || feedSaveState === "saving"}
										onClick={() => void saveFeed()}
										size="sm"
										type="button"
									>
										{feedSaveState === "saving" ? "Saving…" : "Save origins"}
									</Button>
								</div>
								<div className="flex flex-col gap-2">
									<EndpointRow
										label="Collection"
										url={`${feedBase}/api/posts`}
									/>
									<EndpointRow
										label="Single post"
										url={`${feedBase}/api/posts/:slug`}
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
										updatePublishing("timeZone", event.target.value)
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
									onChange={(checked) => updatePublishing("seoMeta", checked)}
								/>
								<SettingsToggleRow
									checked={form.rssFeed}
									description="Expose /rss for readers and aggregators."
									label="RSS feed"
									onChange={(checked) => updatePublishing("rssFeed", checked)}
								/>
								<SettingsToggleRow
									checked={form.readingTime}
									description="Show the estimated read time on published posts."
									label="Reading time"
									onChange={(checked) =>
										updatePublishing("readingTime", checked)
									}
								/>
								<SaveRow
									dirty={isPublishingDirty}
									disabled={!isLoaded}
									onClick={() => void savePublishing()}
									state={publishingSaveState}
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
										updatePublishing("umamiShareUrl", event.target.value)
									}
									placeholder="https://umami.example.com/share/…"
									value={form.umamiShareUrl}
								/>
								<SaveRow
									dirty={isPublishingDirty}
									disabled={!isLoaded}
									onClick={() => void savePublishing()}
									state={publishingSaveState}
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
									description={
										storage.connected
											? "Binding and credentials configured · direct uploads enabled"
											: "Set R2_* environment variables to enable uploads"
									}
									name="Cloudflare R2"
									tone={storage.connected ? "connected" : "disconnected"}
								/>
								<SettingsInput
									label="Bucket name"
									mono
									readOnly
									value={storage.bucketName}
								/>
								<SettingsInput
									label="Public URL"
									mono
									placeholder="https://media.your-domain.com"
									readOnly
									value={storage.publicUrl}
								/>
								<SettingsInput
									label="Account ID"
									mono
									placeholder="a1b2c3d4e5f6…"
									readOnly
									value={storage.accountId}
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
										<a
											className={buttonVariants({
												size: "sm",
												variant: "outline",
											})}
											href="/api/backup/export"
										>
											Download backup
										</a>
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
