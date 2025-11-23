import { registerRoute } from "@/routes";

import ObjectModelBrowser from "./ObjectModelBrowser.vue";
import { FolderTree } from "lucide-vue-next";

// Register a route via Settings -> Object Model
registerRoute(ObjectModelBrowser, {
	Plugins: {
		ObjectModel: {
			icon: FolderTree,
			caption: "plugins.objectModelBrowser.menuCaption",
			path: "/Plugins/ObjectModel"
		}
	}
});
