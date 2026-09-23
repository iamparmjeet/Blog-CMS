"use client";

import { useReducedMotion } from "motion/react";
import { type SVGProps, useId } from "react";

interface PageOwlLogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
	showWordmark?: boolean;
	animated?: boolean;
	loop?: boolean;
	title?: string;
}

export function PageOwlLogo({
	showWordmark = true,
	animated = true,
	loop = true,
	title = "PageOwl",
	className,
	...props
}: PageOwlLogoProps) {
	const reduceMotion = useReducedMotion();
	const gradientId = useId().replaceAll(":", "");
	const leftGradientId = `pageowl-left-${gradientId}`;
	const centerGradientId = `pageowl-center-${gradientId}`;
	const rightGradientId = `pageowl-right-${gradientId}`;
	const owlGradientId = `pageowl-owl-${gradientId}`;
	const shouldAnimate = animated && !reduceMotion;

	return (
		<svg
			viewBox={showWordmark ? "0 0 440 128" : "0 0 128 128"}
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-labelledby={`${gradientId}-title`}
			className={`pageowl-logo ${className ?? ""}`}
			data-animated={shouldAnimate}
			data-loop={loop}
			{...props}
		>
			<title id={`${gradientId}-title`}>{title}</title>
			<defs>
				<linearGradient
					id={leftGradientId}
					x1="20"
					y1="20"
					x2="80"
					y2="110"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#0867F2" />
					<stop offset="1" stopColor="#1746C8" />
				</linearGradient>
				<linearGradient
					id={centerGradientId}
					x1="45"
					y1="18"
					x2="95"
					y2="110"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#12B8F4" />
					<stop offset="1" stopColor="#2563EB" />
				</linearGradient>
				<linearGradient
					id={rightGradientId}
					x1="70"
					y1="20"
					x2="125"
					y2="110"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#62E6F7" />
					<stop offset="1" stopColor="#60A5FA" />
				</linearGradient>
				<linearGradient
					id={owlGradientId}
					x1="38"
					y1="42"
					x2="91"
					y2="90"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#071D55" />
					<stop offset="1" stopColor="#123EA7" />
				</linearGradient>
			</defs>

			<g className="pageowl-pages-left">
				<rect
					x="17"
					y="22"
					width="52"
					height="84"
					rx="10"
					fill={`url(#${leftGradientId})`}
				/>
			</g>
			<g className="pageowl-pages-center">
				<rect
					x="39"
					y="15"
					width="52"
					height="96"
					rx="10"
					fill={`url(#${centerGradientId})`}
					opacity="0.9"
				/>
			</g>
			<g className="pageowl-pages-right">
				<rect
					x="61"
					y="22"
					width="52"
					height="84"
					rx="10"
					fill={`url(#${rightGradientId})`}
					opacity="0.82"
				/>
			</g>

			<path
				d="M32 47C43 42 52 43 64 51c12-8 21-9 32-4-5 6-8 11-9 19-2 14-11 24-23 28-12-4-21-14-23-28-1-8-4-13-9-19Z"
				fill="white"
			/>
			<path d="m64 55 6 16-6 9-6-9 6-16Z" fill={`url(#${owlGradientId})`} />
			<g className="pageowl-eye-left">
				<circle cx="51" cy="66" r="13" fill="white" />
				<circle cx="52" cy="67" r="6.5" fill={`url(#${owlGradientId})`} />
				<circle cx="54" cy="64" r="2" fill="white" opacity="0.9" />
			</g>
			<g className="pageowl-eye-right">
				<circle cx="77" cy="66" r="13" fill="white" />
				<circle cx="76" cy="67" r="6.5" fill={`url(#${owlGradientId})`} />
				<circle cx="78" cy="64" r="2" fill="white" opacity="0.9" />
			</g>
			<path
				d="M39 52c8-4 16-3 23 3M89 52c-8-4-16-3-23 3"
				fill="none"
				stroke={`url(#${owlGradientId})`}
				strokeWidth="5"
				strokeLinecap="round"
			/>

			{showWordmark ? (
				<g
					fontSize="51"
					fontWeight="750"
					fontFamily="Inter, Geist, ui-sans-serif, system-ui, sans-serif"
					letterSpacing="-2.5"
				>
					<text x="145" y="79" fill="var(--pageowl-ink, #07152E)">
						Page
					</text>
					<text x="268" y="79" fill="var(--pageowl-accent, #0B82F6)">
						Owl
					</text>
				</g>
			) : null}
		</svg>
	);
}
