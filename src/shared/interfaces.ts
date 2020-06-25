import * as z from 'zod'


export interface Query {
  connectionId: string
  database?: string
  query: string
  args?: {[key: string]: any}
  limit?: number
}

export interface QueryResponse {
  time: number
  result: any
  status: string
}

export interface RawQueryResponse extends QueryResponse {
  result: {
    result: Buffer
    inTypeId: string
    outTypeId: string
  }
}

export interface ResolveTypesRequest {
  connectionId: string
  database: string
  tids: string[]
}

export interface TidInfo {
  id: string
  name: string | null
}

export interface ResolveTypesResponse {
  types: TidInfo[]
}

export interface DumpRestoreRequest {
  connectionId: string
  database: string
  path: string
}

export interface DumpFileInfo {
  dumpVersion: number
  headerInfo: {
    dumpTime?: Date
    serverVersion?: string
  }
  fileSize: number
}

export const ConnectionParser = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  port: z.number().optional(),
  user: z.string(),
  password: z.string(),
  defaultDatabase: z.string().optional(),
  ssh: z.object({
    host: z.string(),
    port: z.number().optional(),
    user: z.string(),
    auth: z.union([
      z.object({
        type: z.literal('password'),
        password: z.string()
      }),
      z.object({
        type: z.literal('key'),
        keyFile: z.string(),
        passphrase: z.string().optional()
      })
    ]),
  }).optional()
})

export type ConnectionConfig = z.infer<typeof ConnectionParser>
