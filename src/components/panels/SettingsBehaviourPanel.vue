<template>
  <v-card outlined>
    <v-card-title>
      {{ $t("panel.settingsBehaviour.caption") }}
    </v-card-title>

    <v-card-text>
      <v-row>
        <v-col
          cols="12"
          xs="12"
        >
          <v-switch
            v-model="behaviourJobStart"
            class="mt-0"
            :label="$t('panel.settingsBehaviour.behaviourJobStart')"
            hide-details
          />
        </v-col>
        <v-col
          cols="12"
          xs="12"
        >
          <v-switch
            v-model="promptDuringFilamentChange"
            class="mt-0 mb-3"
            :label="$t('panel.settingsBehaviour.promptDuringFilamentChange')"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { SettingsState, useSettingsStore } from "@/stores/settings";
import Vue from "vue";


export default Vue.extend({
	computed: {
		behaviourJobStart: {
			get(): boolean { return useSettingsStore().behaviour.jobStart; },
			set(value: boolean) { this.update({ jobStart: value }); }
		},
		promptDuringFilamentChange: {
			get(): boolean { return useSettingsStore().behaviour.promptDuringFilamentChange; },
			set(value: boolean) { this.update({ promptDuringFilamentChange: value }); }
		}
	},
	methods: {
    update(data: Partial<SettingsState["behaviour"]>) {
      useSettingsStore().update({ behaviour: data })
		}
	}
});
</script>
