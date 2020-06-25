import { Set as EdgeDBSet } from 'edgedb/datatypes/set'
import { CodecsRegistry } from 'edgedb/codecs/registry'
import { ICodec, CodecKind, BaseScalarName, ScalarCodec } from 'edgedb/codecs/ifaces'
import { ReadBuffer } from 'edgedb/buffer'
import { ObjectCodec } from 'edgedb/codecs/object'
import { UUIDCodec }  from 'edgedb/codecs/uuid'
import { deepSeal } from './misc'

enum TransactionStatus {
  TRANS_IDLE = 0, // connection idle
  TRANS_ACTIVE = 1, // command in progress
  TRANS_INTRANS = 2, // idle, within transaction block
  TRANS_INERROR = 3, // idle, within failed transaction
  TRANS_UNKNOWN = 4, // cannot determine status
}

export {
  EdgeDBSet,
  CodecKind,
  ObjectCodec,
  ICodec,
  BaseScalarName,
  ScalarCodec,
  UUIDCodec,
  TransactionStatus,
}

const ipc = (window as any).ipc

const codecRegistry = new CodecsRegistry()

export async function decodeRawResult(resultBuf: Uint8Array, typeId: string) {
  const result = new EdgeDBSet(),
        buf = new ReadBuffer(typedArrayToBuffer(resultBuf))

  let codec = codecRegistry.getCodec(typeId)
  if (!codec) {
    const typeData: Uint8Array = await ipc.callMain('connections:getTypeData', typeId)
    if (!typeData) throw new Error('Cannot retrieve type data')
    codec = codecRegistry.buildCodec(typeId, typedArrayToBuffer(typeData))
    deepSeal(codec)
  }

  while (buf.length) {
    const blockLen = buf.readUInt32(),
          block = new ReadBuffer(buf.readBuffer(blockLen))

    result.push(codec.decode(block))
  }

  return {result, codec}
}

function typedArrayToBuffer(arr: Uint8Array) {
  let buf = Buffer.from(arr.buffer)
  if (arr.byteLength !== arr.buffer.byteLength) {
    buf = buf.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
  }
  return buf
}

export function extractTids(result: EdgeDBSet, codec: ICodec) {
  const tids = new Set<string>()
  result.forEach(item => _extractTids(item, codec, tids))
  return tids
}

function _extractTids(item: any, codec: ICodec, tids: Set<string>) {
  tids.add(codec.tid)
  const subcodecs = codec.getSubcodecs()
  switch (codec.getKind()) {
    case 'object':
      tids.add(item.__tid__.toRawString())
      codec.getSubcodecsNames().forEach((name, i) => {
        _extractTids(item[name], subcodecs[i], tids)
      })
      break;
    case 'set':
    case 'array':
      (item as any[]).forEach((child) => {
        _extractTids(child, subcodecs[0], tids)
      })
      break;
    case 'tuple':
    case 'namedtuple':
      (item as any[]).forEach((child, i) => {
        _extractTids(child, subcodecs[i], tids)
      })
      break;
  }
}
