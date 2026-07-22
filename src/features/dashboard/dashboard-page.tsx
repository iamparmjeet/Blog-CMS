import type { AuthenticatedUser } from "#/lib/auth/auth.types";

interface DashBoardPageProps {
	user: AuthenticatedUser;
	welcomeMessage: string;
}

export function DashBoardPage({ user, welcomeMessage }: DashBoardPageProps) {
	return (
		<main>
			<header>
				<h1>{welcomeMessage}</h1>
				<p>{user.email}</p>
			</header>
		</main>
	);
}
