import { describe, it, expect } from 'vitest';
import {
  formatSimulationError,
  formatClaimSimulationError,
} from '../lib/stellar';

describe('Stellar contract error code mappers', () => {
  describe('formatSimulationError (Payroll Contract)', () => {
    const payrollTestCases: [number, string][] = [
      [1, 'Contract is already initialized.'],
      [2, 'Contract is not initialized.'],
      [3, 'Unauthorized — connect the contract admin wallet.'],
      [4, 'Nullifier already spent — regenerate proofs for the next payroll epoch (do not reuse an old aggregated proof).'],
      [5, 'Invalid ZK proof — verification failed on-chain.'],
      [6, 'Insufficient pool balance — fund the pool before executing payroll.'],
      [7, 'Invalid payroll amount — total must be positive.'],
      [8, 'Claim contract not configured — redeploy or call set_claim_contract.'],
    ];

    it.each(payrollTestCases)(
      'maps payroll error code #%i to readable message',
      (code, expectedMessage) => {
        const raw = `HostError: Error(Contract, #${code})`;
        const formatted = formatSimulationError(raw);
        expect(formatted).toBe(`Simulation failed: ${expectedMessage} (Contract error #${code})`);
      },
    );

    it('falls back to raw message for unknown contract code', () => {
      const raw = 'HostError: Error(Contract, #99)';
      const formatted = formatSimulationError(raw);
      expect(formatted).toBe('Simulation failed: HostError: Error(Contract, #99)');
    });

    it('falls back to raw message for generic network or RPC failure', () => {
      const raw = 'Transaction rejected: expired ledger seq';
      const formatted = formatSimulationError(raw);
      expect(formatted).toBe('Simulation failed: Transaction rejected: expired ledger seq');
    });
  });

  describe('formatClaimSimulationError (Claim Contract)', () => {
    const claimTestCases: [number, string][] = [
      [1, 'Claim contract is already initialized.'],
      [2, 'Claim contract is not initialized.'],
      [3, 'Payroll batch not authorized — wait for employer to execute payroll first.'],
      [4, 'This payout has already been claimed.'],
      [5, 'Invalid claim proof — verification failed on-chain.'],
      [6, 'Invalid claim amount.'],
      [7, 'Insufficient escrow in the claim contract.'],
      [8, 'Payroll epoch has not been executed yet.'],
      [9, 'Proof public signals do not match claim arguments.'],
    ];

    it.each(claimTestCases)(
      'maps claim error code #%i to readable message',
      (code, expectedMessage) => {
        const raw = `HostError: Error(Contract, #${code})`;
        const formatted = formatClaimSimulationError(raw);
        expect(formatted).toBe(`Simulation failed: ${expectedMessage} (Contract error #${code})`);
      },
    );

    it('falls through to formatSimulationError if error is unknown contract code', () => {
      const raw = 'HostError: Error(Contract, #99)';
      const formatted = formatClaimSimulationError(raw);
      expect(formatted).toBe('Simulation failed: HostError: Error(Contract, #99)');
    });
  });
});
