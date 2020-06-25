<template>
  <div>
    <keep-alive max="10">
      <module-provider v-if="tabView" :mod="currentTab.module" :key="currentTab.id">
        <component :is="tabView" :key="currentTab.id"
          :tabId="currentTab.id" />
      </module-provider>
      <div v-else></div>
    </keep-alive>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'

import { tabsModule } from '@store/tabs'

import ModuleProvider from './ModuleProvider.vue'

import QueryView from './tabViews/QueryView.vue'
import SchemaView from './tabViews/SchemaView.vue'
import DataView from './tabViews/DataView.vue'
import ConnSettingsView from './tabViews/ConnSettingsView.vue'

const viewTypes = {
  query: QueryView,
  schema: SchemaView,
  data: DataView,
  connSettings: ConnSettingsView,
}

@Component({
  components: {ModuleProvider}
})
export default class MainPanel extends Vue {
  get currentTab() {
    return tabsModule.currentTab
  }

  get tabView() {
    return this.currentTab ? viewTypes[this.currentTab.type] : undefined
  }

  get tabIds() {
    return tabsModule.tabs.map(tab => tab.id)
  }

  // Removes closed tabs from the keep-alive cache to prevent memory leak
  // Workaround until keep-alive include/exclude by key added
  // https://github.com/vuejs/vue/issues/8028
  @Watch('tabIds')
  cleanKeepAliveCache(ids: string[]) {
    const keepAliveInst = this.$children[0]?.$vnode.parent.componentInstance
    if (keepAliveInst?.cache) {
      keepAliveInst.keys = keepAliveInst.keys.filter(key => {
        if (!ids.includes(key)) {
          keepAliveInst.cache[key].componentInstance.$destroy()
          keepAliveInst.cache[key] = null
          return false
        }
        return true
      })
    }
  }
}
</script>
