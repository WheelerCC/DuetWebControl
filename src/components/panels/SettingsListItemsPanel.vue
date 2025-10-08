<template>
  <v-card outlined>
    <v-tabs>
      <!-- Tab Titles-->
      <v-tab>
        {{ $t('panel.settingsListItems.toolTemperatures') }}
      </v-tab>
      <v-tab>
        {{ $t('panel.settingsListItems.bedTemperatures') }}
      </v-tab>
      <v-tab>
        {{ $t('panel.settingsListItems.chamberTemperatures') }}
      </v-tab>
      <v-tab>
        {{ $t('panel.settingsListItems.spindleRPM') }}
      </v-tab>

      <!-- Tab Contents-->
      <v-tab-item class="pa-3">
        <list-editor item-key="tool" temperature />
      </v-tab-item>
      <v-tab-item class="pa-3">
        <list-editor item-key="bed" temperature />
      </v-tab-item>
      <v-tab-item class="pa-3">
        <list-editor item-key="chamber" temperature />
      </v-tab-item>
      <v-tab-item class="pa-3">
        <list-editor item-key="spindleRPM" />
      </v-tab-item>
    </v-tabs>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({})
</script>
