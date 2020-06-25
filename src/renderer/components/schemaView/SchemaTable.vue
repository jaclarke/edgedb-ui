<template>
  <div class="table" :class="{
    'is-abstract': schema.is_abstract
  }" :style="{
    left: x+'px',
    top: y+'px',
    height: layout.height+'px'
  }">
    <div class="header">{{ tableName }}</div>
    <div class="items" ref="items">
      <schema-table-item v-for="item in items"
        :item="item" :type="item.type" :parentTable="schema" />
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import SchemaTableItem from './SchemaTableItem.vue'

@Component({
  components: {
    SchemaTableItem
  }
})
export default class SchemaTable extends Vue {
  @Prop()
  schema!: any

  @Prop()
  layout!: any

  get tableName() {
    return this.schema.name.split('::')[1]
  }

  get x() {
    return this.layout.cx - this.layout.width/2
  }

  get y() {
    return this.layout.cy - this.layout.height/2
  }

  get items() {
    const collator = new Intl.Collator()
    return [
      ...this.schema.properties.map(item => ({...item, type: 'prop'})),
      ...this.schema.links.map(item => ({...item, type: 'link'})),
    ]
    .sort((a, b) => collator.compare(a.name, b.name))
    .reduce((items, item) => {
      items.push(item)
      if (item.type === 'link') {
        items.push(
          ...item.properties.map(item => ({...item, type: 'linkprop'}))
        )
      }
      return items
    }, [])
  }
}
</script>

<style lang="stylus" scoped>
.table
  position: absolute
  width: var(--tableWidth)
  display: flex
  flex-direction: column
  background-color: #424242
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.06), 0px 4px 6px rgba(0, 0, 0, 0.06)
  border-radius: 3px
  overflow: hidden
  cursor: pointer

.header
  height: var(--tableHeaderHeight)
  background-color: #2196F3
  display: flex
  align-items: center
  justify-content: center
  flex-shrink: 0
  color: #E0E0E0
  font-weight: 600

  .is-abstract &
    background: #5d5d5d

.items
  display: flex
  flex-direction: column
  overflow: hidden auto
  position: relative
</style>
