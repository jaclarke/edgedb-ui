import {app, BrowserWindow, systemPreferences} from 'electron'
import * as path from 'path'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import windowStateKeeper from 'electron-window-state'

import { manageWindowControl } from './windowControl'
import './connectionsManager'
import './queryHandler'
import './edgedbTypes'
import './dumpRestore'
import './sysPref'
import './dev'

let mainWindow: BrowserWindow | null = null

function createWindow () {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 700
  })

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    backgroundColor: '#333',
    frame: false,
    webPreferences: {
      preload: path.resolve('./dist/preload.js')
    }
  })

  mainWindowState.manage(mainWindow)
  manageWindowControl(mainWindow)

  mainWindow.loadFile('./renderer.html')

  // mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', () => {
  installExtension(VUEJS_DEVTOOLS)
    // .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err))
    
  createWindow()
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})
