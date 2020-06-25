import { ipcMain as ipc } from 'electron-better-ipc'

import { getConnection } from './connectionsManager'
import { Query, QueryResponse, RawQueryResponse } from '@shared/interfaces'

ipc.answerRenderer('query:runRaw', async (query: Query): Promise<RawQueryResponse> => {
  const conn = await getConnection(query.connectionId, query.database)

  try {
    const queryStartTime = Date.now(),
          result = await conn.fetchAllRaw(query.query, query.args, {
            implicitLimit: query.limit
          }),
          time = Date.now() - queryStartTime

    return {
      time,
      result,
      status: conn.conn['lastStatus']
    }
  } catch (error) {
    handleError(error)
  }
})

ipc.answerRenderer('query:run', async (query: Query): Promise<QueryResponse> => {
  const conn = await getConnection(query.connectionId, query.database)

  try {
    const queryStartTime = Date.now(),
          result = await conn.fetchAll(query.query, query.args, {
            implicitLimit: query.limit
          }),
          time = Date.now() - queryStartTime

    return {
      time,
      result,
      status: conn.conn['lastStatus']
    }
  } catch (error) {
    handleError(error)
  }
})

function handleError(error: any) {
  const errorNames = []
    let e = error
    while (e = Object.getPrototypeOf(e)) {
      const name = e.constructor.name
      if (name === 'Object') break;
      errorNames.push(name)
    }
    if (error.attrs) {
      error.attrs = [...error.attrs.entries()].map(([key, val]) => {
        return [key, val.toString()]
      })
    }
    error.errorNames = errorNames
    throw error
}
