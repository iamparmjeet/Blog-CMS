import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Footer } from "#/components/shared/footer";
import { Header } from "#/components/shared/header";

export const Route = createFileRoute("/_public")({
	component: PublicLayout,
});

function PublicLayout() {
	return (
		<>
			<Header />
			<Outlet />
			<Footer />
		</>
	);
}
