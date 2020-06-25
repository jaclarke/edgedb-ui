<template>
  <RecycleScroller class="results-tree" tabindex="0" @keydown.native="moveSelection"
    :items="resultsList"
    :item-size="rowHeight"
    key-field="id"
    type-field="rowType"
    v-slot="{ item: row, index }"
  >
    <div v-if="row.rowType === 'result'" class="result-row" :class="{
      selected: index === selectedIndex
    }" :style="{
      'margin-left': row.depth*12+'px'
    }" @click="module.selectResultItem(index)" @dblclick="module.detailPanel.setCollapsed(false)">
      <Icon v-if="row.expandable" name="chevron-right" class="expand-icon"
        :class="{expanded: row.expanded}" @click="module.expandResultRow({rowIndex: index})" />
      <template v-if="row.name !== undefined">
        {{ row.name }}<span class="equals"> := </span>
      </template>
      <item-type :item="row.item" :codec="row.codec"
        :implicitlimit="implicitLimit" />&nbsp;
      <div v-if="row.itemKind === 'scalar'" class="value-wrapper">
        <item-value :item="row.item" :codec="row.codec" 
        :implicitlimit="implicitLimit" />
      </div>
      <div v-else-if="!row.expanded" class="preview" :class="['preview-'+row.itemKind]">
        <item-value v-if="row.itemKind === 'object' && !row.expandable" class="implicit-id"
          :item="row.item.id" :codec="uuidCodec" />
        <template v-else v-for="child, i in row.children.slice(0,20)">
          <template v-if="row.itemKind !== 'array' && child.name !== undefined">
            {{ child.name }}<span class="equals"> := </span>
          </template><item-value :item="child.item" :codec="child.codec" :short="true" :implicitlimit="implicitLimit"
            /><span v-if="i < row.children.length-1">, </span>
        </template><span v-if="row.children.length > 20">...</span>
      </div>
    </div>
    <div v-else-if="row.rowType === 'implicitlimit'"
      class="implicit-limit-message" :style="{
      'margin-left': row.depth*12+'px'
    }">
      &hellip;&thinsp;further results hidden
    </div>
  </RecycleScroller>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'

import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import { UUIDCodec } from '@utils/edgedb'

import ItemType from './renderers/ItemType'
import ItemValue from './renderers/ItemValue'
import Icon from '@ui/Icon.vue'

import 'assets/icons/chevron-right.svg'

const rowHeight = 27

@Component({
  components: {
    RecycleScroller,
    Icon,
    ItemType,
    ItemValue,
  }
})
export default class ResultsTreeView extends Vue {
  @Inject()
  readonly module!: any

  uuidCodec = new UUIDCodec('')
  rowHeight = rowHeight

  get resultsList() {
    return this.module.resultGroup?.list
  }

  get implicitLimit() {
    return this.module.resultImplicitLimit
  }

  moveSelection(e) {
    switch (e.key) {
      case 'ArrowUp':
        this.module.moveSelection('UP')
        break;
      case 'ArrowDown':
        this.module.moveSelection('DOWN')
        break;
      case 'ArrowRight':
        this.module.expandResultRow({
          rowIndex: this.selectedIndex,
          change: 'EXPAND'
        })
        break;
      case 'ArrowLeft':
        this.module.expandResultRow({
          rowIndex: this.selectedIndex,
          change: 'COLLAPSE'
        })
        break;
      case ' ': // Space key
        this.module.detailPanel.setCollapsed()
    }
    e.preventDefault()
  }

  get selectedIndex() {
    return this.module.resultGroup?.selectedIndex ?? null
  }

  @Watch('selectedIndex')
  selectionChanged(index) {
    if (index === null) return;
    
    const rowTop = index*rowHeight,
          rowBottom = (index+1)*rowHeight,
          scrollTop = this.$el.scrollTop

    if (rowTop < scrollTop) {
      this.$el.scrollTop = rowTop
      return
    }

    const height = this.$el.offsetHeight
    if (rowBottom > scrollTop + height) {
      this.$el.scrollTop = rowBottom - height
    }
  }
}
</script>

<style lang="stylus" scoped>
.results-tree
  color: #e0e0e0
  // padding: 5px 0
  outline: 0
  height: 100%
  contain: strict

  // &:focus
  //   outline-color: rgba(255,255,255,0.5)

.result-row
  display: flex
  align-items: center
  padding: 2px 3px
  padding-left: 21px
  height: 21px
  border: 1px solid transparent
  cursor: pointer

  // &:hover
    // background: rgba(255,255,255,0.03)

  &.selected
    background: rgba(255,255,255,0.09)

.expand-icon
  flex-shrink: 0
  cursor: pointer
  margin-left: -21px

  &.expanded
    transform: rotate(90deg)

.equals
  color: #fb9256
  white-space: pre

>>> .item-type
  color: #aaa

  &-object
    color: #ee464d

.value-wrapper
  overflow-x: hidden
  text-overflow: ellipsis
  white-space: nowrap

.preview
  overflow-x: hidden
  text-overflow: ellipsis
  white-space: nowrap
  padding: 0 8px
  position: relative

  &:before
    position: absolute
    content: '{'
    left: 1px
  &:after
    position: absolute
    content: '}'
    right: 1px

  &-array
    &:before
      content: '['
    &:after
      content: ']'

  &-tuple, &-namedtuple
    &:before
      content: '('
    &:after
      content: ')'

.implicit-id
  font-style: italic

.result-row
  >>> .value-type
    &-str
      color: #e5df59
      &:before
        content: "'"
      &:after
        content: "'"

    &-int16,
    &-int32,
    &-int64,
    &-float32,
    &-float64,
    &-bigint,
    &-decimal,
    &-bool
      color: #b466ce

    &-bigint,
    &-decimal
      &:after
        content: 'n'

    &-bytes
      font-family: monospace
      &:before
        content: '0x'
      span
        margin-left: 0.3em

    &-uuid
      font-family: monospace

    &-uuid,
    &-datetime,
    &-localdatetime,
    &-localdate,
    &-localtime,
    &-duration
      color: #2dd8a5

    &-enum
      color: #ee464d

    &-json
      color: #fb9256

    &-null
      color: #bbb
      &:before
        content: '{ }'

  >>> .whitespace-char
    color: #bbb

.implicit-limit-message
  padding: 3px 22px
  color: #9c9c9c
</style>
