import { Module, VuexModule, Action, Mutation } from 'vuex-class-modules'

import store from './store'

@Module
class WindowModule extends VuexModule {
  isMaximised = false

  accentColour = 'transparent'

  @Mutation
  setMaximised(maxmised: boolean) {
    this.isMaximised = maxmised
  }

  @Mutation
  setAccentColour(colour: string) {
    const r = parseInt(colour.slice(0,2), 16),
          g = parseInt(colour.slice(2,4), 16),
          b = parseInt(colour.slice(4,6), 16),
          a = parseInt(colour.slice(6,8), 16) / 255
    this.accentColour = `rgba(${r},${g},${b},${a})`
  }
}

export const windowModule = new WindowModule({store, name: 'window'})

;(window as any).ipc.answerMain('windowControl:maximiseChanged', windowModule.setMaximised)
;(window as any).ipc.listenBroadcast('sysPref:accentColourChanged', windowModule.setAccentColour)

;(async () => {
  windowModule.setAccentColour(
    await (window as any).ipc.callMain('sysPref:getAccentColour')
  )
  windowModule.setMaximised(
    await (window as any).ipc.callMain('windowControl:isMaximised')
  )
})()
