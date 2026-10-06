import { describe, it, expect } from 'vitest';
import {
  bigIntToBytes32,
  signalToBytes32,
  serializeProof,
  serializeVK,
} from '../lib/proof';
import type { MockProof } from '../lib/types';
import proofFixture from './fixtures/proof.fixture.json';
import vkFixture from './fixtures/vk.fixture.json';

describe('Byte serialization & proof layer', () => {
  describe('bigIntToBytes32', () => {
    it('serializes 0n to 32 zero bytes', () => {
      const bytes = bigIntToBytes32(0n);
      expect(bytes.length).toBe(32);
      expect(bytes.every(b => b === 0)).toBe(true);
    });

    it('serializes small BigInt values into big-endian bytes', () => {
      const bytes = bigIntToBytes32(1n);
      expect(bytes.length).toBe(32);
      expect(bytes[31]).toBe(1);
      expect(bytes.slice(0, 31).every(b => b === 0)).toBe(true);

      const bytes255 = bigIntToBytes32(255n);
      expect(bytes255[31]).toBe(255);
      expect(bytes255[30]).toBe(0);

      const bytes256 = bigIntToBytes32(256n);
      expect(bytes256[31]).toBe(0);
      expect(bytes256[30]).toBe(1);
    });

    it('serializes max valid 256-bit BigInt (2^256 - 1)', () => {
      const maxVal = (1n << 256n) - 1n;
      const bytes = bigIntToBytes32(maxVal);
      expect(bytes.length).toBe(32);
      expect(bytes.every(b => b === 255)).toBe(true);
    });

    it('throws RangeError on negative BigInt values instead of generating garbage', () => {
      expect(() => bigIntToBytes32(-1n)).toThrow(RangeError);
      expect(() => bigIntToBytes32(-100n)).toThrow(/out of range/);
    });

    it('throws RangeError on values >= 2^256 instead of silently truncating', () => {
      const overflowExact = 1n << 256n;
      expect(() => bigIntToBytes32(overflowExact)).toThrow(RangeError);

      const overflowLarge = (1n << 256n) + 123456789n;
      expect(() => bigIntToBytes32(overflowLarge)).toThrow(/out of range/);

      const astronomicallyLarge = 1n << 512n;
      expect(() => bigIntToBytes32(astronomicallyLarge)).toThrow(RangeError);
    });
  });

  describe('signalToBytes32', () => {
    it('converts decimal string signals to 32-byte big-endian buffers', () => {
      const bytes = signalToBytes32('1000');
      expect(bytes.length).toBe(32);
      expect(bytes[30]).toBe(3); // 1000 = 0x03E8
      expect(bytes[31]).toBe(0xE8);
    });

    it('throws on out-of-range signal string', () => {
      const overflowStr = (1n << 256n).toString();
      expect(() => signalToBytes32(overflowStr)).toThrow(RangeError);
    });
  });

  describe('serializeProof', () => {
    const proof: MockProof = proofFixture as MockProof;

    it('serializes a Groth16 proof to exactly 256 bytes', () => {
      const buf = serializeProof(proof);
      expect(buf).toBeInstanceOf(Uint8Array);
      expect(buf.length).toBe(256);
    });

    it('preserves exact byte offsets and wire field ordering', () => {
      const buf = serializeProof(proof);

      // pi_a: x(0..32), y(32..64)
      const pi_a_x = bigIntToBytes32(BigInt(proof.pi_a[0]));
      const pi_a_y = bigIntToBytes32(BigInt(proof.pi_a[1]));
      expect(buf.subarray(0, 32)).toEqual(pi_a_x);
      expect(buf.subarray(32, 64)).toEqual(pi_a_y);

      // pi_b (G2): snarkjs stores [c0, c1] where c0 is real and c1 is imaginary.
      // Soroban wire format requires IMAGINARY FIRST:
      // x_im (64..96), x_re (96..128), y_im (128..160), y_re (160..192)
      const pi_b_x_im = bigIntToBytes32(BigInt(proof.pi_b[0][1]));
      const pi_b_x_re = bigIntToBytes32(BigInt(proof.pi_b[0][0]));
      const pi_b_y_im = bigIntToBytes32(BigInt(proof.pi_b[1][1]));
      const pi_b_y_re = bigIntToBytes32(BigInt(proof.pi_b[1][0]));

      expect(buf.subarray(64, 96)).toEqual(pi_b_x_im);
      expect(buf.subarray(96, 128)).toEqual(pi_b_x_re);
      expect(buf.subarray(128, 160)).toEqual(pi_b_y_im);
      expect(buf.subarray(160, 192)).toEqual(pi_b_y_re);

      // pi_c: x(192..224), y(224..256)
      const pi_c_x = bigIntToBytes32(BigInt(proof.pi_c[0]));
      const pi_c_y = bigIntToBytes32(BigInt(proof.pi_c[1]));
      expect(buf.subarray(192, 224)).toEqual(pi_c_x);
      expect(buf.subarray(224, 256)).toEqual(pi_c_y);
    });

    it('correctly asserts G2 imaginary and real parts are swapped relative to snarkjs array order', () => {
      const customProof: MockProof = {
        protocol: 'groth16',
        curve: 'bn128',
        pi_a: ['1', '2', '1'],
        pi_b: [
          ['10', '20'], // c0 = 10 (re), c1 = 20 (im)
          ['30', '40'], // c0 = 30 (re), c1 = 40 (im)
          ['1', '0'],
        ],
        pi_c: ['5', '6', '1'],
      };

      const buf = serializeProof(customProof);
      // Offset 64..96 must contain 20 (c1), NOT 10 (c0)
      expect(buf[95]).toBe(20);
      // Offset 96..128 must contain 10 (c0)
      expect(buf[127]).toBe(10);
      // Offset 128..160 must contain 40 (c1)
      expect(buf[159]).toBe(40);
      // Offset 160..192 must contain 30 (c0)
      expect(buf[191]).toBe(30);
    });
  });

  describe('serializeVK', () => {
    it('serializes verification key to exactly 452 + n_ic * 64 bytes', () => {
      const n_ic = vkFixture.IC.length; // 3
      const expectedLen = 452 + n_ic * 64; // 452 + 192 = 644
      const buf = serializeVK(vkFixture);
      expect(buf.length).toBe(expectedLen);
    });

    it('encodes n_ic as big-endian u32 at offset 448..452', () => {
      const buf = serializeVK(vkFixture);
      const n_ic = vkFixture.IC.length;
      expect(buf[448]).toBe((n_ic >> 24) & 0xff);
      expect(buf[449]).toBe((n_ic >> 16) & 0xff);
      expect(buf[450]).toBe((n_ic >> 8) & 0xff);
      expect(buf[451]).toBe(n_ic & 0xff);
    });

    it('encodes alpha G1 (0..64) and delta G2 (320..448) at proper wire offsets', () => {
      const buf = serializeVK(vkFixture);
      const alpha_x = bigIntToBytes32(BigInt(vkFixture.vk_alpha_1[0]));
      const alpha_y = bigIntToBytes32(BigInt(vkFixture.vk_alpha_1[1]));

      expect(buf.subarray(0, 32)).toEqual(alpha_x);
      expect(buf.subarray(32, 64)).toEqual(alpha_y);

      // Delta is G2 (im first):
      const delta_x_im = bigIntToBytes32(BigInt(vkFixture.vk_delta_2[0][1]));
      const delta_x_re = bigIntToBytes32(BigInt(vkFixture.vk_delta_2[0][0]));
      expect(buf.subarray(320, 352)).toEqual(delta_x_im);
      expect(buf.subarray(352, 384)).toEqual(delta_x_re);
    });

    it('encodes IC G1 elements starting at offset 452', () => {
      const buf = serializeVK(vkFixture);
      const ic0_x = bigIntToBytes32(BigInt(vkFixture.IC[0][0]));
      const ic0_y = bigIntToBytes32(BigInt(vkFixture.IC[0][1]));
      expect(buf.subarray(452, 484)).toEqual(ic0_x);
      expect(buf.subarray(484, 516)).toEqual(ic0_y);

      const ic1_x = bigIntToBytes32(BigInt(vkFixture.IC[1][0]));
      expect(buf.subarray(516, 548)).toEqual(ic1_x);
    });
  });
});
