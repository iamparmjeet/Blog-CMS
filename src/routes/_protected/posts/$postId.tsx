import { createFileRoute } from "@tanstack/react-router";
import { getPostEditor } from "#/features/posts/functions/get-post-editor.function";
import { PostEditorPage } from "#/features/posts/pages/post-editor-page";

export const Route = createFileRoute("/_protected/posts/$postId")({
	loader: ({ params }) =>
		getPostEditor({
			data: { postId: params.postId },
		}),
	head: () => ({
		meta: [
			{
				title: "Edit post · PageOwl",
			},
		],
	}),
	component: PostEditorRoute,
});

function PostEditorRoute() {
	const { post, takenSlugs } = Route.useLoaderData();

	return <PostEditorPage post={post} takenSlugs={takenSlugs} />;
}
