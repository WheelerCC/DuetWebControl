<template>
  <v-card outlined>
    <v-card-title class="pb-0">
      {{ $t('panel.settingsMachine.caption') }}
    </v-card-title>

    <v-card-text>
      <v-row :dense="$vuetify.display.mobile">
        <v-col cols="12" lg="6">
          <v-text-field
            v-model.number="babystepAmount"
            type="number"
            step="any"
            min="0.001"
            :label="$t('panel.settingsMachine.babystepAmount', ['mm'])"
            hide-details
          />
        </v-col>
        <v-col cols="12">
          <v-switch
            v-model="checkVersions"
            :label="$t('panel.settingsMachine.checkVersions')"
            hide-details
          />
        </v-col>
        <v-col cols="12" lg="6">
          <v-text-field
            v-model.number="moveFeedrate"
            type="number"
            step="any"
            min="0.001"
            :label="$t('panel.settingsMachine.moveFeedrate', ['mm/min'])"
            hide-details
          />
        </v-col>
        <v-col cols="12">
          <v-autocomplete
            v-model="toolChangeMacros"
            :items="toolChangeMacroList"
            chips
            clearable
            :label="$t('panel.settingsMachine.toolChangeMacros')"
            multiple
            hide-details
          >
            <template #selection="{ attrs, item, select, selected }">
              <v-chip
                v-bind="attrs"
                :input-value="selected"
                close
                @click="select"
                @click:close="removeToolChangeMacro(item.value)"
              >
                {{ item.text }}
              </v-chip>
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="12">
          <v-switch
            v-model="groupTools"
            :label="$t('panel.settingsAppearance.groupTools')"
            hide-details
          />
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="singleBedControl"
            :label="$t('panel.settingsAppearance.singleBedControl')"
            hide-details
          />
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="singleChamberControl"
            :label="$t('panel.settingsAppearance.singleChamberControl')"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import {
  MachineSettingsState,
  ToolChangeMacro,
  useMachinesSettingsStore,
} from '@/stores/machineSettings'

import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      toolChangeMacroList: [
        {
          text: 'tfree.g',
          value: ToolChangeMacro.free,
        },
        {
          text: 'tpre.g',
          value: ToolChangeMacro.pre,
        },
        {
          text: 'tpost.g',
          value: ToolChangeMacro.post,
        },
      ],
    }
  },
  computed: {
    babystepAmount: {
      get(): number {
        return useMachinesSettingsStore().babystepAmount
      },
      set(value: number) {
        if (isFinite(value) && value > 0) {
          this.update({ babystepAmount: value })
        }
      },
    },
    checkVersions: {
      get(): boolean {
        return useMachinesSettingsStore().checkVersions
      },
      set(value: boolean) {
        this.update({ checkVersions: value })
      },
    },
    moveFeedrate: {
      get(): number {
        return useMachinesSettingsStore().moveFeedrate
      },
      set(value: number) {
        if (isFinite(value) && value > 0) {
          this.update({ moveFeedrate: value })
        }
      },
    },
    toolChangeMacros: {
      get(): Array<ToolChangeMacro> {
        return useMachinesSettingsStore().toolChangeMacros
      },
      set(value: Array<ToolChangeMacro>) {
        this.update({ toolChangeMacros: value })
      },
    },
    groupTools: {
      get(): boolean {
        return useMachinesSettingsStore().groupTools
      },
      set(value: boolean) {
        this.update({ groupTools: value })
      },
    },
    singleBedControl: {
      get(): boolean {
        return useMachinesSettingsStore().singleBedControl
      },
      set(value: boolean) {
        this.update({ singleBedControl: value })
      },
    },
    singleChamberControl: {
      get(): boolean {
        return useMachinesSettingsStore().singleChamberControl
      },
      set(value: boolean) {
        this.update({ singleChamberControl: value })
      },
    },
  },
  methods: {
    update(data: Partial<MachineSettingsState>) {
      useMachinesSettingsStore().update(data)
    },
    removeToolChangeMacro(item: ToolChangeMacro) {
      this.toolChangeMacros = this.toolChangeMacros.filter((macro) => macro !== item)
    },
  },
})
</script>
