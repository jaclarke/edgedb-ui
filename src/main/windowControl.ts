import { BrowserWindow } from 'electron'
import { ipcMain as ipc } from 'electron-better-ipc'

ipc.answerRenderer('windowControl:buttonPressed', (action: string, browserWindow) => {
  const window = browserWindow as any as BrowserWindow
  switch (action) {
    case 'minimise':
      window.minimize()
      break;
    case 'toggleMax':
      if (window.isMaximized()) window.unmaximize()
      else window.maximize()
      break;
    case 'close':
      window.close()
      break;
  }
})

ipc.answerRenderer('windowControl:isMaximised', (_, browserWindow) => {
  return (browserWindow as any as BrowserWindow).isMaximized()
})

export function manageWindowControl(window: BrowserWindow) {
  window.on('unmaximize', () => {
    ipc.callRenderer(window, 'windowControl:maximiseChanged', false)
  })
  window.on('maximize', () => {
    ipc.callRenderer(window, 'windowControl:maximiseChanged', true)
  })
}
