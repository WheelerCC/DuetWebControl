<template>
  <Tabs default-value="machine-tab-0" v-model:model-value="tab">
    <TabsList class="w-full">
      <TabsTrigger v-for="(_tab, index) in tabs" :key="index" :value="`machine-tab-${index}`">
        <component v-if="_tab.icon" :is="_tab.icon" />
        {{ _tab.translated ? _tab.caption : $t(_tab.caption) }}
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="(_tab, index) in tabs" :key="index" :value="`machine-tab-${index}`">
      <component :is="_tab.component" />
    </TabsContent>
  </Tabs>
</template>

<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ref } from 'vue'
import { MachineSettingTabs } from '..'

let tab = ref('machine-tab-0')
let tabs = ref(MachineSettingTabs)
</script>
