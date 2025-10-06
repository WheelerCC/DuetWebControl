<template>
  <input-dialog
    :shown.sync="innerShown"
    :title="title || $t('dialog.newDirectory.title')"
    :prompt="prompt || $t('dialog.newDirectory.prompt')"
    @confirmed="createDirectory"
  />
</template>

<script lang="ts">
import Vue from "vue";


import { DisconnectedError, getErrorMessage } from "@/utils/errors";
import { LogType } from "@/utils/logging";
import Path from "@/utils/path";
import { useRootStore } from "@/stores";
import { useMachinesStore } from "@/stores/machines";

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		directory: {
			type: String,
			required: true
		},
		title: {
			type: String,
			default: null
		},
		prompt: {
			type: String,
			default: null
		},
		showSuccess: {
			type: Boolean,
			default: true
		},
		showError: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			innerShown: this.shown
		}
	},
	computed: {
		isConnected(): boolean { return useRootStore().isConnected; }
	},
	watch: {
		isConnected(to: boolean) {
			if (!to) {
				this.innerShown = false;
			}
		},
		innerShown(to: boolean) {
			if (this.shown !== to) {
				this.$emit("update:shown", to);
			}
		},
		shown(to: boolean) {
			if (this.innerShown !== to) {
				this.innerShown = to;
			}
		}
	},
	methods: {
		async createDirectory(directory: string) {
			const currentDirectory = this.directory;
			try {
				const path = Path.combine(currentDirectory, directory);
				await useMachinesStore().makeDirectory(path)

				this.$emit("directoryCreated", path);
				if (this.showSuccess) {
					this.$makeNotification(LogType.success, this.$t("notification.newDirectory.successTitle"), this.$t("notification.newDirectory.successMessage", [directory]));
				}
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					this.$emit("directoryCreationFailed", e);
					if (this.showError) {
						this.$makeNotification(LogType.error, this.$t("notification.newDirectory.errorTitle"), getErrorMessage(e));
					}
				}
			}
		}
	}
});
</script>
