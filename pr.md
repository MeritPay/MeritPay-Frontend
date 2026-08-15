# fix: remove sensitive console logging from payroll proof generation

## Description

A follow-up security fix to the earlier audit in [SECURITY_REPORT.md](./SECURITY_REPORT.md). That pass removed sensitive `console.log` statements from `lib/stellar.ts` but missed an equivalent leak in `lib/proof.ts`.

`generatePayrollProof()` logged the full payroll circuit input — base salaries, employee IDs, hours thresholds, and total payroll — to the browser console before generating the ZK proof. Since this data ends up in the client console (and potentially in error-reporting/log-aggregation tools that capture console output), it undermines the privacy goal of using zero-knowledge proofs for payroll in the first place.

## Change

- `lib/proof.ts`: removed the two `console.log` calls in `generatePayrollProof()` that dumped circuit input (salaries, employee IDs, thresholds, totals) and a debug status line.

## Testing

- `npm run build` — compiles cleanly
- `npm run lint` — passes

## Files Modified

| File | Change |
|------|--------|
| `lib/proof.ts` | Removed sensitive console logging of payroll circuit inputs |
