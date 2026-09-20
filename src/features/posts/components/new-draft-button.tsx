import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { Button } from "#/components/ui/button";
import { createDraft } from "../functions/create-draft.function";

export function NewDraftButton() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	function handleCreate() {
		setError(null);

		startTransition(async () => {
			try {
				const draft = await createDraft({ data: {} });
				await router.navigate({
					to: "/posts/$postId",
					params: { postId: String(draft.id) },
				});
			} catch {
				setError("Could not create a draft. Please try again.");
			}
		});
	}

	return (
		<div className="flex flex-col items-end gap-2">
			<Button
				disabled={isPending}
				onClick={handleCreate}
				size="sm"
				type="button"
				variant="outline"
			>
				<IconPlus aria-hidden="true" />
				{isPending ? "Creating…" : "New post"}
			</Button>
			{error ? (
				<p className="text-danger text-xs" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
