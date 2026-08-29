export function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-3 mb-3.5">
			<span className="text-[10px] font-semibold text-[#333] tracking-widest uppercase shrink-0">
				{children}
			</span>
			<div className="flex-1 h-px bg-[#161616]" />
		</div>
	);
}
