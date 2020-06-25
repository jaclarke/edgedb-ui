import { Module, VuexModule, Action, Mutation } from 'vuex-class-modules'
import nanoid from 'nanoid'

import store from './store'
import { QueryTabModule } from './tabs/query'
import { SchemaTabModule } from './tabs/schema'
import { DataTabModule } from './tabs/data'
import { ConnSettingsTabModule } from './tabs/connSettings'

const TabTypes = {
  'query': QueryTabModule,
  'schema': SchemaTabModule,
  'data': DataTabModule,
  'connSettings': ConnSettingsTabModule,
}

type Tab<T extends keyof typeof TabTypes> = {
  id: string
  type: T
  module: (typeof TabTypes)[T]
}

export interface ITabModule<T> {
  title: string
  init?: ({id, config, module}: {id: string, config: any, module: T}) => Promise<void>
  destroy?: ({id, module}: {id: string, module: T}) => void
}

@Module
class TabsModule extends VuexModule {
  currentTabId: string = null

  tabs: Tab<keyof typeof TabTypes>[] = []

  get currentTab() {
    return this.tabs.find(tab => tab.id === this.currentTabId)
  }

  @Action
  private _createTab<T extends keyof typeof TabTypes>(
    {type, config}: {type: T, config?: any}
  ) {
    const id = `tab-${type}-${nanoid()}`,
          // @ts-ignore
          newTab: Tab<T> = {
            id,
            type,
            // @ts-ignore
            module: new TabTypes[type]({store, name: id})
          }
    // @ts-ignore
    newTab.module.init?.({id, config, module: newTab.module})
    this.addTab(newTab)
  }

  @Action
  newQueryTab() {
    this._createTab({
      type: 'query'
    })
  }

  @Action
  newSchemaTab({connectionId, database}: {connectionId: string, database: string}) {
    this._createTab({
      type: 'schema',
      config: {connectionId, database},
    })
  }

  @Action
  newDataTab({connectionId, database, objectName}: {connectionId: string, database: string, objectName: string}) {
    this._createTab({
      type: 'data',
      config: {connectionId, database, objectName}
    })
  }

  @Action
  newConnSettingsTab({connectionId}: {connectionId?: string} = {}) {
    this._createTab({
      type: 'connSettings',
      config: {connectionId}
    })
  }

  @Action
  openConnSettingsTab({connectionId}: {connectionId: string}) {
    const tab = this.tabs.find(tab => tab.type === 'connSettings' &&
      (tab.module as unknown as ConnSettingsTabModule).connectionId === connectionId)
    
    if (tab) this.focusTab(tab.id)
    else this.newConnSettingsTab({connectionId})
  }

  @Mutation
  addTab<T extends keyof typeof TabTypes>(tab: Tab<T>) {
    this.tabs.push(tab)
    this.currentTabId = tab.id
  }

  @Mutation
  removeTab(id: string) {
    const removeIndex = this.tabs.findIndex(tab => tab.id === id)
    const tab = this.tabs.splice(removeIndex, 1)[0]

    ;(tab.module as unknown as ITabModule<keyof typeof TabTypes>).destroy?.({
      id, module: tab.module as any
    })
    store.unregisterModule(id)
    if (id === this.currentTabId) {
      this.currentTabId = this.tabs[removeIndex]?.id || this.tabs[removeIndex-1]?.id || null
    }
  }

  @Mutation
  focusTab(id: string) {
    this.currentTabId = id
  }
}

export const tabsModule = new TabsModule({store, name: 'tabs'})
