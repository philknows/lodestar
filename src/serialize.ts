/** @module ssz */
import BN from "bn.js";

import {
  AnySSZType,
  ArrayType,
  Bool,
  Bytes,
  BytesType,
  ContainerType,
  FullSSZType,
  SerializableArray,
  SerializableObject,
  SerializableValue,
  Type,
  Uint,
  UintType,
} from "./types";

import { BYTES_PER_LENGTH_PREFIX } from "./constants";

import { size, fixedSize } from "./size";

import { parseType, isVariableSizeType } from "./util/types";
import { assertValidValue } from "./assertValidValue";


/**
 * Serialize, according to the SSZ spec
 *
 * ```typescript
 * let buf: Buffer;
 *
 * // serialize a number
 * buf = serialize(
 *   10,
 *   "uint64" // "uintN", N == length in bits
 * );
 *
 * // serialize a BN bignumber
 * import BN from "bn.js";
 * buf = serialize(new BN("1000000000000000000"), "uint64");
 *
 * // serialize a boolean
 * buf = serialize(true, "bool");
 *
 * // serialize a variable-length byte array
 * buf = serialize(Buffer.from("abcd", "hex"), "bytes");
 *
 * // serialize a fixed-length byte array
 * buf = serialize(
 *   Buffer.from("abcd", "hex"),
 *   "bytes2" // "bytesN", N == length in bytes
 * );
 *
 * // serialize a variable-length array
 * buf = serialize(
 *   [0, 1, 2, 3, 4, 5],
 *   ["uint32"] // [elementType]
 * );
 *
 * // serialize a fixed-length array
 * buf = serialize(
 *   [0, 1, 2, 3, 4, 5],
 *   ["uint32", 6] // [elementType, arrayLength]
 * );
 *
 * // serialize an object
 * const myDataType: SimpleContainerType = {
 *   name: "MyData",
 *   fields: [
 *     ["a", "uint16"], // [fieldName, fieldType]
 *     ["b", "bool"],
 *     ["c", "bytes96"],
 *   ],
 * };
 * buf = serialize({a: 10, b: false, c: Buffer.alloc(96)}, myDataType);
 * ```
 */
export function serialize(value: any, type: AnySSZType): Buffer {
  const _type = parseType(type);
  assertValidValue(value, _type);
  const buf = Buffer.alloc(size(value, _type));
  _serialize(value, _type, buf, 0);
  return buf;
}

/** @ignore */
function _serializeUint(value: Uint, type: UintType, output: Buffer, start: number): number {
  const offset = start + type.byteLength;
  let bnValue: BN;
  if (type.byteLength > 6 && type.useNumber && value === Infinity) {
    bnValue = new BN(Buffer.alloc(type.byteLength, 255));
  } else {
    bnValue = (new BN(value)).add(new BN(type.offset));
  }
  bnValue.toArrayLike(Buffer, "le", type.byteLength)
    .copy(output, start);
  return offset;
}

/** @ignore */
function _serializeBool(value: Bool, output: Buffer, start: number): number {
  const offset = start + 1;
  if (value) {
    output.writeUInt8(1, start);
  } else {
    output.writeUInt8(0, start);
  }
  return offset;
}

/** @ignore */
function _serializeByteArray(value: Bytes, type: BytesType, output: Buffer, start: number): number {
  const length = type.type === Type.byteVector ? type.length : value.length;
  const offset = start + length;
  (Buffer.isBuffer(value) ? value : Buffer.from(value))
    .copy(output, start);
  return offset;
}

/** @ignore */
function _serializeArray(value: SerializableArray, type: ArrayType, output: Buffer, start: number): number {
  let index = start;
  if (isVariableSizeType(type.elementType)) {
    // all elements are variable-size
    let fixedIndex = index;
    let currentOffsetIndex = start + value.length * BYTES_PER_LENGTH_PREFIX;
    let nextOffsetIndex = currentOffsetIndex;
    for (const v of value) {
      // write serialized element to variable section
      nextOffsetIndex = _serialize(v, type.elementType, output, currentOffsetIndex);
      // write offset
      output.writeUIntLE(currentOffsetIndex - start, fixedIndex, BYTES_PER_LENGTH_PREFIX)
      // update offset
      currentOffsetIndex = nextOffsetIndex;
      fixedIndex += BYTES_PER_LENGTH_PREFIX;
    }
    index = currentOffsetIndex;
  } else {
    // all elements are fixed-size
    for (const v of value) {
      index = _serialize(v, type.elementType, output, index);
    }
  }
  return index;
}

/** @ignore */
function _serializeObject(value: SerializableObject, type: ContainerType, output: Buffer, start: number): number {
  let fixedIndex = start;
  let fixedLength = type.fields
    .map(([_, fieldType]) => isVariableSizeType(fieldType) ? BYTES_PER_LENGTH_PREFIX : fixedSize(fieldType))
    .reduce((a, b) => a + b, 0)
  let currentOffsetIndex = start + fixedLength;
  let nextOffsetIndex = currentOffsetIndex;
  for (const [fieldName, fieldType] of type.fields) {
    if (isVariableSizeType(fieldType)) {
      // field type is variable-size
      // write serialized element to variable section
      nextOffsetIndex = _serialize(value[fieldName], fieldType, output, currentOffsetIndex);
      // write offset
      output.writeUIntLE(currentOffsetIndex - start, fixedIndex, BYTES_PER_LENGTH_PREFIX)
      // update offset
      currentOffsetIndex = nextOffsetIndex;
      fixedIndex += BYTES_PER_LENGTH_PREFIX;
    } else {
      fixedIndex = _serialize(value[fieldName], fieldType, output, fixedIndex);
    }
  }

  return currentOffsetIndex;
}

/**
 * Low level serialize
 * @ignore
 * @param type full ssz type
 * @param output buffer for writing serialized data
 * @param start starting index
 */
export function _serialize(value: SerializableValue, type: FullSSZType, output: Buffer, start: number): number {
  switch(type.type) {
    case Type.bool:
      return _serializeBool(value as Bool, output, start);
    case Type.uint:
      return _serializeUint(value as Uint, type, output, start);
    case Type.byteList:
    case Type.byteVector:
      return _serializeByteArray(value as Bytes, type, output, start);
    case Type.list:
    case Type.vector:
      return _serializeArray(value as SerializableArray, type, output, start);
    case Type.container:
      return _serializeObject(value as SerializableObject, type, output, start);
  }
}
