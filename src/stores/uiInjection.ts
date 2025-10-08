import { Module } from 'vuex'

import { ContextMenuType } from '@/plugins'

import { Component } from 'vue'

export interface ContextMenuItem {
  /**
   * Target of this context menu item
   */
  contextMenuType: ContextMenuType

  /**
   * Icon of this menu item
   */
  icon: string

  /**
   * Caption of this menu item
   */
  name: string | (() => string)

  /**
   * Optional path for this menu item
   */
  path?: string

  /**
   * Global event to trigger on click
   */
  action: string
}

export interface injectedComponent {
  /**
   * Name of the injected component
   */
  name: string

  /**
   * Component definition
   */
  component: Component
}

export interface UiInjectionState {
  /**
   * List of registered context menu items
   */
  contextMenuItems: {
    /**
     * Context menu items for the job file list
     */
    jobFileList: Array<ContextMenuItem>
  }

  /**
   * List of components to render on the main app component
   */
  injectedComponents: Array<injectedComponent>
}

import { defineStore } from 'pinia'

export const useUIInjectionStore = defineStore({
  id: 'uiInjection',
  state: (): UiInjectionState => ({
    contextMenuItems: {
      jobFileList: [],
    },
    injectedComponents: [],
  }),
  getters: {},
  actions: {
    registerPluginContextMenuItem(payload: ContextMenuItem) {
      if (payload.contextMenuType !== 'jobFileList') {
        throw Error('invalid menu name')
      }

      if (payload.name instanceof Function) {
        Object.defineProperty(payload, 'name', {
          get: payload.name,
        })
      }
      this.contextMenuItems[payload.contextMenuType].push(payload)
    },
    injectComponent(payload) {
      this.injectedComponents.push(payload)
    },
  },
})
