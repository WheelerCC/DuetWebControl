<template>
  <v-card outlined>
    <v-card-title>
      {{ $t('panel.settingsAppearance.caption') }}
    </v-card-title>

    <v-card-text class="d-flex flex-column">
      <v-switch
        v-model="darkTheme"
        :label="$t('panel.settingsAppearance.darkTheme')"
        class="mt-0 mb-3"
        hide-details
      />
      <v-select
        v-model="language"
        :items="languages"
        :label="$t('panel.settingsAppearance.language')"
        :return-object="false"
        hide-details
        item-text="language"
        item-value="code"
      />
      <v-tooltip bottom>
        <template #activator="{ on }">
          <v-switch
            v-model="useBinaryPrefix"
            :label="$t('panel.settingsAppearance.binaryFileSizes')"
            hide-details
            v-on="on"
          />
        </template>
        {{ $t('panel.settingsAppearance.binaryFileSizesTitle') }}
      </v-tooltip>
      <v-tooltip bottom>
        <template #activator="{ on }">
          <v-switch
            v-model="disableAutoComplete"
            :label="$t('panel.settingsAppearance.disableAutoComplete')"
            hide-details
            v-on="on"
          />
        </template>
        {{ $t('panel.settingsAppearance.disableAutoCompleteTitle') }}
      </v-tooltip>
      <v-select
        v-model="dashboardMode"
        :items="dashboardModes"
        :label="$t('panel.settingsAppearance.dashboardModeTitle')"
        class="mt-3"
        hide-details
        item-text="value"
        item-value="value"
      />
      <v-switch
        v-model="bottomNavigation"
        :label="$t('panel.settingsAppearance.bottomNavigation')"
        hide-details
      />
      <v-switch
        v-model="numericInputs"
        :label="$t('panel.settingsAppearance.numericInputs')"
        hide-details
      />
      <v-switch v-model="iconMenu" :label="$t('panel.settingsAppearance.iconMenu')" hide-details />
      <v-select
        v-model.number="decimalPlaces"
        :items="[0, 1, 2, 3]"
        :label="$t('panel.settingsAppearance.decimalPlaces')"
        hide-details
        class="mt-3"
      />
      <v-select
        v-model="displayUnits"
        :items="unitsOfMeasure"
        :label="$t('panel.settingsAppearance.displayUnitsTitle')"
        class="mt-3"
        hide-details
        item-text="value"
        item-value="value"
      />
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { DashboardMode, SettingsState, UnitOfMeasure, useSettingsStore } from '@/stores/settings'
import Vue from 'vue'

export default Vue.extend({
  computed: {
    darkTheme: {
      get(): boolean {
        return useSettingsStore().darkTheme
      },
      set(value: boolean) {
        this.update({ darkTheme: value })
      },
    },
    decimalPlaces: {
      get(): number {
        return useSettingsStore().decimalPlaces
      },
      set(value: number) {
        this.update({ decimalPlaces: value })
      },
    },
    displayUnits: {
      get(): UnitOfMeasure {
        return useSettingsStore().displayUnits
      },
      set(value: UnitOfMeasure) {
        this.update({ displayUnits: value })
      },
    },
    language: {
      get(): string {
        return useSettingsStore().language
      },
      set(value: string) {
        this.update({ language: value })
      },
    },
    languages() {
      const result: Array<{ code: string; language: string }> = []
      for (let key in this.$i18n.messages) {
        result.push({
          code: key,
          language: this.$i18n.messages[key].language as string,
        })
      }
      return result
    },
    useBinaryPrefix: {
      get(): boolean {
        return useSettingsStore().useBinaryPrefix
      },
      set(value: boolean) {
        this.update({ useBinaryPrefix: value })
      },
    },
    disableAutoComplete: {
      get(): boolean {
        return useSettingsStore().disableAutoComplete
      },
      set(value: boolean) {
        this.update({ disableAutoComplete: value })
      },
    },
    dashboardMode: {
      get(): DashboardMode {
        if (!useSettingsStore().dashboardMode) {
          return DashboardMode.default
        }
        return useSettingsStore().dashboardMode
      },
      set(value: DashboardMode) {
        this.update({ dashboardMode: value })
      },
    },
    dashboardModes() {
      return Object.entries(DashboardMode).map(([key, value]) => {
        return {
          key,
          value,
        }
      })
    },
    unitsOfMeasure() {
      return Object.entries(UnitOfMeasure).map(([key, value]) => {
        return {
          key,
          value,
        }
      })
    },
    bottomNavigation: {
      get(): boolean {
        return useSettingsStore().bottomNavigation
      },
      set(value: boolean) {
        this.update({ bottomNavigation: value })
      },
    },
    numericInputs: {
      get(): boolean {
        return useSettingsStore().numericInputs
      },
      set(value: boolean) {
        this.update({ numericInputs: value })
      },
    },
    iconMenu: {
      get(): boolean {
        return useSettingsStore().iconMenu
      },
      set(value: boolean) {
        this.update({ iconMenu: value })
      },
    },
  },
  methods: {
    update(data: Partial<SettingsState>) {
      useSettingsStore().update(data)
    },
  },
})
</script>
