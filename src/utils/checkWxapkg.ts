import { WxapkgKeyFile, WxapkgType } from '@/enum'
import { isProduciblePath, PathController, ProduciblePath } from '@core/controller/PathController'

export function checkMacEncryption(buf: Buffer): boolean {
  const encryptedForMac = 'WAPkgEncryptedTagForMac'
  return buf.subarray(-encryptedForMac.length).toString() !== encryptedForMac
}
export function checkWxapkg<T extends Error>(path: ProduciblePath, throws?: string | T): boolean
export function checkWxapkg<T extends Error>(buff: Buffer, throws?: string | T): boolean

export function checkWxapkg(v: unknown, throws?: unknown): boolean {
  const buf = (isProduciblePath(v) ? PathController.make(v).readSync() : v) as Buffer
  const invalid = buf.readUInt8(0) === 0xbe && buf.readUInt8(13) === 0xed
  if (throws && !invalid) throw typeof throws === 'string' ? Error(throws) : throws
  return invalid
}

export async function checkWxapkgType(path: ProduciblePath): Promise<WxapkgType>
export async function checkWxapkgType(list: string[]): Promise<WxapkgType>
export async function checkWxapkgType(v: ProduciblePath | string[]): Promise<WxapkgType | null> {
  let fileList: string[]
  if (isProduciblePath(v)) {
    const pCtrl = PathController.make(v)
    if (!pCtrl.isDirectory) throw Error(`Path ${v} is not a directory`)
    fileList = await pCtrl.readdir()
  } else {
    fileList = v as string[]
  }
  if (fileList.every((filename) => filename.startsWith('WA'))) return WxapkgType.FRAMEWORK
  // APP_V1/APP_V4
  if (fileList.includes(WxapkgKeyFile.PAGE_FRAME_HTML)) {
    if (fileList.includes(WxapkgKeyFile.COMMON_APP)) return WxapkgType.APP_V4
    return WxapkgType.APP_V1
  }
  // APP_V3/APP_SUBPACKAGE_V2
  if (fileList.includes(WxapkgKeyFile.COMMON_APP))
    return fileList.includes(WxapkgKeyFile.APP_WXSS) ? WxapkgType.APP_V3 : WxapkgType.APP_SUBPACKAGE_V2
  // APP_V2/APP_SUBPACKAGE_V1
  if (fileList.includes(WxapkgKeyFile.PAGE_FRAME))
    return fileList.includes(WxapkgKeyFile.APP_WXSS) ? WxapkgType.APP_V2 : WxapkgType.APP_SUBPACKAGE_V1
  // GAME/GAME_SUBPACKAGE
  if (fileList.includes(WxapkgKeyFile.GAME))
    return fileList.includes(WxapkgKeyFile.APP_CONFIG) ? WxapkgType.GAME : WxapkgType.GAME_SUBPACKAGE
  // APP_PLUGIN_V1/GAME_PLUGIN
  if (fileList.includes(WxapkgKeyFile.PLUGIN_JSON)) {
    if (fileList.includes(WxapkgKeyFile.APPSERVICE)) return WxapkgType.APP_PLUGIN_V1
    if (fileList.includes(WxapkgKeyFile.PLUGIN)) return WxapkgType.GAME_PLUGIN
  }
  // not found
  return null
}
