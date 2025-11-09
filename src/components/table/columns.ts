import i18n from '@/i18n'
import { ColumnDef, createColumnHelper } from '@tanstack/vue-table'
import { ArrowUpDown, FileIcon, FolderOpenIcon } from 'lucide-vue-next'
import { Checkbox } from '../ui/checkbox'
import { FileListItem } from '@duet3d/connectors'
import prettyBytes from 'pretty-bytes'
import { DateTime } from 'luxon'
import { h } from 'vue'
import { ThumbnailInfo } from '@duet3d/objectmodel'


export interface BaseFileListDataTransfer {
	type: string;
	directory: string;
	items: Array<BaseFileListItem>;
}

export function isBaseFileListDataTransfer(data: any): data is BaseFileListDataTransfer {
  return (
    data.type === 'dwcFiles' && typeof data.directory === 'string' && data.items instanceof Array
  )
}

interface ExtraFileListItemOptions {
  filaments?: Array<number>
}
export interface BaseFileListItem extends FileListItem, ExtraFileListItemOptions {}

interface JobListItemProperties {
  height?: number | null
  layerHeight?: number | null
  filament?: number[] | null
  generatedBy?: string | null
  printTime?: number | bigint | null
  simulatedTime?: number | bigint | null
  thumbnails?: ThumbnailInfo[] | null
}
export interface JobListItem extends BaseFileListItem, JobListItemProperties {}

interface MacroListItemProperties {}
export interface MacroListItem extends BaseFileListItem, MacroListItemProperties {}

interface FilamentsListItemProperties {}
export interface FilamentsListItem extends BaseFileListItem, FilamentsListItemProperties {}



const columnHelper = createColumnHelper<JobListItem>()

// TODO doing it this was won't be reactive when language changes but yeah..
export const defaultColumns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        modelValue: table.getIsAllPageRowsSelected()
          ? table.getIsAllPageRowsSelected()
          : table.getIsSomeRowsSelected()
            ? 'indeterminate'
            : false,
        'onUpdate:modelValue': (value) => table.toggleAllPageRowsSelected(!!value),
        ariaLabel: 'Select all',
      }),
    cell: (info) =>
      h(Checkbox, {
        class: 'cursor-pointer',
        modelValue: info.row.getIsSelected(),
        'onUpdate:modelValue': (value) => info.row.toggleSelected(!!value),
        ariaLabel: 'Select row',
        onClick: (e: Event) => e.stopPropagation(),
      }),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor((row) => row.isDirectory, {
    id: 'isDirectory',
    cell: (info) => (info.getValue() ? h(FolderOpenIcon, { size: 18 }) : h(FileIcon, { size: 18 })),
    header: () => i18n.global.t('list.baseFileList.fileType'),
  }),
  columnHelper.accessor((row) => row.name, {
    id: 'name',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.baseFileList.fileName'),
  }),
  columnHelper.accessor((row) => row.size, {
    id: 'size',
    cell: (info) => prettyBytes(info.getValue()),
    header: () => i18n.global.t('list.baseFileList.size'),
  }),
  columnHelper.accessor((row) => row.lastModified, {
    id: 'lastModified',
    cell: (info) => {
      const date = info.getValue()
      return date
        ? DateTime.fromJSDate(date).toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)
        : '?'
    },
    header: () => i18n.global.t('list.baseFileList.lastModified'),
  }),
]