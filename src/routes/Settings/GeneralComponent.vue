<template>
  <v-tabs v-model="tab" class="elevation-2 mt-3">
    <!-- <v-tabs-slider />

    <v-tab v-for="(_tab, index) in tabs" :key="index" :href="`#general-tab-${index}`">
      <v-icon v-if="_tab.icon" class="mr-1">
        {{ _tab.icon }}
      </v-icon>
      {{ _tab.translated ? _tab.caption : $t(_tab.caption) }}
    </v-tab>

    <v-tab-item v-for="(_tab, index) in tabs" :key="index" :value="`general-tab-${index}`">
      <component :is="_tab.component" />
    </v-tab-item> -->
  </v-tabs>
</template>

<script lang="ts">
import { GeneralSettingTabs } from '..'

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  data() {
    return {
      tab: 'general-tab-0',
      tabs: GeneralSettingTabs,
    }
  },
})
</script>
