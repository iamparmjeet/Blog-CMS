import { createFileRoute } from "@tanstack/react-router";
import { FinalCTASection } from "#/features/marketing/final-cta-section";
import { Hero } from "#/features/marketing/hero";
import { HowItWorksSection } from "#/features/marketing/how-it-works-section";
import { OpenSourceSection } from "#/features/marketing/open-source-section";
import { RepurposeSection } from "#/features/marketing/repurpose-section";

export const Route = createFileRoute("/_public/")({
	component: App,
});

function App() {
	return (
		<>
			<Hero />
			<RepurposeSection />
			<HowItWorksSection />
			<OpenSourceSection />
			<FinalCTASection />
		</>
	);
}
