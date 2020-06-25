import { ipcRenderer } from 'electron-better-ipc'
import { SVGSymbolsInsert } from './svgsymbolsplugin/helper'
import { shell, remote, OpenDialogOptions, SaveDialogOptions } from 'electron'

const currentWindow = remote.getCurrentWindow()

window['ipc'] = ipcRenderer
window['SVGSymbolsInsert'] = SVGSymbolsInsert

window['openExternalUrl'] = (url: string) => shell.openExternal(url)

window['dialog'] = {
  showOpenDialog: (options: OpenDialogOptions) => remote.dialog.showOpenDialog(currentWindow, options),
  showSaveDialog: (options: SaveDialogOptions) => remote.dialog.showSaveDialog(currentWindow, options),
}
