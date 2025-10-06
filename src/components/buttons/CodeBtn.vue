<template>
  <v-btn
    v-bind="$props"
    :disabled="$props.disabled || uiFrozen"
    :elevation="1"
    :loading="waitingForCode"
    @click="click"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <slot />
  </v-btn>
</template>

<script lang="ts">
import { useRootStore } from "@/stores";
import { useMachinesStore } from "@/stores/machines";
import { VBtn } from "vuetify/lib";



export default VBtn.extend({
	props: {
		code: {
			type: String,
			required: true
		},
		disabled: Boolean,
		log: {
			type: Boolean,
			default: true
		},
		noWait: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		uiFrozen(): boolean { return useRootStore().uiFrozen; }
	},
	data() {
		return {
			waitingForCode: false
		}
	},
	methods: {
		async click() {
			try {
				if (this.noWait) {
					// Run the requested code but don't wait for a result
					await useMachinesStore().sendCode({
						code: this.code,
						log: this.log,
						noWait: true
					});
				} else {
					// Wait for the code to complete and block while doing so
					this.waitingForCode = true;
					try {
						await useMachinesStore().sendCode({
							code: this.code,
							log: this.log
						});
					} finally {
						this.waitingForCode = false;
					}
				}
			} catch (e) {
				// handled before we get here
			}
		}
	}
});
</script>
