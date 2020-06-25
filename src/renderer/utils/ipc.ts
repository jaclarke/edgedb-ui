import { createDecorator } from 'vue-class-component'

export function ipcListen(channel: string) {
  return createDecorator((options, key) => {
    let destroyListener

    if (!options.mixins) options.mixins = []
    options.mixins.push({
      created() {
        destroyListener = (window as any).ipc.answerMain(channel, this[key])
      },
      destroyed: () => destroyListener()
    })
  })
}
