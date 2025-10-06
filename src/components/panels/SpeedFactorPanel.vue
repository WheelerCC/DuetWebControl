<template>
  <v-card>
    <v-card-title class="pb-0">
      <v-icon
        small
        class="mr-1"
      >
        mdi-timer
      </v-icon>
      {{ $t("panel.speedFactor.caption") }}

      <v-spacer />

      <a
        v-show="speedFactor !== 100 && !uiFrozen"
        href="javascript:void(0)"
        class="subtitle-2"
        @click.prevent="sendCode('M220 S100')"
      >
        <v-icon
          small
          class="mr-1"
        >mdi-backup-restore</v-icon>
        {{ $t("generic.reset") }}
      </a>
    </v-card-title>

    <v-card-text class="py-0">
      <percentage-input
        v-model="speedFactor"
        :min="speedFactorMin"
        :max="speedFactorMax"
        :disabled="uiFrozen"
      />
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { useRootStore } from "@/stores";
import { useMachinesModelStore } from "@/stores/machineModel";
import { useMachinesStore } from "@/stores/machines";
import Vue from "vue";



export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return useRootStore().uiFrozen; },
		speedFactor: {
			get(): number { return (useMachinesModelStore().move.speedFactor !== null) ? (useMachinesModelStore().move.speedFactor * 100) : 100; },
			set(value: number) { this.sendCode(`M220 S${value}`); }
		},
		speedFactorMin(): number { return Math.max(1, Math.min(100, this.speedFactor - 50)); },
		speedFactorMax(): number { return Math.max(150, this.speedFactor + 50); }
	},
	methods: {
		async sendCode(code: string) {
			await useMachinesStore().sendCode(code);
		}
	}
});
</script>
