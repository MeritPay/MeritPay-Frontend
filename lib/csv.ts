export interface EmployeeRow {
  id: number;
  name: string;
  baseSalary: number;
  hoursThreshold: number;
  hoursBonus: number;
  salesBonus: number;
}

export const MAX_EMPLOYEES = 5;

let _nextId = 1;

export function parseCSV(text: string): EmployeeRow[] | string {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return 'CSV must have a header row and at least one data row.';

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const required = ['name', 'base_salary', 'hours_threshold', 'hours_bonus', 'sales_bonus'];
  const missing = required.filter(r => !headers.includes(r));
  if (missing.length) return `Missing columns: ${missing.join(', ')}`;

  const rows: EmployeeRow[] = [];
  for (let i = 1; i < lines.length && rows.length < MAX_EMPLOYEES; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const col = (key: string) => values[headers.indexOf(key)] ?? '';
    
    const name = col('name').slice(0, 100);
    const baseSalary = parseFloat(col('base_salary')) || 0;
    const hoursThreshold = parseInt(col('hours_threshold')) || 160;
    const hoursBonus = parseFloat(col('hours_bonus')) || 0;
    const salesBonus = parseFloat(col('sales_bonus')) || 0;
    
    // Validate numeric ranges to prevent injection and overflow
    if (!Number.isFinite(baseSalary) || baseSalary < 0 || baseSalary > 1000000) {
      return `Row ${i + 1}: Invalid base salary. Must be between 0 and 1,000,000.`;
    }
    if (!Number.isFinite(hoursThreshold) || hoursThreshold < 1 || hoursThreshold > 10000) {
      return `Row ${i + 1}: Invalid hours threshold. Must be between 1 and 10,000.`;
    }
    if (!Number.isFinite(hoursBonus) || hoursBonus < 0 || hoursBonus > 100000) {
      return `Row ${i + 1}: Invalid hours bonus. Must be between 0 and 100,000.`;
    }
    if (!Number.isFinite(salesBonus) || salesBonus < 0 || salesBonus > 100000) {
      return `Row ${i + 1}: Invalid sales bonus. Must be between 0 and 100,000.`;
    }
    if (!name || name.length === 0) {
      return `Row ${i + 1}: Employee name cannot be empty.`;
    }
    
    rows.push({
      id: _nextId++,
      name,
      baseSalary,
      hoursThreshold,
      hoursBonus,
      salesBonus,
    });
  }
  return rows;
}
