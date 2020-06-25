<template>
<div style="display: contents">
  <resizable-panel :module="module.detailPanel" style="position: relative"
    mainClass="data-view" resizeClass="detail-viewer">

    <template v-slot:main>
      <div class="table-scroll-container" ref="scrollContainer">
        <div class="table" :style="{
          '--pinnedColumnWidths': columnGridWidths.pinned,
          '--rowsCount': rows.length,
          'grid-template-columns': `auto ${columnGridWidths.columns} 1fr`
        }" tabindex="0" @keydown="moveSelection">
          <div class="pinned-columns" :style="{'z-index': columns.columns.length+1}">
            <div class="row headers">
              <div class="cell header line-no"></div>
              <div class="cell header" v-for="column, i in columns.pinned" ref="pinnedHeaders"
                :style="{'z-index': columns.pinned.length-i}">
                <div class="colname">
                  <span>{{ column.name }}</span>
                  <span class="col-type">{{ colTypeNames[column.name] }}</span>
                </div>
                <div class="icons">
                  <icon name="pin" @click="toggleColumnPin(column.name)" />
                  <div v-if="column.kind === 'property'" class="sort-icon" @click="toggleColumnSort($event, column.name)">
                    <icon :name="sortedCols[column.name] ? 'sort-asc' : 'sort'" 
                      :style="{
                        transform: sortedCols[column.name] &&
                          sortedCols[column.name].dir === 'DESC' ? 'rotate(180deg)' : 'none'
                      }" :class="{
                        'icon-hide': !sortedCols[column.name]
                      }" />
                      <span v-if="sortedCols[column.name]">{{ sortedCols[column.name].index || '' }}</span>
                  </div>
                </div>
                <div class="header-resizer"
                  @mousedown="startColResize($event, column.name, i, true)"></div>
              </div>
            </div>
            <render-columns :rows="rows" :columns="columns.pinned" :codecs="module.columnCodecs"
              :lineNoOffset="module.dataOffset" />

            <div v-if="selectedCellInPinned" class="selected-cell"
              ref="selectedCell" :style="{
              'grid-column': module.selectedCell.col,
              'grid-row': module.selectedCell.row+1
            }"></div>
          </div>

          <div class="row headers">
            <div class="cell header" v-for="column, i in columns.columns" ref="headers"
              :style="{'z-index': columns.columns.length-i}">
              <div class="colname">
                <span>{{ column.name }}</span>
                <span class="col-type">{{ colTypeNames[column.name] }}</span>
              </div>
              <div class="icons">
                <icon name="pin" class="icon-hide" @click="toggleColumnPin(column.name)" />
                <div v-if="column.kind === 'property'" class="sort-icon" @click="toggleColumnSort($event, column.name)">
                  <icon :name="sortedCols[column.name] ? 'sort-asc' : 'sort'" 
                    :style="{
                      transform: sortedCols[column.name] &&
                        sortedCols[column.name].dir === 'DESC' ? 'rotate(180deg)' : 'none'
                    }" :class="{
                      'icon-hide': !sortedCols[column.name]
                    }" />
                    <span v-if="sortedCols[column.name]">{{ sortedCols[column.name].index || '' }}</span>
                </div>
              </div>
              <div class="header-resizer"
                @mousedown="startColResize($event, column.name, i)"></div>
            </div>
            <div class="cell header rowfill"></div>
          </div>
          <render-columns :rows="rows" :columns="columns.columns" :codecs="module.columnCodecs"
            :rowfill="true" />
          
          <div v-if="module.selectedCell && !selectedCellInPinned" class="selected-cell"
            ref="selectedCell" :style="{
            'grid-column': module.selectedCell.col,
            'grid-row': module.selectedCell.row+1
          }"></div>
        </div>
      </div>
      <div v-if="module.loading" class="loading-overlay">
        <loading />
      </div>
    </template>

    <template v-slot:resize>
      <data-viewer v-if="module.selectedItem"
        :item="module.selectedItem.item"
        :codec="module.selectedItem.codec" />
    </template>
  </resizable-panel>

  <portal :to="tabId" v-if="module">
    {{ rowRange.from }} to {{ rowRange.to }}&nbsp;<span style="color: #9e9e9e"
    >of {{ module.objectsCount }}</span>

    <div class="statusbar-button" @click="gotoRelPage(-1)"
      :class="{disabled: currentPageNo === 1}">
      <icon name="chevron-right" style="transform: rotate(180deg)" />
    </div>
    <ui-select class="page-select" v-model="currentPageNo">
      <option v-for="n of maxPageNo" :value="n">{{ n }}</option>
    </ui-select>
    <div class="statusbar-button" @click="gotoRelPage(1)"
      :class="{disabled: currentPageNo === maxPageNo}">
      <icon name="chevron-right" />
    </div>

    <div class="statusbar-button" @click="module.detailPanel.setCollapsed()">Toggle Detail</div>

    <portal-target v-if="!module.detailPanel.isCollapsed" name="detailsPanel" class="statusbar-details-settings" />
  </portal>
</div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'

import { formatName, wraparoundIndex } from '@utils/misc'

import DataViewer from '@components/dataViewers/DataViewer'
import ResizablePanel from '@ui/ResizablePanel.vue'
import Icon from '@ui/Icon.vue'
import UiSelect from '@ui/Select.vue'
import Loading from '@ui/Loading.vue'

import RenderColumns from '@components/dataTable/RenderColumns.vue'

import 'assets/icons/chevron-right.svg'
import 'assets/icons/pin.svg'
import 'assets/icons/sort.svg'
import 'assets/icons/sort-asc.svg'

@Component({
  components: {
    ResizablePanel,
    Icon,
    UiSelect,
    RenderColumns,
    DataViewer,
    Loading,
  }
})
export default class DataView extends Vue {
  @Inject()
  readonly module!: any

  @Prop()
  tabId!: string

  pinnedColumns: string[] = []

  colsMeasured = false
  colWidths = {}

  get columns() {
    return (this.module.columns || []).reduce((cols, col) => {
      if (this.pinnedColumns.includes(col.name)) cols.pinned.push(col)
      else cols.columns.push(col)
      return cols
    }, {pinned: [], columns: []})
  }

  get rows() {
    return this.module.data || []
  }

  get colTypeNames() {
    const typeNames = {}
    for (let col of this.module.columns) {
      typeNames[col.name] = formatName(col.typeName, ['std', 'default'])
    }
    return typeNames
  }

  getColWidths(columns) {
    return columns.map(col => {
      const width = this.colsMeasured && this.colWidths[col.name]
      return `[${col.name}] ` + (width ? width+'px' : 'auto')
    }).join(' ')
  }

  get columnGridWidths() {
    return {
      columns: this.getColWidths(this.columns.columns),
      pinned: this.getColWidths(this.columns.pinned)
    }
  }

  get currentPageNo() {
    return (this.module.dataOffset / this.module.limit) + 1
  }
  set currentPageNo(val) {
    this.module.updateOffset(
      this.module.limit * (val - 1)
    )
  }

  get maxPageNo() {
    return Math.max(Math.ceil(this.module.objectsCount / this.module.limit), 1)
  }

  get rowRange() {
    const to = this.module.dataOffset + this.rows.length
    return {
      from: Math.min(this.module.dataOffset+1, to),
      to
    }
  }

  get selectedCellInPinned() {
    return this.module.selectedCell &&
      this.columns.pinned.some(col => col.name === this.module.selectedCell.col)
  }

  get sortedCols() {
    const showIndex = this.module.orderBy.length > 1
    return this.module.orderBy.reduce((cols, col, i) => {
      cols[col.col] = {...col, index: showIndex?(i+1):null}
      return cols
    }, {})
  }

  moveSelection(e) {
    if (!this.module.selectedCell) return;
    const {row, col} = this.module.selectedCell
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        this.module.setSelectedCell({
          row: wraparoundIndex(
            row + (e.key === 'ArrowUp' ? -1 : 1),
            1,
            this.rows.length
          ),
          col
        })
        break;
      case 'ArrowRight':
      case 'ArrowLeft':
        const {columns} = this
        const colNames = [...columns.pinned, ...columns.columns].map(c => c.name)

        let newIndex = wraparoundIndex(
          colNames.indexOf(col) + (e.key === 'ArrowLeft' ? -1 : 1),
          0,
          colNames.length-1
        )

        this.module.setSelectedCell({
          row,
          col: colNames[newIndex]
        })
        break;
      case ' ': // Space key
        this.module.detailPanel.setCollapsed()
    }
    e.preventDefault()
  }

  measureColumnWidths() {
    const colNames = [
      ...this.columns.pinned.map(c => c.name),
      ...this.columns.columns.map(c => c.name)
    ]
    this.colWidths = [
      ...(this.$refs.pinnedHeaders || []),
      ...(this.$refs.headers || [])
    ].reduce((widths, col, i) => {
      widths[colNames[i]] = Math.min(col.offsetWidth, 300)
      return widths
    }, {})
    this.colsMeasured = true
  }

  gotoRelPage(pageOffset) {
    this.module.updateOffset(
      this.module.limit * (this.currentPageNo + pageOffset - 1)
    )
  }

  toggleColumnPin(colName) {
    const pinnedColIndex = this.pinnedColumns.indexOf(colName)
    if (pinnedColIndex !== -1) {
      this.pinnedColumns.splice(pinnedColIndex, 1)
    } else {
      this.pinnedColumns.push(colName)
    }
  }

  toggleColumnSort(e, colName) {
    const oldSortCol = this.module.orderBy.find(o => o.col === colName)
    
    const newSort = e.shiftKey ? this.module.orderBy.filter(o => o !== oldSortCol) : []

    if (oldSortCol) {
      if (oldSortCol.dir === 'ASC') newSort.push({col: colName, dir: 'DESC'})
    } else {
      newSort.push({col: colName, dir: 'ASC'})
    }

    this.module.updateOrderBy(newSort)
  }

  startColResize(event, colName, colIndex, pinned = false) {
    const scrollContainer = this.$refs.scrollContainer,
          scrollContainerOffsetLeft = scrollContainer.offsetLeft,
          startX = (event.clientX - scrollContainerOffsetLeft) + scrollContainer.scrollLeft,
          startWidth = this.colWidths[colName]

    // console.log(startX, colLeft)
    const onMove = (event) => {
      const currentX = (event.clientX - scrollContainerOffsetLeft) + scrollContainer.scrollLeft,
            newWidth = (currentX - startX) + startWidth
      this.colWidths[colName] = Math.max(newWidth, 50)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', onMove)
    }, {capture: true, once: true})
  }

  @Watch('rows')
  dataLoaded(rows) {
    if (!this.colsMeasured && rows.length) {
      this.$nextTick(() => this.measureColumnWidths())
    }
  }

  @Watch('module.selectedCell')
  selectedCellChanged() {
    this.$nextTick(() => this.$refs.selectedCell.scrollIntoViewIfNeeded())
  }
}
</script>

<style lang="stylus" scoped>
>>> .data-view
  display: contents
  color: #e0e0e0

>>> .detail-viewer
  color: #e0e0e0
  background: #2b2b2b
  display: flex
  overflow: auto

>>> .data-viewer-no-viewer
  width: 100%
  height: 100%
  display: flex
  justify-content: center
  align-items: center
  color: #9e9e9e

.statusbar-details-settings
  display: flex
  margin-left: auto
  align-self: stretch

.table-scroll-container
  overflow: auto
  background: #1e1e1e

.table
  position: relative
  display: grid
  grid-template-columns: auto var(--columnWidths) 1fr
  width: max-content
  min-width: 100%
  outline: 0

>>> .row
  display: contents

>>> .cell
  position: relative
  padding: 4px 10px
  white-space: nowrap
  border-right: 1px solid #4a4a4a
  border-bottom: 1px solid #4a4a4a
  background: #1e1e1e
  overflow: hidden
  line-height: 19px
  height: 19px

  &:last-child
    border-right: 0

  .value-type-decimal:after
    content: ''

.header
  display: flex
  border-bottom: 1px solid #a5a5a5
  padding: 7px 0
  background: #333
  position: sticky
  top: 0
  box-sizing: border-box
  height: 52px
  min-width: 50px
  overflow: visible
  z-index: 1

  &.rowfill
    min-width: 20px

  &:not(:hover) .icon-hide
    opacity: 0

.colname
  display: flex
  flex-direction: column
  overflow: hidden
  margin: 0 10px

  span
    overflow: hidden
    text-overflow: ellipsis

.col-type
  opacity: 0.6
  font-size: 13px

.icons
  display: flex
  flex-direction: column
  margin-top: -2px
  margin-left: auto
  margin-right: 5px

  svg
    cursor: pointer

.sort-icon
  position: relative

  span
    position: absolute
    font-size: 11px
    bottom: 0
    right: -2px

.header-resizer
  position: absolute
  top: 0
  bottom: 0
  width: 4px
  right: -2px
  background: #4a4a4a
  cursor: col-resize
  opacity: 0

  &:hover
    opacity: 1

.pinned-columns
  grid-column: 1
  grid-row: 1 / span calc(var(--rowsCount) + 1)
  background: red
  display: grid
  grid-template-columns: auto var(--pinnedColumnWidths)
  position: sticky
  left: 0
  border-right: 1px solid #a5a5a5

  >>> .cell
    background: #2c2c2c

>>> .line-no
  text-align: right
  min-width: 3ch
  color: #afafaf

.selected-cell
  z-index: 0
  border: 2px solid var(--accent-colour)
  margin: -1px 0 0 -1px

.page-select
  padding-top: 2px
  padding-bottom: 2px
  margin: 0 3px

.statusbar-button.disabled {
  pointer-events: none
  opacity: 0.7
}

.loading-overlay
  position: absolute
  background: #2c2c2c80
  height: 100%
  width: 100%
  display: flex
  align-items: center
  justify-content: center
  z-index: 99999

  svg
    height: 42px
    width: 42px
    stroke-width: 1
</style>
