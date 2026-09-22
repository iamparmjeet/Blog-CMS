import { mergeAttributes, Node } from "@tiptap/core";

export interface MediaAssetAttributes {
	alt: string;
	kind: "image" | "video";
	mediaId: number | null;
	poster: string | null;
	src: string;
	title: string;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		mediaAsset: {
			insertMediaAsset: (attributes: MediaAssetAttributes) => ReturnType;
		};
	}
}

// Atom node for library-managed media inserted into a post. The media id on
// the node is what the deletion guard scans for, so a published post can
// never silently lose an embedded asset.
export const MediaAsset = Node.create<MediaAssetAttributes>({
	name: "mediaAsset",
	group: "block",
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			alt: {
				default: "",
				parseHTML: (element) => element.getAttribute("alt") ?? "",
				renderHTML: (attributes) => ({ alt: attributes.alt }),
			},
			kind: {
				default: "image",
				parseHTML: (element) =>
					element.tagName === "VIDEO" ? "video" : "image",
				renderHTML: () => ({}),
			},
			mediaId: {
				default: null,
				parseHTML: (element) => {
					const raw = element.getAttribute("data-media-id");
					const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
					return Number.isInteger(parsed) ? parsed : null;
				},
				renderHTML: (attributes) =>
					attributes.mediaId != null
						? { "data-media-id": String(attributes.mediaId) }
						: {},
			},
			poster: {
				default: null,
				parseHTML: (element) => element.getAttribute("poster"),
				renderHTML: (attributes) =>
					attributes.poster ? { poster: attributes.poster } : {},
			},
			src: {
				default: "",
				parseHTML: (element) => element.getAttribute("src") ?? "",
				renderHTML: (attributes) => ({ src: attributes.src }),
			},
			title: {
				default: "",
				parseHTML: (element) => element.getAttribute("title") ?? "",
				renderHTML: (attributes) =>
					attributes.title ? { title: attributes.title } : {},
			},
		};
	},

	parseHTML() {
		return [{ tag: "img[data-media-id]" }, { tag: "video[data-media-id]" }];
	},

	renderHTML({ HTMLAttributes, node }) {
		if (node.attrs.kind === "video") {
			return [
				"video",
				mergeAttributes(HTMLAttributes, {
					controls: "",
					playsinline: "",
				}),
			];
		}

		return ["img", HTMLAttributes];
	},

	addCommands() {
		return {
			insertMediaAsset:
				(attributes) =>
				({ commands }) =>
					commands.insertContent({ attrs: attributes, type: this.name }),
		};
	},
});
