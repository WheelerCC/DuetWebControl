<template>
  <table
    v-if="hasTools || hasBeds || hasChambers"
    class="tools"
  >
    <colgroup>
      <col style="width: 25%">
      <col style="width: 20%">
      <col style="width: 19%">
      <col style="width: 18%">
      <col style="width: 18%">
    </colgroup>
    <thead>
      <tr>
        <th class="pl-2">
          {{ $t("panel.tools.tool", [""]) }}
        </th>
        <th class="px-1">
          {{ $t("panel.tools.heater", [""]) }}
        </th>
        <th class="px-1">
          {{ $t("panel.tools.current", [""]) }}
        </th>
        <th class="px-1">
          {{ $t("panel.tools.active") }}
        </th>
        <th class="pr-2">
          {{ $t("panel.tools.standby") }}
        </th>
      </tr>
    </thead>

    <!-- Tools -->
    <tool-rows @resetHeaterFault="resetHeaterFault" />

    <!-- Divider -->
    <tbody v-if="hasTools && hasBeds">
      <tr>
        <td colspan="5">
          <v-divider />
        </td>
      </tr>
    </tbody>

    <!-- Beds -->
    <heater-rows
      type="bed"
      @resetHeaterFault="resetHeaterFault"
    />

    <!-- Divider -->
    <tbody v-if="(hasTools || hasBeds) && hasChambers">
      <tr>
        <td colspan="5">
          <v-divider />
        </td>
      </tr>
    </tbody>

    <!-- Chambers -->
    <heater-rows
      type="chamber"
      @resetHeaterFault="resetHeaterFault"
    />

    <!-- Heater faults-->
    <reset-heater-fault-dialog
      :shown.sync="resettingHeaterFault"
      :heater="faultyHeaterToReset"
    />
  </table>
  <v-alert
    v-else
    :value="true"
    type="info"
    class="mb-0"
  >
    {{ $t("panel.tools.noTools") }}
  </v-alert>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";



import HeaterRows from "./HeaterRows.vue";
import ToolRows from "./ToolRows.vue";
import { useMachinesModelStore } from "@/stores/machineModel";
import { useMachinesSettingsStore } from "@/stores/machineSettings";

// General appearance
const hasTools = computed(() => useMachinesModelStore().tools.some(tool => tool !== null));
const hasBeds = computed(() => useMachinesModelStore().heat.bedHeaters.some(bedHeater => (bedHeater >= 0) && (bedHeater < useMachinesModelStore().heat.heaters.length) && (useMachinesModelStore().heat.heaters[bedHeater] !== null)));
const hasChambers = computed(() => useMachinesModelStore().heat.chamberHeaters.some(chamberHeater => (chamberHeater >= 0) && (chamberHeater < useMachinesModelStore().heat.heaters.length) && (useMachinesModelStore().heat.heaters[chamberHeater] !== null)));

// Bed control
const bedHeaters = computed(() => useMachinesModelStore().heat.bedHeaters);
const singleBedControl = computed<boolean>(() => useMachinesSettingsStore().singleBedControl);

// Chamber control
const chamberHeaters = computed(() => useMachinesModelStore().heat.chamberHeaters);

// Heater fault management
const resettingHeaterFault = ref(false), faultyHeaterToReset = ref(-1);
function resetHeaterFault(heater: number) {
    faultyHeaterToReset.value = heater;
    resettingHeaterFault.value = true;
}
</script>

<style>
table.tools {
	width: 100%;
	border-spacing: 0;
}

table.tools i {
    color: inherit !important;
}

table.tools td,
table.tools th {
	text-align: center;
}
</style>
