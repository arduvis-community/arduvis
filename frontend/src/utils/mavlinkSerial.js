/**
 * mavlinkSerial.js
 * Minimal MAVLink v1 implementation over Web Serial API.
 * Supports only the messages needed for parameter read/write:
 *   HEARTBEAT (0), PARAM_REQUEST_LIST (21), PARAM_VALUE (22), PARAM_SET (23)
 *
 * Ground station identity: sysid=255, compid=190 (matching pymavlink GCS defaults)
 * Target vehicle: sysid=1, compid=1 (standard ArduPilot)
 */

// ── CRC-16/MCRF4XX (MAVLink X.25) ────────────────────────────────────────────

function crcAccumulate(byte, crc) {
  const tmp = (byte ^ crc) & 0xFF
  const tmp2 = (tmp ^ (tmp << 4)) & 0xFF
  return ((crc >> 8) ^ (tmp2 << 8) ^ (tmp2 << 3) ^ (tmp2 >> 4)) & 0xFFFF
}

function crcCalculate(buf, extra) {
  let crc = 0xFFFF
  for (let i = 1; i < buf.length; i++) crc = crcAccumulate(buf[i], crc)
  crc = crcAccumulate(extra, crc)
  return crc
}

// CRC extra bytes per message ID (computed from MAVLink message definition hash)
const CRC_EXTRA = { 0: 50, 21: 159, 22: 220, 23: 168 }

const GCS_SYSID  = 255
const GCS_COMPID = 190
const FC_SYSID   = 1
const FC_COMPID  = 1

let _seq = 0
const nextSeq = () => { _seq = (_seq + 1) & 0xFF; return _seq }

// ── Message encoders ──────────────────────────────────────────────────────────

function encodeHeartbeat() {
  // type=6 (GCS), autopilot=8 (invalid/GCS), base_mode=0, custom_mode=0, system_status=0, mavlink_version=3
  const payload = new Uint8Array(9)
  const view = new DataView(payload.buffer)
  view.setUint32(0, 0, true)   // custom_mode
  view.setUint8(4, 6)          // type: GCS
  view.setUint8(5, 8)          // autopilot: invalid
  view.setUint8(6, 0)          // base_mode
  view.setUint8(7, 0)          // system_status
  view.setUint8(8, 3)          // mavlink_version
  return buildFrame(0, payload)
}

function encodeParamRequestList() {
  const payload = new Uint8Array(2)
  payload[0] = FC_SYSID
  payload[1] = FC_COMPID
  return buildFrame(21, payload)
}

function encodeParamSet(paramId, value, paramType = 9) {
  // paramType 9 = MAV_PARAM_TYPE_REAL32 (float)
  const payload = new Uint8Array(23)
  const view = new DataView(payload.buffer)
  view.setFloat32(0, value, true)       // param_value
  payload[4] = FC_SYSID
  payload[5] = FC_COMPID
  // param_id: null-padded to 16 bytes
  const idBytes = new TextEncoder().encode(paramId.substring(0, 16))
  payload.set(idBytes, 6)
  payload[22] = paramType
  return buildFrame(23, payload)
}

function buildFrame(msgId, payload) {
  const len = payload.length
  const frame = new Uint8Array(6 + len + 2)
  frame[0] = 0xFE             // MAVLink v1 magic
  frame[1] = len
  frame[2] = nextSeq()
  frame[3] = GCS_SYSID
  frame[4] = GCS_COMPID
  frame[5] = msgId
  frame.set(payload, 6)
  const crc = crcCalculate(frame.subarray(1, 6 + len), CRC_EXTRA[msgId])
  frame[6 + len]     = crc & 0xFF
  frame[6 + len + 1] = (crc >> 8) & 0xFF
  return frame
}

// ── Message decoder ───────────────────────────────────────────────────────────

function decodeParamValue(payload) {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  const value      = view.getFloat32(0, true)
  const paramCount = view.getUint16(4, true)
  const paramIndex = view.getUint16(6, true)
  // param_id is null-terminated char[16] at offset 8
  let paramId = ''
  for (let i = 8; i < 24 && payload[i] !== 0; i++) paramId += String.fromCharCode(payload[i])
  const paramType = payload[24]
  return { paramId, value, paramCount, paramIndex, paramType }
}

// ── Frame parser (streaming) ──────────────────────────────────────────────────

export function createParser() {
  let buf = []

  return function parse(bytes) {
    const messages = []
    for (const byte of bytes) {
      buf.push(byte)
      // Sync on MAVLink v1 magic
      if (buf[0] !== 0xFE) { buf = []; continue }
      if (buf.length < 6) continue
      const len = buf[1]
      const totalLen = 6 + len + 2
      if (buf.length < totalLen) continue
      const frame = new Uint8Array(buf.splice(0, totalLen))
      const msgId = frame[5]
      if (!(msgId in CRC_EXTRA)) continue   // unknown message, skip
      const expected = crcCalculate(frame.subarray(1, 6 + len), CRC_EXTRA[msgId])
      const actual   = frame[6 + len] | (frame[6 + len + 1] << 8)
      if (expected !== actual) { buf = []; continue }
      const payload = frame.subarray(6, 6 + len)
      if (msgId === 22) messages.push({ msgId, data: decodeParamValue(payload) })
      else              messages.push({ msgId, payload })
    }
    return messages
  }
}

// ── High-level session class ──────────────────────────────────────────────────

export class MavlinkSerialSession {
  constructor(port) {
    this._port   = port
    this._writer = null
    this._reader = null
    this._parse  = createParser()
    this._running = false
    this._msgHandlers = []     // [{msgId, resolve, reject, timeout}]
    this._paramHandlers = []   // [{paramId, resolve, reject}]
    this.onParam = null        // callback(paramId, value, index, total)
    this.onHeartbeat = null
    this.onDisconnect = null
  }

  async open(baudRate = 115200) {
    await this._port.open({ baudRate })
    this._writer = this._port.writable.getWriter()
    this._running = true
    this._readLoop()
    this._heartbeatInterval = setInterval(() => this._send(encodeHeartbeat()), 1000)
  }

  async close() {
    this._running = false
    clearInterval(this._heartbeatInterval)
    try { this._reader?.cancel() } catch {}
    try { this._writer?.releaseLock() } catch {}
    try { await this._port.close() } catch {}
  }

  async _send(frame) {
    try { await this._writer.write(frame) } catch {}
  }

  async _readLoop() {
    this._reader = this._port.readable.getReader()
    try {
      while (this._running) {
        const { value, done } = await this._reader.read()
        if (done) break
        if (!value) continue
        const messages = this._parse(value)
        for (const msg of messages) {
          if (msg.msgId === 0 && this.onHeartbeat) this.onHeartbeat()
          if (msg.msgId === 22 && this.onParam) {
            const { paramId, value: v, paramIndex, paramCount } = msg.data
            this.onParam(paramId, v, paramIndex, paramCount)
          }
        }
      }
    } catch (err) {
      if (this._running && this.onDisconnect) this.onDisconnect(err)
    } finally {
      try { this._reader.releaseLock() } catch {}
    }
  }

  async requestAllParams(onProgress) {
    return new Promise((resolve, reject) => {
      const params = {}
      let total = null
      let received = 0
      let timeout

      const resetTimeout = () => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          // If we got most params, accept — some FC firmware skips a few
          if (total && received >= total * 0.99) resolve(params)
          else reject(new Error(`Param download timed out (${received}/${total ?? '?'} received)`))
        }, 5000)
      }

      this.onParam = (paramId, value, paramIndex, paramCount) => {
        if (total === null) total = paramCount
        if (!(paramId in params)) {
          params[paramId] = value
          received++
          if (onProgress) onProgress(received, total)
        }
        resetTimeout()
        if (received >= total) {
          clearTimeout(timeout)
          this.onParam = null
          resolve(params)
        }
      }

      resetTimeout()
      this._send(encodeParamRequestList())
    })
  }

  async setParam(paramId, value, paramType = 9) {
    await this._send(encodeParamSet(paramId, value, paramType))
  }

  async uploadParams(params) {
    const entries = Object.entries(params)
    for (let i = 0; i < entries.length; i++) {
      const [paramId, value] = entries[i]
      await this.setParam(paramId, parseFloat(value))
      // Small delay between sets to avoid overwhelming the FC buffer
      await new Promise(r => setTimeout(r, 20))
    }
  }
}
