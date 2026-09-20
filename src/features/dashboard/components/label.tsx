export function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-3">
			<span className="shrink-0 font-semibold text-[10px] text-text-ghost uppercase tracking-widest">
				{children}
			</span>
			<div className="h-px flex-1 bg-border-dim" />
		</div>
	);
}
