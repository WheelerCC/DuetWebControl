<template>
  <Tabs default-value="general-tab-0" v-model:model-value="tab">
    <TabsList class="w-full">
      <TabsTrigger v-for="(_tab, index) in tabs" :key="index" :value="`general-tab-${index}`">
        <component v-if="_tab.icon" :is="_tab.icon" />
        {{ _tab.translated ? _tab.caption : $t(_tab.caption) }}
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="(_tab, index) in tabs" :key="index" :value="`general-tab-${index}`">
      <component :is="_tab.component" />
    </TabsContent>
  </Tabs>
</template>

<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeneralSettingTabs } from '..'

import { ref } from 'vue'

let tab = ref('general-tab-0')
let tabs = ref(GeneralSettingTabs)
</script>
