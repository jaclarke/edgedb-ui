import { BrowserWindow } from 'electron'
import { ipcMain as ipc } from 'electron-better-ipc'

import { KNOWN_TYPES } from 'edgedb/codecs/consts'

import { getConnection } from './connectionsManager'
import { TidInfo, ResolveTypesRequest, ResolveTypesResponse } from '@shared/interfaces'

const tidsInfoCache = new Map<string, TidInfo>()

ipc.answerRenderer('typesResolver:resolve', async (request: ResolveTypesRequest, browserWindow) => {
  const cached: ResolveTypesResponse['types'] = [],
        uncached: string[] = []

  for (const id of request.tids) {
    if (KNOWN_TYPES.has(id)) continue;

    if (tidsInfoCache.has(id)) cached.push(tidsInfoCache.get(id))
    else uncached.push(id)
  }

  if (cached.length) {
    ipc.callRenderer(browserWindow as any as BrowserWindow, 'typesResolver:resolved', {
      types: cached
    })
  }

  if (!uncached.length) return;

  for (const id of uncached) {
    tidsInfoCache.set(id, {id, name: null})
  }

  const conn = await getConnection(request.connectionId, request.database)

  const result: TidInfo[] = (await conn.fetchAll(`SELECT schema::Object {
    id,
    name,
  }
  FILTER .id IN array_unpack(<array<uuid>>$tids)`, {
    tids: uncached
  })).map(res => ({
    id: res.id.toRawString(),
    name: res.name,
  }))

  for (const res of result) {
    tidsInfoCache.set(res.id, res)
  }

  ipc.callRenderer(browserWindow as any as BrowserWindow, 'typesResolver:resolved', {
    types: result
  })
})
