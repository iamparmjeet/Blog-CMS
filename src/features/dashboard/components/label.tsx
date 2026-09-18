export function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="mb-3.5 flex items-center gap-3">
			<span className="shrink-0 font-semibold text-[#333] text-[10px] uppercase tracking-widest">
				{children}
			</span>
			<div className="h-px flex-1 bg-[#161616]" />
		</div>
	);
}
