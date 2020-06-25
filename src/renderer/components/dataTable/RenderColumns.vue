<template>
  <div style="display: contents">
  <div class="row" v-for="row, ri in rows">
    <div v-if="renderLineNo" class="cell line-no">{{ ri + lineNoOffset + 1 }}</div>
    <div class="cell" v-for="column, ci in columns" :class="['celltype-'+cellTypes[ci]]"
      :style="{
        'grid-column': column.name,
        'grid-row': ri+2
      }" @click="module.setSelectedCell({row: ri+1, col: column.name})">
      <item-value v-if="column.kind === 'property'" :item="row[column.name]" :codec="codecs[column.index]" />
      <span class="link-count" v-else>{{ row[column.name+'__count__'] }} items</span>
    </div>
    <div v-if="rowfill" class="cell rowfill"></div>
  </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject } from 'vue-property-decorator'

import ItemValue from '../renderers/ItemValue'

@Component({
  components: {
    ItemValue
  }
})
export default class RenderColumns extends Vue {
  @Inject()
  readonly module!: any

  @Prop()
  rows!: any[]

  @Prop()
  columns!: any[]

  @Prop()
  codecs!: any[]

  @Prop()
  lineNoOffset: number | undefined

  @Prop({
    default: false
  })
  rowfill!: boolean

  get renderLineNo() {
    return this.lineNoOffset !== undefined
  }

  get cellTypes() {
    return this.columns.map(col => this.codecs[col.index]?.getBaseScalarName?.())
  }
}
</script>

<style lang="stylus" scoped>
.row
  >>> .value-type
    &-bytes
      font-family: monospace
      
      span
        margin-left: 0.3em
    
    &-uuid
      font-family: monospace

    &-null
      color: #bbb
      &:before
        content: '{ }'

  >>> .whitespace-char
    color: #bbb

.celltype
  &-int16,
  &-int32,
  &-int64,
  &-float32,
  &-float64,
  &-bigint,
  &-decimal
    text-align: end

.link-count
  font-style: italic
  color: #bbb
</style>
