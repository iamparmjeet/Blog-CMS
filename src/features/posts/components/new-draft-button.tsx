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
				await createDraft({ data: {} });
				await router.invalidate();
			} catch {
				setError("Could not create a draft. Please try again.");
			}
		});
	}

	return (
		<div className="flex flex-col items-end gap-2">
			<Button
				variant="purple"
				size="lg"
				disabled={isPending}
				onClick={handleCreate}
				className="cursor-pointer"
			>
				<IconPlus aria-hidden="true" />
				{isPending ? "Creating…" : "New draft"}
			</Button>
			{error ? (
				<p role="alert" className="text-destructive text-xs">
					{error}
				</p>
			) : null}
		</div>
	);
}
