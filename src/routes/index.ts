import { Component, nextTick, reactive } from 'vue'
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'

import Console from '@/routes/Control/ConsoleComponent.vue'
import Dashboard from '@/routes/Control/DashboardComponent.vue'

import Filaments from '@/routes/Files/FilamentsComponent.vue'
import Jobs from '@/routes/Files/JobsComponent.vue'
import Macros from '@/routes/Files/MacrosComponent.vue'
import System from '@/routes/Files/SystemComponent.vue'

import JobStatus from '@/routes/Job/StatusComponent.vue'
import Webcam from '@/routes/Job/WebcamComponent.vue'

import General from '@/routes/Settings/GeneralComponent.vue'
import Machine from '@/routes/Settings/MachineComponent.vue'
import Plugins from '@/routes/Settings/PluginsComponent.vue'

// import { useMachinesModelStore } from '@/stores/machineModel'
// import { useSettingsStore } from '@/stores/settings'
import Page404 from '@/routes/Page404Component.vue'

/**
 * Menu item
 */
export interface MenuItem {
  /**
   * Icon of the menu item
   */
  icon: Component

  /**
   * Caption of the menu item
   */
  caption: string

  /**
   * Whether the menu caption is already translated (defaults to false)
   */
  translated?: boolean

  /**
   * Path of the route to navigate to on click
   */
  path: string

  /**
   * Condition stating if the menu item is visible (defaults to true)
   */
  condition?: boolean | (() => boolean)

  /**
   * Component to render on selection
   */
  component: Component
}

/**
 * Menu category
 */
export interface MenuCategory {
  /**
   * Category icon
   */
  icon: Component

  /**
   * Category caption
   */
  caption: string

  /**
   * List of pages
   */
  pages: Array<MenuItem>

  /**
   * Whether the category name is already translated
   */
  translated: boolean
}
import { ChevronDown, Settings, ChartLine, LayoutDashboard, Code, Info, Save, Printer, SlidersHorizontal, Database, Play, Disc, FileCode, Wrench, Blocks, Puzzle, Bug, Plug, Camera } from 'lucide-vue-next'
import { useMachinesModelStore } from '@/stores/machineModel'
import { MachineMode } from '@duet3d/objectmodel'
import DebugComponent from './Settings/DebugComponent.vue'

/**
 * Actual menu structure (name vs. category descriptor)
 */
export const Menu = reactive<Record<string, MenuCategory>>({
  Control: {
    icon: SlidersHorizontal,
    caption: 'menu.control.caption',
    pages: [
      {
        icon: LayoutDashboard,
        caption: 'menu.control.dashboard',
        path: '/',
        component: Dashboard,
      },
      {
        icon: Code,
        caption: 'menu.control.console',
        path: '/Console',
        component: Console,
      },
    ],
    translated: false,
  },
  Job: {
    icon: Printer,
    caption: 'menu.job.caption',
    pages: [
      {
        icon: Info,
        caption: 'menu.job.status',
        path: '/Job/Status',
        component: JobStatus,
      },
      {
        icon: Camera,
        caption: 'menu.job.webcam',
        path: '/Job/Webcam',
        component: Webcam,
      },
    ],
    translated: false,
  },
  Files: {
    icon: Save,
    caption: 'menu.files.caption',
    pages: [
      {
        icon: Disc,
        caption: 'menu.files.filaments',
        path: '/Files/Filaments',
        condition: () =>
          !useMachinesModelStore().state.machineMode ||
          useMachinesModelStore().state.machineMode === MachineMode.fff,
        component: Filaments,
      },
      {
        icon: Play,
        caption: 'menu.files.jobs',
        path: '/Files/Jobs',
        component: Jobs,
      },
      {
        icon: FileCode,
        caption: 'menu.files.macros',
        path: '/Files/Macros',
        component: Macros,
      },
      {
        icon: Settings,
        caption: 'menu.files.system',
        path: '/Files/System',
        component: System,
      },
    ],
    translated: false,
  },
  Settings: {
    icon: Wrench,
    caption: 'menu.settings.caption',
    pages: [
      {
        icon: SlidersHorizontal,
        caption: 'menu.settings.general',
        path: '/Settings/General',
        component: General,
      },
      {
        icon: Settings,
        caption: 'menu.settings.machine',
        path: '/Settings/Machine',
        component: Machine,
      },
      {
        icon: Plug,
        caption: 'menu.plugins.caption',
        path: '/Settings/Plugins',
        component: Plugins,
      },
      // TODO internationalisation
      {
        icon: Bug,
        caption: 'menu.settings.debug',
        path: '/Settings/Debug',
        component: DebugComponent,
      },
    ],
    translated: false,
  },
  Plugins: {
    icon: Puzzle,
    caption: 'menu.plugins.caption',
    pages: [],
    translated: false,
  },
})

/**
 * Registered routes
 */
export const Routes: Array<RouteRecordRaw> = []

/**
 * Register a new menu category
 * @param name Name of the category
 * @param icon Icon of the category
 * @param caption Caption to show in the menu
 * @param translated Whether the caption is already translated
 */
export async function registerCategory(
  name: string,
  icon: Component,
  caption: string | (() => string),
  translated = false,
) {
  if (Menu[name] === undefined) {
    const category: MenuCategory = {
      caption: caption as string,
      icon,
      pages: [],
      translated,
    }

    if (caption instanceof Function) {
      Object.defineProperty(category, 'caption', {
        get: caption,
      })
    }

    Menu[name] = category
    await nextTick() // wait for the DOM to be updated so that more routes can be added safely
  }
}

/**
 * Register a new route and menu item
 * @param component Component to register
 * @param route Route element
 */
export function registerRoute(
  component: Component,
  route: {
    [category: string]: {
      [name: string]: Omit<MenuItem, 'component'> & { caption: string | (() => string) }
    }
  },
) {
  const category = Object.keys(route)[0],
    menuCategory = Menu[category],
    routeCategory = route[category]
  const name = Object.keys(routeCategory)[0],
    menuItem = route[category][name]

  // Make a new route item
  const routeObj: MenuItem = {
    ...menuItem,
    component,
  }

  // Prepare the actual route object
  if (typeof routeObj.caption !== 'string') {
    Object.defineProperty(routeObj, 'caption', {
      get: menuItem.caption as () => string,
    })
  }

  if (routeObj.condition === undefined) {
    routeObj.condition = true
  } else if (routeObj.condition instanceof Function) {
    Object.defineProperty(routeObj, 'condition', {
      get: menuItem.condition as () => boolean,
    })
  }

  if (routeObj.translated === undefined) {
    routeObj.translated = false
  }

  // Register the new route
  menuCategory.pages.push(routeObj)
  Routes.push(routeObj)
  router.addRoute(routeObj)
}

/**
 * Type of registered tab items
 */
interface TabItem {
  /**
   * Tab caption
   */
  caption: string

  /**
   * Optional tab icon
   */
  icon?: string

  /**
   * Name of the Vue component
   */
  component: string

  /**
   * Whether the tab caption is already translated (defaults to false)
   */
  translated: boolean
}

/**
 * Tab items in the general settings
 */
export const GeneralSettingTabs = reactive<Array<TabItem>>([
  {
    caption: 'tabs.generalSettings.caption',
    component: 'settings-general-tab',
    translated: false,
    // icon: ,
  },
])

/**
 * Tab items in the machine settings
 */
export const MachineSettingTabs = reactive<Array<TabItem>>([
  {
    caption: 'tabs.machineSettings.caption',
    component: 'settings-machine-tab',
    translated: false,
    // icon: ,
  },
])

/**
 * Router instance
 */
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: Routes,
})

for (const category in Menu) {
  for (const page of Menu[category].pages) {
    if (page.condition === undefined) {
      page.condition = true
    } else if (page.condition instanceof Function) {
      Object.defineProperty(page, 'condition', {
        get: page.condition as () => boolean,
      })
    }

    router.addRoute(page)
    Routes.push(page)
  }
}

router.addRoute({
  path: '/:pathMatch(.*)*',
  name: 'NotFound',
  component: Page404,
})

export default router
