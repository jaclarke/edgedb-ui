import { BrowserWindow } from 'electron'
import { ipcMain as ipc } from 'electron-better-ipc'

ipc.answerRenderer('dev:reloadWindow', (_, browserWindow) => {
  (browserWindow as any as BrowserWindow).reload()
})

ipc.answerRenderer('dev:toggleDevtools', (_, browserWindow) => {
  (browserWindow as any as BrowserWindow).webContents.toggleDevTools()
})
