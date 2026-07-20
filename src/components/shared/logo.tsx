export function Logo() {
	return (
		<div
			className="w-10 h-10 rounded-[10px] flex items-center justify-center"
			style={{
				background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
				boxShadow:
					"0 0 0 1px rgba(124,58,237,0.3), 0 8px 24px rgba(124,58,237,0.2)",
			}}
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path
					d="M4 6h8M4 10h12M4 14h9"
					stroke="#fff"
					strokeWidth="1.75"
					strokeLinecap="round"
				/>
			</svg>
		</div>
	);
}
