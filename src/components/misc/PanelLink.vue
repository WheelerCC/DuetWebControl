<template>
  <a
    v-if="!active"
    href="javascript:void(0)"
    @click="$emit('click', $event)"
  >
    <slot />
  </a>
  <span v-else>
    <slot />
  </span>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	props: {
		active: Boolean
	}
});
</script>

<style scoped>
span {
	cursor: default;
}
</style>
