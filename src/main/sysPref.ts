import { systemPreferences } from 'electron'
import { ipcMain as ipc } from 'electron-better-ipc'

ipc.answerRenderer('sysPref:getAccentColour', () => {
  return systemPreferences.getAccentColor()
})

systemPreferences.on('accent-color-changed', (_, newColour) => {
  ipc.sendToRenderers('sysPref:accentColourChanged', newColour)
})
