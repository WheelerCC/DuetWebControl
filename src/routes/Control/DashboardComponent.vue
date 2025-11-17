<template>
  <div class="grid grid-cols-4 gap-2">
    <FFFDashboardPanel v-if="isFFForUnset" />
    <CNCDashboardPanel v-else />
  </div>
</template>

<script setup lang="ts">
import CNCDashboardPanel from '@/components/layout/control/dashboard/CNCDashboardPanel.vue'
import FFFDashboardPanel from '@/components/layout/control/dashboard/FFFDashboardPanel.vue'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

// a computed ref
let { isFFForUnset } = storeToRefs(useSettingsStore())
</script>
