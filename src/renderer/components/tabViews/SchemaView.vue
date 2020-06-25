<template>
  <div style="display: contents">
    <resizable-panel :module="module.detailPanel"
      mainClass="schema-graph" resizeClass="schema-detail-panel">

      <template v-slot:main>
        <div class="schema-loading" v-if="module.loading !== null">
          <loading />
          <div>{{ module.loading === 0 ? 'Fetching schema' : 'Generating layout' }}</div>
        </div>
        <template v-else-if="module.schemaData">
          <schema-graph v-if="module.schemaData.length" />
          <div v-else class="no-schema">No schema objects</div>
        </template>
      </template>

      <template v-slot:resize>
        <schema-details />
      </template>

    </resizable-panel>

    <portal :to="tabId">
      <div class="statusbar-button" @click="module.toggleDebug">Toggle Debug</div>
      <div class="statusbar-button" @click="module.toggleHideInherited">Toggle Inherited</div>

      <div class="statusbar-button" style="margin-left: auto"
        @click="module.detailPanel.setCollapsed()">
        <icon :name="module.detailPanel.isCollapsed ? 'open-panel': 'close-panel'" />
      </div>
    </portal>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'

import SchemaGraph from '../SchemaGraph.vue'
import ResizablePanel from '@ui/ResizablePanel.vue'
import SchemaDetails from '../schemaView/schemaDetails.vue'

import Icon from '@ui/Icon.vue'
import Loading from '@ui/Loading.vue'

import 'assets/icons/open-panel.svg'
import 'assets/icons/close-panel.svg'

@Component({
  components: {
    SchemaGraph,
    ResizablePanel,
    SchemaDetails,
    Icon,
    Loading,
  }
})
export default class SchemaView extends Vue {
  @Inject()
  readonly module!: any

  @Prop()
  tabId!: string

}
</script>

<style lang="stylus" scoped>
>>> .schema-detail-panel
  background: #252525
  overflow: auto

.no-schema
  height: 100%
  display: flex
  align-items: center
  justify-content: center
  color: #bbb

.schema-loading
  display: flex
  align-items: center
  justify-content: center
  height: 100%
  flex-direction: column
  color: #e0e0e0

  svg
    height: 42px
    width: 42px
    stroke-width: 1
</style>
