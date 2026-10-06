import { describe, it, expect } from 'vitest';
import {
  computePayoutCircuit,
  payoutCircuitToXlm,
  payoutCircuitToStroops,
  buildClaimEntry,
} from '../lib/claim';

describe('Claim & Payout calculation helpers', () => {
  describe('computePayoutCircuit', () => {
    it('returns base salary when neither KPI threshold is met', () => {
      const payout = computePayoutCircuit(5000, false, false);
      expect(payout).toBe(5000);
    });

    it('adds 20% bonus when only hours threshold is met', () => {
      // 5000 + 20% of 5000 = 5000 + 1000 = 6000
      const payout = computePayoutCircuit(5000, true, false);
      expect(payout).toBe(6000);
    });

    it('adds 10% bonus when only sales threshold is met', () => {
      // 5000 + 10% of 5000 = 5000 + 500 = 5500
      const payout = computePayoutCircuit(5000, false, true);
      expect(payout).toBe(5500);
    });

    it('adds 30% combined bonus when both hours and sales thresholds are met', () => {
      // 5000 + 30% of 5000 = 5000 + 1500 = 6500
      const payout = computePayoutCircuit(5000, true, true);
      expect(payout).toBe(6500);
    });

    it('correctly floors bonus calculation for fractional values', () => {
      // base 4333: 4333 * 20% = 866.6 -> floor 866 -> 5199
      const payout = computePayoutCircuit(4333, true, false);
      expect(payout).toBe(4333 + Math.floor(4333 * 0.20));
      expect(payout).toBe(5199);
    });

    it('handles zero base salary cleanly', () => {
      const payout = computePayoutCircuit(0, true, true);
      expect(payout).toBe(0);
    });
  });

  describe('payoutCircuitToXlm', () => {
    it('converts circuit units to XLM at 1 unit = 0.001 XLM', () => {
      expect(payoutCircuitToXlm(5000)).toBe(5);
      expect(payoutCircuitToXlm(1000)).toBe(1);
      expect(payoutCircuitToXlm(6500)).toBe(6.5);
      expect(payoutCircuitToXlm(0)).toBe(0);
    });
  });

  describe('payoutCircuitToStroops', () => {
    it('converts circuit units to stroops (units * 10,000n)', () => {
      // 5000 circuit units = 50,000,000 stroops (0.5 XLM in stroops = 5e6, 5 XLM = 50,000,000 stroops)
      expect(payoutCircuitToStroops(5000)).toBe(50000000n);
      expect(payoutCircuitToStroops(1000)).toBe(10000000n);
      expect(payoutCircuitToStroops(0)).toBe(0n);
    });

    it('rounds fractional units before multiplying to integer stroops', () => {
      expect(payoutCircuitToStroops(5000.4)).toBe(50000000n);
      expect(payoutCircuitToStroops(5000.6)).toBe(50010000n);
    });
  });

  describe('buildClaimEntry', () => {
    it('constructs a valid claim entry with computed payout', () => {
      const entry = buildClaimEntry({
        employeeId: 1,
        name: 'Alice',
        nullifier: '0x1234567890abcdef',
        payrollEpoch: 2,
        baseSalary: 5000,
        hoursThreshold: 160,
        kpiInputs: {
          employeeId: 1,
          hoursWorked: 165,
          salesFlag: 1,
          salt: '0xabc',
        },
        hoursMet: true,
        salesMet: true,
      });

      expect(entry.employeeId).toBe(1);
      expect(entry.name).toBe('Alice');
      expect(entry.nullifier).toBe('0x1234567890abcdef');
      expect(entry.payrollEpoch).toBe(2);
      expect(entry.baseSalary).toBe(5000);
      expect(entry.payoutCircuit).toBe(6500); // 5000 + 30%
    });
  });
});
