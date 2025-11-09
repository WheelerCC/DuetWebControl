<template>
  <v-tabs v-model="tab" class="elevation-2 mt-3">
    <!-- <v-tabs-slider />

    <v-tab v-for="(_tab, index) in tabs" :key="index" :href="`#machine-tab-${index}`">
      <v-icon v-if="_tab.icon" class="mr-1">
        {{ _tab.icon }}
      </v-icon>
      {{ _tab.translated ? _tab.caption : $t(_tab.caption) }}
    </v-tab>

    <v-tab-item v-for="(_tab, index) in tabs" :key="index" :value="`machine-tab-${index}`">
      <component :is="_tab.component" />
    </v-tab-item> -->
  </v-tabs>
</template>

<script lang="ts">
import { MachineSettingTabs } from '..'

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  data() {
    return {
      tab: 'machine-tab-0',
      tabs: MachineSettingTabs,
    }
  },
})
</script>
