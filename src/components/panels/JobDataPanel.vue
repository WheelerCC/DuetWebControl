<template>
  <v-card>
    <v-card-title class="pb-1">
      <v-icon
        small
        class="mr-1"
      >
        mdi-dots-horizontal
      </v-icon> 
      {{ $t("panel.jobData.caption") }}
    </v-card-title>

    <v-card-text class="text-center pb-2">
      <v-row dense>
        <v-col class="d-flex flex-column">
          <strong>
            {{ $t("panel.jobData.warmUpDuration") }}
          </strong>
          <span>
            {{ $displayTime(warmUpDuration) }}
          </span>
        </v-col>

        <v-col class="d-flex flex-column">
          <strong>
            {{ $t("panel.jobData.currentLayerTime") }}
          </strong>
          <span>
            {{ $displayTime(layerTime) }}
          </span>
        </v-col>

        <v-col class="d-flex flex-column">
          <strong>
            {{ $t("panel.jobData.lastLayerTime") }}
          </strong>
          <span>
            {{ $displayTime(lastLayerTime) }}
          </span>
        </v-col>

        <v-col class="d-flex flex-column">
          <strong>
            {{ $t("panel.jobData.jobDuration") }}
          </strong>
          <span>
            {{ $displayTime(jobDuration) }}
          </span>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from "vue";


import { isPrinting } from "@/utils/enums";
import { useMachinesModelStore } from "@/stores/machineModel";

export default Vue.extend({
	computed: {
		warmUpDuration(): number | null {
			return isPrinting(useMachinesModelStore().state.status) ? useMachinesModelStore().job.warmUpDuration : useMachinesModelStore().job.lastWarmUpDuration;
		},
		layerTime(): number | null {
			return useMachinesModelStore().job.layerTime;
		},
		lastLayerTime(): number | null {
			if (useMachinesModelStore().job.layers.length === 0) {
				return null;
			}
			return useMachinesModelStore().job.layers[useMachinesModelStore().job.layers.length - 1].duration;
		},
		jobDuration(): number | null {
			return isPrinting(useMachinesModelStore().state.status) ? useMachinesModelStore().job.duration : useMachinesModelStore().job.lastDuration;
		}
	}
});
</script>
