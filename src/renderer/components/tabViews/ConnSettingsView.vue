<template>
  <div style="display: contents">
    <div class="conn-settings">
      <div class="page-tabs">
        <div class="page-tab" v-for="page, i in pages"
          :class="{
            'selected-tab': i === selectedPage,
            'disabled-tab': page.connectionRequired && !connectionReady,
          }"
          @click="selectedPage = i">
          {{ page.name }}
        </div>
      </div>
      <div class="page-container">
        <keep-alive>
          <component :is="selectedPageComponent" />
        </keep-alive>
      </div>
    </div>

    <!--<portal :to="tabId">
      
    </portal>-->
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'

import ConnectionPage from '../settings/ConnectionPage.vue'
import DumpPage from '../settings/DumpPage.vue'
import RestorePage from '../settings/RestorePage.vue'

import UiButton from '@ui/Button.vue'
import UiSelect from '@ui/Select.vue'
import Icon from '@ui/Icon.vue'

const pages = [
  {name: 'Configuration', component: ConnectionPage},
  {name: 'Dump DB', component: DumpPage, connectionRequired: true},
  {name: 'Restore DB', component: RestorePage, connectionRequired: true},
]

@Component({
  components: {
    UiButton,
    UiSelect,
    Icon,
  }
})
export default class ConnSettingsView extends Vue {
  @Inject()
  readonly module!: any

  @Prop()
  tabId!: string

  pages = pages

  selectedPage = 0

  get selectedPageComponent() {
    return pages[this.selectedPage].component
  }

  get connectionReady() {
    return !!this.module.connectionName
  }
}
</script>

<style lang="stylus" scoped>
.conn-settings
  color: #e0e0e0
  display: grid
  grid-template-columns: max-content 1fr
  min-width: 0
  min-height: 0

.page-container
  padding: 20px
  overflow: auto

.page-tabs
  padding: 15px 0
  background: #2b2b2b

.page-tab
  padding: 12px 15px
  cursor: pointer

  &:hover
    background: rgba(0,0,0,0.1)

  &.selected-tab
    background: #333
  
  &.disabled-tab
    opacity: 0.2
    pointer-events: none
</style>
