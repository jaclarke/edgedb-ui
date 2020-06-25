<template>
  <div class="viewport">
    <div class="canvas" :style="{
      '--tableWidth': tableWidth+'px',
      '--tableHeaderHeight': tableHeaderHeight+'px',
      '--tableItemHeight': tableItemHeight+'px',
      '--maxItems': maxItems,
      '--backgroundColour': '#333',
    }" @mouseover="module.setHoveredLink(null)"
       @mouseleave="module.setHoveredLink(null)">
      <template v-if="layout">
        <svg class="routes" :style="{
          width: layout.width+'px',
          height: layout.height+'px'
        }" :viewBox="`0 0 ${layout.width} ${layout.height}`">
          <template v-if="debug">
            <line class="debug-grid" v-for="i in Math.ceil(layout.height/gridSize)" :x2="layout.width" :y1="i*gridSize" :y2="i*gridSize" />
            <text class="debug-text" v-for="x in Math.ceil(layout.width/gridSize)"
              :x="x*gridSize" :y="gridSize">{{ x }}</text>
            <line class="debug-grid" v-for="i in Math.ceil(layout.width/gridSize)" :y2="layout.height" :x1="i*gridSize" :x2="i*gridSize" />
            <text class="debug-text" v-for="y in Math.ceil(layout.height/gridSize)"
              :y="(y+0.5)*gridSize" x="0">{{ y }}</text>

            <!--<rect class="debug-margin" v-for="node, i in layout.nodes"
              :x="node.x-48" :y="node.y-48" :width="tableWidth+96" :height="node.height+96" />
            <rect class="debug-boxes" v-for="node, i in layout.nodes"
              :x="node.x-12" :y="node.y-12" :width="tableWidth+24" :height="node.height+24" />-->

            <rect class="debug-node" v-for="cell in layout.grid.values()"
              :class="['debug-node-'+cell.type, 'debug-node-'+cell.kind]"
              :x="cell.x*gridSize" :y="cell.y*gridSize" :width="gridSize" :height="gridSize" />
            <text class="debug-text" v-for="cell in layout.grid.values()"
              :x="(cell.x+0.5)*gridSize" :y="(cell.y+0.5)*gridSize">{{ cell.node.index }}</text>
          </template>

          <schema-link v-for="route in routes" :linkRoute="route.path" :link="route"
            :highlighted="route.link.id === module.hoveredLink"
            @mouseover="module.setHoveredLink(route.link.id)" />
        </svg>
        <schema-table v-for="schema, i in schemaData" :schema="schema"
          :layout="layout.nodes[i]" @click.native="module.selectObject(schema.name)" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject } from 'vue-property-decorator'

import {
  gridSize,
  tableWidth,
  tableHeaderHeight,
  tableItemHeight,
  maxVisibleItems,
} from '@store/tabs/schema'

import SchemaTable from './schemaView/SchemaTable.vue'
import SchemaLink from './schemaView/SchemaLink.vue'

@Component({
  components: {
    SchemaTable,
    SchemaLink,
  }
})
export default class SchemaGraph extends Vue {
  @Inject()
  readonly module!: any

  gridSize = gridSize
  tableWidth = tableWidth
  tableHeaderHeight = tableHeaderHeight
  tableItemHeight = tableItemHeight
  maxItems = maxVisibleItems

  get schemaData() {
    return this.module.schemaData
  }

  get layout() {
    return this.module.graphLayout
  }

  get routes() {
    return this.module.routes
  }

  get debug() {
    return this.module.debug
  }
}
</script>

<style lang="stylus" scoped>
.viewport, .canvas
  min-width: 100%
  min-height: 100%

.viewport
  position: relative
  overflow: auto
  background-color: var(--backgroundColour)

.canvas
  position: relative

.routes
  position: absolute
  top: 0
  left: 0

.path
  stroke: red

.debug-grid
  stroke-width: 0.5
  stroke: red

.debug-margin
  stroke-width: 0.5
  stroke: blue

.debug-boxes
  stroke-width: 0.5
  stroke: white

.debug-node
  stroke: none
  fill: rgba(255,255,255,0.2)

  &-link
    fill: rgba(0,0,255,0.2)

  &-0
    fill: rgba(0,255,255,0.2)

  &-1
    fill: rgba(255,0,255,0.2)

  &-3
    fill: rgba(0,0,0,0.2)

  &-search
    fill: rgba(255,0,0,0.4)

>>> .debug-text
  fill: black
  stroke: white
  stroke-width: 1
  font-weight: 900

</style>
