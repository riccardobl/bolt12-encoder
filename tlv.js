export function addToTLVSteam (tlvs, newTLV, replaceIfExists = true) {
  const { type } = newTLV
  for (let i = 0; i < tlvs.length; i++) {
    if (tlvs[i].type === type) {
      tlvs[i] = newTLV
      break
    } else if (tlvs[i].type > type) {
      tlvs.splice(i, 0, newTLV)
      break
    }
  }
}

export function deserializeTLVStream (buff) {
  const tlvs = []
  let bytePos = 0
  while (bytePos < buff.length) {
    const [type, typeLength] = readBigSize(buff, bytePos)
    bytePos += typeLength

    let [length, lengthLength] = readBigSize(buff, bytePos)
    length = Number(length)
    bytePos += lengthLength

    if (bytePos + length > buff.length) {
      throw new Error('Invalid TLV')
    }

    const value = buff.subarray(bytePos, bytePos + length)
    bytePos += length

    tlvs.push({ type, length, value })
  }
  return tlvs
}

export function serializeTLVStream (tlvs) {
  const buffers = []
  for (const tlv of tlvs) {
    buffers.push(toBigSize(tlv.type))
    buffers.push(toBigSize(tlv.length))
    buffers.push(tlv.value)
  }
  return Buffer.concat(buffers)
}

function readBigSize (buf, offset) {
  if (buf[offset] <= 252) {
    return [BigInt(buf[offset]), 1]
  } else if (buf[offset] === 253) {
    return [BigInt(buf.readUInt16BE(offset + 1)), 3]
  } else if (buf[offset] === 254) {
    return [BigInt(buf.readUInt32BE(offset + 1)), 5]
  } else if (buf[offset] === 255) {
    return [buf.readBigUInt64BE(offset + 1), 9]
  } else {
    throw new Error('Invalid bigsize')
  }
}

function toBigSize (x) {
  x = BigInt(x)
  if (x < 0n) throw new Error('Negative bigsize')
  if (x < 0xfd) {
    const buf = Buffer.alloc(1)
    buf.writeUInt8(x)
    return buf
  } else if (x < 0x10000) {
    const buf = Buffer.alloc(3)
    buf.writeUInt8(0xfd)
    buf.writeUInt16BE(x, 1)
    return buf
  } else if (x < 0x100000000) {
    const buf = Buffer.alloc(5)
    buf.writeUInt8(0xfe)
    buf.writeUInt32BE(x, 1)
    return buf
  } else {
    const buf = Buffer.alloc(9)
    buf.writeUInt8(0xff)
    buf.writeBigUInt64BE(BigInt(x), 1)
    return buf
  }
}
