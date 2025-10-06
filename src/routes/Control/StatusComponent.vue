<template>
  <div class="mb-3">
    <fff-container-panel v-if="isFFForUnset" />
    <cnc-container-panel v-else />
  </div>
</template>

<script lang="ts">
import { MachineMode } from "@duet3d/objectmodel";
import Vue from "vue";


import { useMachinesModelStore } from "@/stores/machineModel";
import { DashboardMode, useSettingsStore } from "@/stores/settings";

export default Vue.extend({
	computed: {
		isFFForUnset() {
			if (useSettingsStore().dashboardMode === DashboardMode.default) {
				return !useMachinesModelStore().state.machineMode || useMachinesModelStore().state.machineMode === MachineMode.fff;
			}
			return useSettingsStore().dashboardMode === DashboardMode.fff;
		}
	}
});
</script>