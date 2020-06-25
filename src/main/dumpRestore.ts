import { createWriteStream, WriteStream, createReadStream, ReadStream, stat } from 'fs'
import { createHash } from 'crypto'
import { promisify } from 'util'

import { ipcMain as ipc } from 'electron-better-ipc'
import PromiseStream from 'promise-stream-reader'

import { AwaitConnection } from 'edgedb/client'
import char, { ord } from 'edgedb/chars'
import { WriteBuffer } from 'edgedb/buffer'

import { DumpRestoreRequest, DumpFileInfo } from '@shared/interfaces'
import { getConnection } from './connectionsManager'

const statAsync = promisify(stat)

const DUMP_SIG = Buffer.from([
  0xFF, 0xD8, 0x00, 0x00, 0xD8,
// E     D     G     E     D     B           D     U     M     P
  0x45, 0x44, 0x47, 0x45, 0x44, 0x42, 0x00, 0x44, 0x55, 0x4d, 0x50,
  0x00
])
const DUMP_SIG_LENGTH = DUMP_SIG.length

const DUMP_VER = 1
const DUMP_MAX_SUPPORTED_VER = 1

const DUMP_VER_BUF = new WriteBuffer().writeInt64(DUMP_VER).unwrap()

const emptyDatabaseQuery = `
WITH modules := (SELECT schema::Module FILTER NOT .builtin),
     objects := (SELECT schema::Object FILTER .name LIKE 'default::%')
SELECT count(modules) = 1
  AND modules.name = 'default'
  AND NOT EXISTS objects
  LIMIT 1`

const createBlockWriter = (
  blockType: char,
  fileStream: WriteStream,
  onWrite: (blockSize: number) => void
) =>
  async (buf: Buffer) => {
    const wb = new WriteBuffer()
    wb.writeChar(blockType)
      .writeBuffer(createHash('sha1').update(buf).digest())
      .writeUInt32(buf.length)
      .writeBuffer(buf)
    fileStream.write(wb.unwrap(), (err) => {
      if (err) throw err
      onWrite(buf.length + 25)
    })
  }

export async function dump(conn: AwaitConnection, path: string) {
  const fileStream = createWriteStream(path)

  let bytesWritten = 0

  const onBlockWrite = (bytes: number) => {
    bytesWritten += bytes
    ipc.sendToRenderers('dump:bytesWritten', {
      path, bytesWritten
    })
  }

  fileStream.write(DUMP_SIG)
  fileStream.write(DUMP_VER_BUF)

  onBlockWrite(DUMP_SIG.length + DUMP_VER_BUF.length)

  await conn._dump(
    createBlockWriter(ord('H'), fileStream, onBlockWrite),
    createBlockWriter(ord('D'), fileStream, onBlockWrite)
  )

  return new Promise((resolve, reject) => {
    fileStream.end(resolve)
  })
}

class FileReader {
  private _fileSize!: number
  private _fileStream!: ReadStream
  private _streamReader!: ReturnType<typeof PromiseStream>
  private _bytesRead: number = 0

  async init(path: string) {
    this._fileSize = (await statAsync(path)).size

    this._fileStream = createReadStream(path)
    this._streamReader = PromiseStream()

    this._fileStream.pipe(this._streamReader)

    return this
  }

  get fileSize() {
    return this._fileSize
  }

  get bytesRead() {
    return this._bytesRead
  }

  readBytes(size: number) {
    this._bytesRead += size
    return this._streamReader.read(size)
  }

  async readNextBlock(expectedBlockType: string): Promise<null | {
    blockType: string
    blockBuf: Buffer
  }> {
    if (this._bytesRead === this._fileSize) {
      return null
    }
    if (this._bytesRead + 25 > this._fileSize) {
      throw new Error('incomplete block header')
    }

    const blockType = (await this.readBytes(1)).toString()

    if (blockType !== expectedBlockType) {
      throw new Error('unexpected block type found')
    }

    const blockHash = await this.readBytes(20),
          blockLength = (await this.readBytes(4)).readUInt32BE(0)

    if (this._bytesRead + blockLength > this._fileSize) {
      throw new Error('incomplete block data')
    }
    
    const blockBuf = await this.readBytes(blockLength)
    if (
      Buffer.compare(
        createHash('sha1').update(blockBuf).digest(),
        blockHash
      ) !== 0
    ) {
      throw new Error('dump integrity compromised: checksum failed')
    }

    return {
      blockType,
      blockBuf
    }
  }

  destroy() {
    this._fileStream.unpipe(this._streamReader)
    this._streamReader.destroy()
    this._fileStream.destroy()
  }
}

async function* DataBlockReader(fileReader: FileReader, onRead: (bytesRead: number) => void) {
  let blockIndex = 0
  while (true) {
    const dataBlock = await fileReader.readNextBlock('D')
    if (dataBlock === null) return;

    yield dataBlock.blockBuf

    onRead(fileReader.bytesRead)
  }
}

export async function restore(conn: AwaitConnection, path: string) {
  const {headerBlock, fileReader} = await openDumpFile(path)

  const onBlockRead = (bytesRead: number) => {
    ipc.sendToRenderers('restore:bytesRead', {
      path, bytesRead
    })
  }

  onBlockRead(fileReader.bytesRead)

  const dataBlockReader = DataBlockReader(fileReader, onBlockRead)

  await conn._restore(
    headerBlock.blockBuf,
    dataBlockReader
  )

  fileReader.destroy()
}

async function openDumpFile(path: string) {
  const fileReader = await new FileReader().init(path)

  const dumpSig = await fileReader.readBytes(DUMP_SIG_LENGTH)
  if (Buffer.compare(dumpSig, DUMP_SIG) !== 0) {
    throw new Error('not an EdgeDB dump file')
  }

  const dumpVersion = (await fileReader.readBytes(8)).readBigUInt64BE()
  if (dumpVersion > DUMP_MAX_SUPPORTED_VER) {
    throw new Error(`dump version ${dumpVersion} not supported`)
  }

  const headerBlock = await fileReader.readNextBlock('H')
  if (headerBlock === null) {
    throw new Error('no header block found')
  }

  return {
    dumpVersion,
    headerBlock,
    fileReader
  }
}

const DUMP_HEADER_SERVER_TIME_TYPE = 102
const DUMP_HEADER_SERVER_VER_TYPE = 103

function extractHeaderInfo(header: Buffer) {
  const info: {
    dumpTime?: Date
    serverVersion?: string
  } = {}

  const headerCount = header.readInt16BE(0)
  let offset = 2
  for (let i = 0; i < headerCount; i++) {
    const headerBlockType = header.readInt16BE(offset)
    offset += 2
    const length = header.readUInt32BE(offset)
    offset += 4

    switch (headerBlockType) {
      case DUMP_HEADER_SERVER_TIME_TYPE:
        info.dumpTime = new Date(
          Number(header.toString('utf8', offset, offset+length))*1000
        )
        break;
      case DUMP_HEADER_SERVER_VER_TYPE:
        info.serverVersion = header.toString('utf8', offset, offset+length)
        break;
    }
    offset += length
  }

  return info
}

async function checkDumpFile(path: string): Promise<DumpFileInfo> {
  const {dumpVersion, headerBlock, fileReader} = await openDumpFile(path)

  const headerInfo = extractHeaderInfo(headerBlock.blockBuf)
  const fileSize = fileReader.fileSize

  fileReader.destroy()

  return {
    dumpVersion: Number(dumpVersion),
    headerInfo,
    fileSize
  }
}

ipc.answerRenderer('dump:begin', async ({connectionId, database, path}: DumpRestoreRequest) => {
  const conn = await getConnection(connectionId, database, true)
  await dump(conn.conn, path)
  await conn.close()
})

ipc.answerRenderer('restore:checkFile', checkDumpFile)

ipc.answerRenderer('restore:begin', async ({connectionId, database, path}: DumpRestoreRequest) => {
  const introConn = await getConnection(connectionId, undefined, true)
  const dbExists = await introConn.fetchOne(`SELECT <str>$database IN sys::Database.name`, {database})
  if (!dbExists) {
    await introConn.execute(`CREATE DATABASE ${database}`)
  }
  await introConn.close()

  const dbConn = await getConnection(connectionId, database, true)
  if (dbExists) {
    const dbEmpty = await dbConn.fetchOne(emptyDatabaseQuery)
    if (!dbEmpty) throw new Error('Cannot restore, database not empty')
  }
  await restore(dbConn.conn, path)
  await dbConn.close()
})
