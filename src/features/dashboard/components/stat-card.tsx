interface StatCardProps {
	label: string;
	value: string;
	icon?: React.ReactNode;
	accentColor: string;
}

export function StatCard({ label, value, icon, accentColor }: StatCardProps) {
	return (
		<article className="rounded-xl border border-border bg-card p-5 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="mb-2 font-semibold text-3xl text-zinc-300 tracking-tight">
						{value}
					</p>
					<p className="text-sm text-zinc-500">{label}</p>
				</div>

				{icon && (
					<div
						className="flex size-10 items-center justify-center rounded-lg border border-current/20"
						style={{
							color: accentColor,
							backgroundColor: `${accentColor}14`,
						}}
					>
						{icon}
					</div>
				)}
			</div>
		</article>
	);
}
