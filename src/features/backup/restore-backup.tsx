import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { type BackupBundle, MAX_IMPORT_BYTES } from "./backup-export";

type RestoreMode = "merge" | "replace";

export function RestoreBackup() {
	const [file, setFile] = useState<File | null>(null);
	const [mode, setMode] = useState<RestoreMode>("merge");
	const [confirmation, setConfirmation] = useState("");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState(false);
	const [progress, setProgress] = useState("");
	const [canCancel, setCanCancel] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	async function checkedResponse(response: Response) {
		const result = (await response.json()) as {
			posts?: number;
			media?: number;
			activity?: number;
			error?: { message: string };
		};
		if (!response.ok)
			throw new Error(result.error?.message ?? "Restore failed.");
		return result;
	}

	async function chunkedRestore(file: File, controller: AbortController) {
		const bundle = JSON.parse(await file.text()) as BackupBundle;
		if (bundle.version !== 1 || !Array.isArray(bundle.media))
			throw new Error("Invalid or unsupported ContentOS backup.");
		const session = crypto.randomUUID();
		let finalizing = false;
		setCanCancel(true);
		try {
			const manifest = {
				...bundle,
				media: bundle.media.map((entry) => ({
					...entry,
					original:
						"missing" in entry.original
							? entry.original
							: {
									contentType: entry.original.contentType,
									byteLength:
										Math.floor((entry.original.contentBase64.length * 3) / 4) -
										(entry.original.contentBase64.endsWith("==")
											? 2
											: entry.original.contentBase64.endsWith("=")
												? 1
												: 0),
								},
					preview:
						"missing" in entry.preview
							? entry.preview
							: {
									contentType: entry.preview.contentType,
									byteLength:
										Math.floor((entry.preview.contentBase64.length * 3) / 4) -
										(entry.preview.contentBase64.endsWith("==")
											? 2
											: entry.preview.contentBase64.endsWith("=")
												? 1
												: 0),
								},
				})),
			};
			if (new Blob([JSON.stringify(manifest)]).size > MAX_IMPORT_BYTES)
				throw new Error("Backup metadata exceeds 16 MiB.");
			const objects = bundle.media.flatMap((entry, index) => {
				if (!entry.fileKey) return [];
				return (["original", "preview"] as const).flatMap((kind) => {
					const stored = entry[kind];
					return "contentBase64" in stored &&
						(kind === "original" || entry.previewKey)
						? [
								{
									index,
									kind,
									contentType: stored.contentType,
									base64: stored.contentBase64,
								},
							]
						: [];
				});
			});
			for (const [position, object] of objects.entries()) {
				if (controller.signal.aborted)
					throw new DOMException("Restore canceled.", "AbortError");
				setProgress(
					`Uploading media object ${position + 1} of ${objects.length}…`,
				);
				const bytes = Uint8Array.from(atob(object.base64), (character) =>
					character.charCodeAt(0),
				);
				await checkedResponse(
					await fetch(
						`/api/backup/session?session=${session}&index=${object.index}&kind=${object.kind}`,
						{
							method: "PUT",
							credentials: "same-origin",
							signal: controller.signal,
							headers: {
								"content-type": object.contentType,
								"x-object-size": String(bytes.byteLength),
							},
							body: bytes,
						},
					),
				);
			}
			setProgress("Applying posts, settings and media links…");
			finalizing = true;
			setCanCancel(false);
			return checkedResponse(
				await fetch(`/api/backup/session?session=${session}&mode=${mode}`, {
					method: "POST",
					credentials: "same-origin",
					signal: controller.signal,
					headers: {
						"content-type": "application/json",
						...(mode === "replace"
							? { "x-confirm-replace": confirmation }
							: {}),
					},
					body: JSON.stringify(manifest),
				}),
			);
		} catch (cause) {
			if (!finalizing) {
				try {
					await fetch(`/api/backup/session?session=${session}`, {
						method: "DELETE",
						credentials: "same-origin",
					});
				} catch {
					/* The upload may remain staged if the connection is lost. */
				}
			}
			throw cause;
		}
	}

	async function restore() {
		if (!file) return;
		setBusy(true);
		setMessage("");
		setError(false);
		const controller = new AbortController();
		abortRef.current = controller;
		try {
			const result =
				file.size > MAX_IMPORT_BYTES
					? await chunkedRestore(file, controller)
					: await checkedResponse(
							await fetch(`/api/backup/import?mode=${mode}`, {
								method: "POST",
								credentials: "same-origin",
								headers: {
									"content-type": "application/json",
									...(mode === "replace"
										? { "x-confirm-replace": confirmation }
										: {}),
								},
								body: file,
								signal: controller.signal,
							}),
						);
			setMessage(
				`Restored ${result.posts} posts, ${result.media} media assets, and ${result.activity} activity days. Reload to see the imported data.`,
			);
			setFile(null);
		} catch (cause) {
			setError(true);
			setMessage(
				controller.signal.aborted
					? "Restore canceled. Already uploaded staging objects may remain in R2."
					: cause instanceof Error
						? cause.message
						: "Restore failed.",
			);
		} finally {
			setBusy(false);
			setProgress("");
			setCanCancel(false);
			abortRef.current = null;
		}
	}

	return (
		<div className="space-y-3 border-danger/10 border-t pt-3">
			<div>
				<p className="font-medium text-[13px] text-text-body">
					Restore a backup
				</p>
				<p className="mt-0.5 text-[11px] text-text-muted">
					Import a ContentOS JSON backup. Larger backups stream media one object
					at a time to this instance’s R2 bucket.
				</p>
			</div>
			<input
				aria-label="Backup JSON file"
				accept=".json,application/json"
				className="block w-full text-xs"
				onChange={(event) => {
					setFile(event.target.files?.[0] ?? null);
					setMessage("");
				}}
				type="file"
			/>
			<fieldset className="flex flex-wrap gap-4 text-text-body text-xs">
				<legend className="mb-1 font-medium">Restore mode</legend>
				<label className="flex items-center gap-2">
					<input
						checked={mode === "merge"}
						name="restore-mode"
						onChange={() => setMode("merge")}
						type="radio"
					/>
					Merge — keep current data and rename duplicate slugs
				</label>
				<label className="flex items-center gap-2">
					<input
						checked={mode === "replace"}
						name="restore-mode"
						onChange={() => setMode("replace")}
						type="radio"
					/>
					Replace — delete current posts, media, settings and activity
				</label>
			</fieldset>
			{mode === "replace" && (
				<label className="block text-danger text-xs">
					Type REPLACE to confirm
					<input
						aria-label="Confirm replacement"
						className="mt-1 block w-full rounded border border-danger/40 bg-transparent px-2 py-1 text-text-body"
						onChange={(event) => setConfirmation(event.target.value)}
						value={confirmation}
					/>
				</label>
			)}
			<Button
				disabled={
					!file || busy || (mode === "replace" && confirmation !== "REPLACE")
				}
				onClick={() => void restore()}
				size="sm"
				type="button"
				variant={mode === "replace" ? "destructive" : "outline"}
			>
				{busy
					? "Restoring…"
					: mode === "replace"
						? "Replace from backup"
						: "Merge backup"}
			</Button>
			{busy && canCancel && (
				<Button
					onClick={() => abortRef.current?.abort()}
					size="sm"
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
			)}
			{progress && (
				<p aria-live="polite" className="text-text-muted text-xs">
					{progress}
				</p>
			)}
			{message && (
				<p
					aria-live="polite"
					className={error ? "text-danger text-xs" : "text-success text-xs"}
				>
					{message}
				</p>
			)}
		</div>
	);
}
