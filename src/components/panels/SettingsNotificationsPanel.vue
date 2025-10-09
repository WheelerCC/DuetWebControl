<template>
  <v-card outlined>
    <v-card-title>
      {{ $t('panel.settingsNotifications.caption') }}
    </v-card-title>

    <v-card-text>
      <v-row>
        <v-col cols="6" xs="12">
          <v-switch
            v-model="notificationErrorsPersistent"
            class="mt-0 mb-3"
            :label="$t('panel.settingsNotifications.notificationErrorsPersistent')"
            hide-details
          />
        </v-col>
        <v-col cols="6" xs="12">
          <v-text-field
            v-model.number="notificationTimeout"
            type="number"
            step="any"
            min="0"
            :label="$t('panel.settingsNotifications.notificationTimeout', ['ms'])"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { SettingsState, useSettingsStore } from '@/stores/settings'

import { defineComponent } from 'vue'

export default defineComponent({
  computed: {
    notificationErrorsPersistent: {
      get(): boolean {
        return useSettingsStore().notifications.errorsPersistent
      },
      set(value: boolean) {
        this.update({ errorsPersistent: value })
      },
    },
    notificationTimeout: {
      get(): number {
        return useSettingsStore().notifications.timeout
      },
      set(value: number) {
        if (isFinite(value) && value >= 0) {
          this.update({ timeout: value })
        }
      },
    },
  },
  methods: {
    update(data: Partial<SettingsState['notifications']>) {
      useSettingsStore().update({ notifications: data })
    },
  },
})
</script>
