<template>
  <Toaster />
  <SidebarProvider style="--sidebar-width: 13rem; --sidebar-width-mobile: 13rem">
    <Sidebar>
      <SidebarHeader>
        <EmergencyBtn />
        <ConnectBtn v-if="showConnectButton" />
        <UploadBtn :target="UploadType.start" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Select
              @update:model-value="
                (payload) => useRootStore().setSelectedMachine(payload as string) // todo proper typing
              "
            >
              <SelectTrigger class="w-full bg-white">
                <SelectValue :placeholder="currentMachineName" />
              </SelectTrigger>
              <SelectContent v-for="machineName in connectedMachines.values" :key="machineName">
                <SelectGroup>
                  <SelectItem :value="machineName"> {{ machineName }} </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <Collapsible
          defaultOpen
          class="group/collapsible"
          v-for="category in Menu"
          :key="category.caption"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                {{ $t(category.caption) }}
                <ChevronDown
                  class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
                />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="subcategory in category.pages" :key="subcategory.caption">
                    <SidebarMenuButton as-child>
                      <router-link :to="subcategory.path">
                        <component :is="subcategory.icon" />
                        <span>{{ $t(subcategory.caption) }}</span>
                      </router-link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu class="m-2">
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              <MoonIcon
                class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
              />
              <SunIcon
                class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
              />
              <span class="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-full">
            <DropdownMenuItem @click="mode = 'light'"> Light </DropdownMenuItem>
            <DropdownMenuItem @click="mode = 'dark'"> Dark </DropdownMenuItem>
            <DropdownMenuItem @click="mode = 'auto'"> System </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
    <main class="w-full overflow-x-hidden">
      <!-- <CodeInput /> -->
      <ConnectDialog />
      <ConnectionDialog />

      <!-- <SidebarTrigger /> -->
      <div class="m-2">
        <FFFContainerPanel v-if="isFFForUnset" />
        <CNCContainerPanel v-else />
      </div>
      <Separator class="" />

      <router-view v-slot="{ Component }" class="w-full p-2">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </SidebarProvider>

  <!-- 
    <v-bottom-navigation v-if="showBottomNavigation" app>
      <v-menu v-for="(category, index) in categories" :key="index" top offset-y>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :prepend-icon="category.icon"
            :title="category.translated ? category.caption : $t(category.caption)"
          />
        </template>

        <v-list-item
          v-for="(page, pageIndex) in getPages(category)"
          :key="`${index}-${pageIndex}`"
          :to="page.path"
          class="global-control"
          :prepend-icon="page.icon"
          :title="page.translated ? page.caption : $t(page.caption)"
        />
      </v-menu>
    </v-bottom-navigation> -->

  <!-- <file-transfer-dialog /> -->
  <!-- <message-box-dialog /> -->
  <!-- <plugin-install-dialog /> -->
  <!-- <incompatible-versions-dialog /> -->
  <!-- <component :is="component" v-for="component in injectedComponentNames" :key="component" /> -->
</template>

<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarFooter, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import 'vue-sonner/style.css' // vue-sonner v2 requires this import
import ConnectDialog from './components/dialogs/ConnectDialog.vue'
import ConnectionDialog from './components/dialogs/ConnectionDialog.vue'
import { useRootStore } from './stores'

let { isConnected, isConnecting, isDisconnecting } = storeToRefs(useRootStore())
let { dashboardMode } = storeToRefs(useSettingsStore())
let { state } = storeToRefs(useMachinesModelStore())

watch(isConnected, (newVal, oldVal) => {
  console.log(`isConnected changed from ${oldVal} to ${newVal}`)
})
watch(isConnecting, (newVal, oldVal) => {
  console.log(`isConnected changed from ${oldVal} to ${newVal}`)
})
watch(isDisconnecting, (newVal, oldVal) => {
  console.log(`isConnected changed from ${oldVal} to ${newVal}`)
})

let isFFForUnset = computed(() => {
  if (dashboardMode.value === DashboardMode.default) {
    return !state.value.machineMode || state.value.machineMode === MachineMode.fff
  }
  return dashboardMode.value === DashboardMode.fff
})

import { MachineMode } from '@duet3d/objectmodel'

import { useMachinesModelStore } from '@/stores/machineModel'
import { DashboardMode, useSettingsStore } from '@/stores/settings'
import CNCContainerPanel from './components/layout/control/status/CNCContainerPanel.vue'
import FFFContainerPanel from './components/layout/control/status/FFFContainerPanel.vue'
import { Separator } from './components/ui/separator'

import { ChevronDown, MoonIcon, SunIcon } from 'lucide-vue-next'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

import ConnectBtn from '@/components/buttons/ConnectBtn.vue'
import UploadBtn, { UploadType } from '@/components/buttons/UploadBtn.vue'
import { Menu } from '@/routes'
import { useMachinesStore } from '@/stores/machines'

// const showConnectButton = true
const showConnectButton = process.env.NODE_ENV === 'development'

let { network } = useMachinesModelStore()
let { connectedMachines } = useMachinesStore()

const currentMachineName = computed(() => {
  return network.name
})

import { useColorMode } from '@vueuse/core'
import EmergencyBtn from './components/buttons/EmergencyBtn.vue'
import { Button } from './components/ui/button'

const mode = useColorMode({ disableTransition: false })

// impor t { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

// import { log } from '@/utils/logging'
// import ObjectModel, { MachineMode, MachineStatus } from '@duet3d/objectmodel'
// import Piecon from 'piecon'
// import { defineComponent } from 'vue'
// import { NavigationGuardNext, RouteLocationNormalized as Route } from 'vue-router'

// import { Menu, MenuCategory, MenuItem, Routes } from '@/routes'

// import { isPrinting } from '@/utils/enums'
// import { useRootStore } from './stores'
// import { useMachinesModelStore } from './stores/machineModel'
// import { useMachinesStore } from './stores/machines'
// import { DashboardMode, useSettingsStore } from './stores/settings'
// import { useUIInjectionStore } from './stores/uiInjection'
// import { LogType } from './utils/logging'
// import ConnectBtn from './components/buttons/ConnectBtn.vue'
// import UploadBtn from './components/buttons/UploadBtn.vue'
// import CodeInput from './components/inputs/CodeInput.vue'
// import EmergencyBtn from './components/buttons/EmergencyBtn.vue'
// import NotificationDisplay from './components/misc/NotificationDisplay.vue'
// import ConnectDialog from './components/dialogs/ConnectDialog.vue'
// import ConnectionDialog from './components/dialogs/ConnectionDialog.vue'
// import MessageBoxDialog from './components/dialogs/MessageBoxDialog.vue'
// import FFFContainerPanel from './components/panels/FFFContainerPanel.vue'
// import CNCContainerPanel from './components/panels/CNCContainerPanel.vue'
// import FirmwareUpdateDialog from './components/dialogs/FirmwareUpdateDialog.vue'
// import ConfigUpdatedDialog from './components/dialogs/ConfigUpdatedDialog.vue'

// export default defineComponent({
//   compatConfig: { MODE: 3, COMPONENT_ASYNC: false },
//   data() {
//     return {
//       // drawer: useDisplay().lgAndUp,
//       injectedComponentNames: [] as string[],
//       showConnectButton: process.env.NODE_ENV === 'development',
//     }
//   },
//   components: {
//     ConnectBtn,
//     UploadBtn,
//     CodeInput,
//     EmergencyBtn,
//     FFFContainerPanel,
//     CNCContainerPanel,
//     NotificationDisplay,
//     ConnectDialog,
//     ConnectionDialog,
//     MessageBoxDialog,
//     FirmwareUpdateDialog,
//     ConfigUpdatedDialog,
//   },
//   computed: {
//     name(): string {
//       return useMachinesModelStore().network.name
//     },
//     isConnecting(): boolean {
//       return useRootStore().isConnecting || useMachinesStore().isReconnecting
//     },
//     status(): MachineStatus {
//       return useMachinesModelStore().state.status
//     },
//     iconMenu(): boolean {
//       return useSettingsStore().iconMenu
//     },
//     jobProgress(): number {
//       return useMachinesModelStore().jobProgress(null)
//     },
//     injectedComponents() {
//       return useUIInjectionStore().injectedComponents
//     },
//     model(): ObjectModel {
//       return useMachinesModelStore()[useRootStore().selectedMachine] as ObjectModel
//     },
//     categories(): Array<MenuCategory> {
//       return Object.keys(Menu)
//         .map((key) => Menu[key])
//         .filter((item) => item.pages.some((page) => page.condition))
//     },
//     currentPageCondition(): boolean {
//       const currentRoute = this.$route
//       let checkRoute = (route: MenuItem, isChild = false) => {
//         let flag = route.path === currentRoute.path && route.condition
//         if (!flag && isChild) {
//           let curPath = currentRoute.path.replace(/\/$/, '')
//           if (curPath.endsWith(route.path))
//             flag =
//               curPath.substring(0, curPath.length - route.path.length) + route.path === curPath &&
//               route.condition
//         }
//         return flag
//       }
//       return Routes.some((route) => checkRoute(route as MenuItem))
//     },
//     darkTheme(): boolean {
//       return useSettingsStore().darkTheme
//     },
//     isFFForUnset(): boolean {
//       if (useSettingsStore().dashboardMode === DashboardMode.default) {
//         return !this.model.state.machineMode || this.model.state.machineMode === MachineMode.fff
//       }
//       return useSettingsStore().dashboardMode === DashboardMode.fff
//     },
//     showBottomNavigation(): boolean {
//       return useSettingsStore().bottomNavigation
//     },
//     doNotSwitchToStatusPanelOnJobStart(): boolean {
//       return useSettingsStore().behaviour.jobStart
//     },
//     bottomMargin(): number {
//       return useRootStore().bottomMargin
//     },
//   },
//   watch: {
//     currentPageCondition(to: boolean) {
//       if (!to) {
//         this.$router.push('/')
//       }
//     },
//     darkTheme(to: boolean) {
//       useTheme().change(to ? 'dark' : 'light')
//     },
//     isConnecting(to: boolean) {
//       if (!to && useMachinesModelStore().volumes.length > 0) {
//         const firstVolume = useMachinesModelStore().volumes[0]
//         if (
//           firstVolume.capacity !== null &&
//           firstVolume.freeSpace !== null &&
//           firstVolume.capacity > 268435456 &&
//           (firstVolume.freeSpace as number) / (firstVolume.capacity as number) < 0.05
//         ) {
//           // 256 MiB
//           // Report a warning if less than 5% free space is available
//           log(
//             LogType.warning,
//             this.$t('notification.freeSpaceWarning.title'),
//             this.$t('notification.freeSpaceWarning.message'),
//           )
//         }
//       }
//     },
//     status(to: MachineStatus, from: MachineStatus) {
//       if (to === MachineStatus.disconnected || from === MachineStatus.disconnected) {
//         this.updateTitle()
//       }

//       const printing = isPrinting(to)
//       if (printing !== isPrinting(from)) {
//         if (printing) {
//           // Go to Job Status when a print starts
//           if (
//             this.$router.currentRoute.value.path !== '/Job/Status' &&
//             !this.doNotSwitchToStatusPanelOnJobStart
//           ) {
//             this.$router.push('/Job/Status')
//           }
//         } else {
//           // Remove the Piecon again when the print has finished
//           Piecon.reset()
//         }
//       }
//     },
//     name() {
//       this.updateTitle()
//     },
//     jobProgress(to: number, from: number) {
//       if (isPrinting(this.status) && Math.round(to * 100) !== Math.round(from * 100)) {
//         Piecon.setProgress(to * 100)
//       }
//       this.updateTitle()
//     },
//     injectedComponents: {
//       handler(val, _) {
//         for (const item of val) {
//           if (!this.injectedComponentNames.includes(item.name)) {
//             ;(this.$options as any).components[item.name] = item.component
//             this.injectedComponentNames.push(item.name)
//           }
//         }
//       },
//       deep: true,
//     },
//   },
//   mounted() {
//     // Attempt to disconnect from every machine when the page is being unloaded
//     window.addEventListener('unload', () => useRootStore().disconnectAll())

//     // Connect if running on a board
//     if (process.env.NODE_ENV === 'production') {
//       useRootStore().connect()
//     }

//     // Attempt to load the settings
//     useSettingsStore().load()

//     // Validate navigation
//     this.$router.beforeEach((to: Route, from: Route, next: NavigationGuardNext) => {
//       if (Routes.some((route) => route.path === to.path && !(route as MenuItem).condition)) {
//         next('/')
//       } else {
//         next()
//       }
//     })

//     // Set up Piecon
//     Piecon.setOptions({
//       color: '#00f', // Pie chart color
//       background: '#bbb', // Empty pie chart color
//       shadow: '#fff', // Outer ring color
//       fallback: false, // Toggles displaying percentage in the title bar (possible values - true, false, 'force')
//     })
//   },
//   methods: {
//     useRootStore,
//     useDisplay,
//     isExpanded(category: MenuCategory): boolean {
//       // if (this.$vuetify.display.smAndDown) {
//       //   const route = this.$route
//       //   return category.pages.some((page) => page.path === route.path)
//       // }
//       return true
//     },
//     getPages(category: MenuCategory): Array<MenuItem> {
//       return category.pages.filter((page) => page.condition)
//     },
//     updateTitle(): void {
//       if (this.status === MachineStatus.disconnected) {
//         document.title = `(${this.name})`
//       } else {
//         const jobProgress = this.jobProgress
//         const title =
//           (jobProgress > 0 && isPrinting(this.status)
//             ? `(${(jobProgress * 100).toFixed(1)}%) `
//             : '') + this.name
//         if (document.title !== title) {
//           document.title = title
//         }
//       }
//     },
//   },
// })
</script>
