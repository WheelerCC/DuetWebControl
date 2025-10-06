<template>
  <v-btn
    v-bind="$props"
    :color="buttonColor"
    :depressed="isBusy"
    @click="clicked"
  >
    <v-icon v-show="!isBusy">
      {{ buttonIcon }}
    </v-icon>
    <v-progress-circular
      v-show="isBusy"
      size="20"
      indeterminate
    />
    <span
      class="ml-2"
      v-text="caption"
    />
  </v-btn>
</template>

<script lang="ts">
import { useRootStore } from "@/stores";
import { useMachinesStore } from "@/stores/machines";
import Vue from "vue";



export default Vue.extend({
	computed: {
		isConnected(): boolean { return useRootStore().isConnected },
		isBusy(): boolean { return useRootStore().isConnecting || useMachinesStore().isReconnecting || useRootStore().isDisconnecting },
		buttonColor(): string {
			return this.isBusy ? "warning" : (this.isConnected ? "success" : "primary");
		},
		buttonIcon(): string {
			return this.isConnected ? "mdi-close-circle-outline" : "mdi-power";
		},
		caption(): string {
			return this.$t((useRootStore().isConnecting || useMachinesStore().isReconnecting) ? "button.connect.connecting"
				: useRootStore().isDisconnecting ? "button.connect.disconnecting"
					: this.isConnected ? "button.connect.disconnect"
						: "button.connect.connect");
		}
	},
	methods: {
		async clicked() {
			if (this.isBusy) {
				// Cannot disable this button because that messes up the color
				return;
			}

			if (this.isConnected) {
				// Disconnect from the current machine
				await useRootStore().disconnect()
			} else if (process.env.NODE_ENV === "development") {
				// Ask user for hostname before connecting
				await useRootStore().showConnectDialog()
			} else {
				// Connect to the host this is running on
				await useRootStore().connect()
			}
		}
	}
});
</script>
