<template>
  <v-card outlined>
    <v-card-title class="pb-0">
      {{ $t("panel.settingsGeneral.caption") }}

      <v-spacer />

      <a
        v-show="!uiFrozen"
        href="javascript:void(0)"
        @click="showResetConfirmation = true"
      >
        <v-icon
          small
          class="mr-1"
        >mdi-restore</v-icon>
        {{ $t("panel.settingsGeneral.factoryReset") }}
      </a>
    </v-card-title>

    <v-card-text>
      <v-row :dense="$vuetify.breakpoint.mobile">
        <v-col
          cols="12"
          sm="6"
        >
          <v-switch
            v-model="settingsStorageLocal"
            :label="$t('panel.settingsGeneral.settingsStorageLocal')"
            :disabled="!supportsLocalStorage"
            hide-details
          />
        </v-col>
        <v-col
          cols="12"
          sm="6"
        >
          <v-text-field
            v-model.number="settingsSaveDelay"
            type="number"
            step="any"
            min="0"
            :label="$t('panel.settingsGeneral.settingsSaveDelay', ['ms'])"
            hide-details
          />
        </v-col>
        <v-col
          cols="12"
          sm="6"
        >
          <v-switch
            v-model="cacheStorageLocal"
            :label="$t('panel.settingsGeneral.cacheStorageLocal')"
            :disabled="!supportsLocalStorage"
            hide-details
          />
        </v-col>
        <v-col
          cols="12"
          sm="6"
        >
          <v-text-field
            v-model.number="cacheSaveDelay"
            type="number"
            step="any"
            min="0"
            :label="$t('panel.settingsGeneral.cacheSaveDelay', ['ms'])"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>

    <confirm-dialog
      :shown.sync="showResetConfirmation"
      :title="$t('dialog.factoryReset.title')"
      :prompt="$t('dialog.factoryReset.prompt')"
      @confirmed="reset"
    />
  </v-card>
</template>

<script lang="ts">
import Vue from "vue";


import { localStorageSupported } from "@/utils/localStorage";
import { SettingsState, useSettingsStore } from "@/stores/settings";
import { useRootStore } from "@/stores";

export default Vue.extend({
	data() {
		return {
			showResetConfirmation: false
		};
	},
	computed: {
		uiFrozen(): boolean { return useRootStore().uiFrozen; },
		supportsLocalStorage() { return localStorageSupported; },
		darkTheme: {
			get(): boolean { return useSettingsStore().darkTheme; },
			set(value: boolean) { this.update({ darkTheme: value }); }
		},
		settingsStorageLocal: {
			get(): boolean { return useSettingsStore().settingsStorageLocal; },
			set(value: boolean) { this.update({ settingsStorageLocal: value }); }
		},
		settingsSaveDelay: {
			get(): number { return useSettingsStore().settingsSaveDelay; },
			set(value: number) { if (isFinite(value) && value >= 0) { this.update({ settingsSaveDelay: value }); } }
		},
		cacheStorageLocal: {
			get(): boolean { return useSettingsStore().cacheStorageLocal; },
			set(value: boolean) { this.update({ cacheStorageLocal: value }); }
		},
		cacheSaveDelay: {
			get(): number { return useSettingsStore().cacheSaveDelay; },
			set(value: number) { if (isFinite(value) && value >= 0) { this.update({ cacheSaveDelay: value }); } }
		}
	},
	methods: {
    reset() {
      useSettingsStore().reset()
		},
    update(data: Partial<SettingsState>) {
      useSettingsStore().update(data)
		}
	}
});
</script>
