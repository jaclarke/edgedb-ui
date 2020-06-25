import { Module, VuexModule, Mutation, Action } from 'vuex-class-modules'

import store from './store'

@Module({
  generateMutationSetters: true
})
class ViewerSettingsModule extends VuexModule {
  // string viewer
  wrapLines = false

}

export const viewerSettingsModule = new ViewerSettingsModule({store, name: 'viewerSettings'})
