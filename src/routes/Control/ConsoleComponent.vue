<template>
  <div class="flex flex-col">
    <CodeInput />

    <EventList />
  </div>
</template>

<script setup lang="ts">
import CodeInput from '@/components/inputs/CodeInput.vue'
import EventList from '@/components/lists/EventList.vue'

import { useRootStore } from '@/stores'

import { onActivated, onDeactivated } from 'vue'

onActivated(() => {
  useRootStore().hideCodeReplyNotifications = true
})
onDeactivated(() => {
  useRootStore().hideCodeReplyNotifications = false
})
</script>
