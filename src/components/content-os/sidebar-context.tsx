import { createContext, useContext, useState } from "react";
import type { PostStatus } from "#/features/posts/functions/posts.types";

export interface SidebarPostContext {
	isPublished: boolean;
	onPublishChange?: (next: boolean) => void;
	postId: number;
	scheduledAt: string | null;
	slug: string;
	status: PostStatus;
	timeZone: string;
	title: string;
	updatedAt: string;
	wordCount: number;
}

const SidebarPostValueContext = createContext<SidebarPostContext | null>(null);

const SidebarPostSetterContext = createContext<
	(post: SidebarPostContext | null) => void
>(() => {});

export function SidebarPostProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [post, setPost] = useState<SidebarPostContext | null>(null);

	return (
		<SidebarPostSetterContext.Provider value={setPost}>
			<SidebarPostValueContext.Provider value={post}>
				{children}
			</SidebarPostValueContext.Provider>
		</SidebarPostSetterContext.Provider>
	);
}

export function useSidebarPost(): SidebarPostContext | null {
	return useContext(SidebarPostValueContext);
}

export function useSetSidebarPost() {
	return useContext(SidebarPostSetterContext);
}
