<template>
  <a v-if="!active" href="javascript:void(0)" @click="$emit('click', $event)">
    <slot />
  </a>
  <span v-else>
    <slot />
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  props: {
    active: Boolean,
  },
})
</script>

<style scoped>
span {
  cursor: default;
}
</style>
