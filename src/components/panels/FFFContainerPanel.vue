<template>
  <v-row :dense="$vuetify.breakpoint.mobile">
    <v-col
      cols="12"
      sm="6"
      md="4"
      lg="4"
      xl="4"
    >
      <status-panel />
    </v-col>

    <v-col
      cols="12"
      sm="6"
      md="5"
      lg="5"
      xl="4"
    >
      <tools-panel />
    </v-col>

    <v-col
      v-if="$vuetify.breakpoint.mdAndUp"
      :class="{ 'd-flex': hasTemperaturesToDisplay }"
      md="3"
      lg="3"
      xl="4"
    >
      <temperature-chart />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { useMachinesStore } from "@/stores/machines";
import Vue from "vue";



export default Vue.extend({
	computed: {
		hasTemperaturesToDisplay(): boolean { return useMachinesStore().hasTemperaturesToDisplay; }
	}
});
</script>