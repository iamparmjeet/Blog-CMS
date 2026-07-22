export function BrowserHeader() {
	return (
		<div className="flex h-10 items-center gap-3 border-b border-white/10 bg-zinc-900 px-4">
			<div className="flex gap-1.5">
				<div className="h-3 w-3 rounded-full bg-red-500/80" />
				<div className="h-3 w-3 rounded-full bg-yellow-500/80" />
				<div className="h-3 w-3 rounded-full bg-green-500/80" />
			</div>

			<div className="flex-1 rounded-md border border-white/5 bg-zinc-950 px-4 py-1 text-center text-xs text-zinc-500">
				Why I Ditched Notion for a Custom CMS — content.os
			</div>
		</div>
	);
}
