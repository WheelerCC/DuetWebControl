<template>
  <Table v-if="table" class="w-full">
    <TableHeader>
      <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
        <TableHead
          v-for="header in headerGroup.headers"
          :key="header.id"
          :colSpan="header.colSpan"
          :class="header.column.getCanSort() ? 'cursor-pointer select-none' : ''"
          @click="header.column.getToggleSortingHandler()?.($event)"
        >
          <FlexRender
            v-if="!header.isPlaceholder"
            :render="header.column.columnDef.header"
            :props="header.getContext()"
          />

          <component
            class="inline ml-1 mb-0.5"
            :is="
              { asc: h(ArrowUp, { size: 16 }), desc: h(ArrowDown, { size: 16 }) }[
                header.column.getIsSorted() as string
              ]
            "
          />
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow
        v-for="row in table.getRowModel().rows"
        :key="row.id"
        @click="emit('itemClick', row.original)"
      >
        <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
          <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
        </TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow v-for="footerGroup in table.getFooterGroups()" :key="footerGroup.id">
        <th v-for="header in footerGroup.headers" :key="header.id" :colSpan="header.colSpan">
          <FlexRender
            v-if="!header.isPlaceholder"
            :render="header.column.columnDef.footer"
            :props="header.getContext()"
          />
        </th>
      </TableRow>
    </TableFooter>
  </Table>

  <!-- <div class="border rounded-md max-w-full">
    <Table class="max-w-full overflow-clip">
      <TableHeader>
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead v-for="header in headerGroup.headers" :key="header.id">
            <FlexRender
              class="cursor-pointer"
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="table.getRowModel().rows?.length">
          <TableRow
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="cursor-pointer"
            :data-state="row.getIsSelected() ? 'selected' : undefined"
            @click="emit('itemClick', row.original)"
          > -->
  <!-- the ordering here is extremely finicky -->
  <!-- <ContextMenu
              asChild
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              @update:open="
                (opened) => {
                  console.log(`${row.id} - ${opened}`)
                  if (opened) {
                    rightClickedItem = {
                      name: row.original['name'],
                      isDir: row.original['isDirectory'],
                    }
                  } else if (
                    rightClickedItem?.name == row.original['name'] &&
                    rightClickedItem?.isDir == row.original['isDir']
                  ) {
                    rightClickedItem = null
                  }
                  console.log(`${row.id} - ${opened} - ${rightClickedItem?.name}`)
                }
              "
            >
              <ContextMenuTrigger asChild>
                <TableCell :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </ContextMenuTrigger>
              <slot name="contextmenu"></slot>
            </ContextMenu>
          </TableRow>
        </template>
        <template v-else>
          <TableRow>
            <TableCell :colspan="columns?.length" class="h-24 text-center"> No results. </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div> -->
</template>

<script setup lang="ts">
import type {
  AccessorFnColumnDef,
  DisplayColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'

import { valueUpdater } from '@/lib/utils'
import { ArrowDown, ArrowUp } from 'lucide-vue-next'
import { h, ref } from 'vue'
import { TableBody, TableCell, TableFooter, TableHead } from '../ui/table'
import Table from '../ui/table/Table.vue'
import TableHeader from '../ui/table/TableHeader.vue'
import TableRow from '../ui/table/TableRow.vue'
import { JobListItem, MacroListItem } from './columns'

const data = defineModel<JobListItem[]>('data', { required: true })
// const rightClickedItem = defineModel<{ name: string; isDir: boolean } | null>('rightClickedItem')
// const directory = defineModel<string>('directory', { required: true })
// const loading = defineModel<boolean>('loading', { required: true })
// const selection = defineModel<{ name: string; isDir: boolean }[]>('selection', { required: true })
// const innerValue = defineModel<BaseFileListItem[]>('innerValue', { required: true })
// const sortBy = defineModel<string>('sort-by', { required: true })
// const sortDesc = defineModel<boolean>('sort-desc', { required: true })
// const rightClickedItem = defineModel<{ name: string; isDir: boolean } | null>('rightClickedItem', {
//   required: true,
// })
const rowSelection = defineModel<{ [rowNumber: string]: boolean }>('rowSelection', {
  required: true,
})
const emit = defineEmits(['itemClick'])
const { columns } = defineProps<{
  columns: (
    | AccessorFnColumnDef<JobListItem, any>
    | AccessorFnColumnDef<MacroListItem, any>
    | DisplayColumnDef<JobListItem, any>
    | DisplayColumnDef<MacroListItem, any>
  )[]
  loading: boolean
  customSort
}>()

const sorting = ref<SortingState>([])
const columnVisibility = ref<VisibilityState>({})

let table = useVueTable({
  data: data,
  // get columns() {
  //   return columns
  // },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
  onColumnVisibilityChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),

  state: {
    get sorting() {
      return sorting.value
    },
    get columnVisibility() {
      return columnVisibility.value
    },
    get rowSelection() {
      return rowSelection.value
    },
  },
})
</script>
