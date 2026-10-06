import { describe, it, expect } from 'vitest';
import { parseCSV } from '../app/employer/page';

describe('CSV Parser (employer payroll batch import)', () => {
  const validHeader = 'name,base_salary,hours_threshold,hours_bonus,sales_bonus';

  it('rejects empty input or input with no data rows', () => {
    expect(parseCSV('')).toBe('CSV must have a header row and at least one data row.');
    expect(parseCSV('   \n\n ')).toBe('CSV must have a header row and at least one data row.');
    expect(parseCSV(validHeader)).toBe('CSV must have a header row and at least one data row.');
  });

  it('validates required headers and reports missing columns', () => {
    const incompleteHeader = 'name,base_salary,hours_bonus';
    const csv = `${incompleteHeader}\nAlice,5000,500`;
    const res = parseCSV(csv);
    expect(typeof res).toBe('string');
    expect(res).toContain('Missing columns:');
    expect(res).toContain('hours_threshold');
    expect(res).toContain('sales_bonus');
  });

  it('parses valid CSV rows with trimmed headers and whitespace', () => {
    const csv = `
      Name, Base Salary, Hours Threshold, Hours Bonus, Sales Bonus
      Alice, 5000, 160, 500, 250
      Bob, 4200, 150, 400, 200
    `;
    const res = parseCSV(csv);
    expect(Array.isArray(res)).toBe(true);
    if (Array.isArray(res)) {
      expect(res.length).toBe(2);
      expect(res[0].name).toBe('Alice');
      expect(res[0].baseSalary).toBe(5000);
      expect(res[0].hoursThreshold).toBe(160);
      expect(res[0].hoursBonus).toBe(500);
      expect(res[0].salesBonus).toBe(250);

      expect(res[1].name).toBe('Bob');
      expect(res[1].baseSalary).toBe(4200);
    }
  });

  it('enforces maximum row cap of 5 employees per aggregated proof batch', () => {
    const lines = [validHeader];
    for (let i = 1; i <= 8; i++) {
      lines.push(`Emp${i},5000,160,500,250`);
    }
    const res = parseCSV(lines.join('\n'));
    expect(Array.isArray(res)).toBe(true);
    if (Array.isArray(res)) {
      expect(res.length).toBe(5);
    }
  });

  it('validates base salary limits (0 <= baseSalary <= 1,000,000)', () => {
    const negativeSalary = `${validHeader}\nAlice,-100,160,500,250`;
    expect(parseCSV(negativeSalary)).toContain('Invalid base salary');

    const excessiveSalary = `${validHeader}\nAlice,2000000,160,500,250`;
    expect(parseCSV(excessiveSalary)).toContain('Invalid base salary');
  });

  it('validates hours threshold limits (1 <= hoursThreshold <= 10,000)', () => {
    const negativeHours = `${validHeader}\nAlice,5000,-5,500,250`;
    expect(parseCSV(negativeHours)).toContain('Invalid hours threshold');

    const excessiveHours = `${validHeader}\nAlice,5000,20000,500,250`;
    expect(parseCSV(excessiveHours)).toContain('Invalid hours threshold');
  });

  it('validates bonus limits (0 <= bonus <= 100,000)', () => {
    const negativeBonus = `${validHeader}\nAlice,5000,160,-50,250`;
    expect(parseCSV(negativeBonus)).toContain('Invalid hours bonus');

    const excessiveSalesBonus = `${validHeader}\nAlice,5000,160,500,500000`;
    expect(parseCSV(excessiveSalesBonus)).toContain('Invalid sales bonus');
  });

  it('rejects empty employee name', () => {
    const emptyName = `${validHeader}\n,5000,160,500,250`;
    expect(parseCSV(emptyName)).toContain('Employee name cannot be empty');
  });

  it('handles CRLF line endings from Windows systems', () => {
    const crlfCsv = `${validHeader}\r\nAlice,5000,160,500,250\r\nBob,4200,160,400,200\r\n`;
    const res = parseCSV(crlfCsv);
    expect(Array.isArray(res)).toBe(true);
    if (Array.isArray(res)) {
      expect(res.length).toBe(2);
      expect(res[0].name).toBe('Alice');
      expect(res[1].name).toBe('Bob');
    }
  });
});
