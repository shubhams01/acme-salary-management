import { createHash } from "node:crypto";

export function stableIndex(index: number, salt: number, length: number): number {
  return (Math.imul(index ^ salt, 2_654_435_761) >>> 0) % length;
}

export function stableUuid(value: string): string {
  const namespace = Buffer.from("f4d9a5ce5f774b999ee3526c03fae671", "hex");
  const digest = createHash("sha1")
    .update(namespace)
    .update(value)
    .digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
