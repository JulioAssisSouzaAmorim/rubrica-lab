export type RubricKind = 'Earning' | 'Deduction' | 'Base' | 'Info';

export interface Rubric {
  code: string;
  description: string;
  kind: RubricKind;
  formula: string;
}

export interface Bracket {
  upTo: number | null;
  rate: number;
  deduction: number;
}

export interface TaxTable {
  code: string;
  description: string;
  brackets: Bracket[];
}

export interface PayrollSheet {
  rubrics: Rubric[];
  tables: TaxTable[];
  inputs: Record<string, number>;
}

export interface TextSpan {
  start: number;
  length: number;
}

export interface Diagnostic {
  code: string;
  message: string;
  span: TextSpan | null;
  rubric: string | null;
}

export interface TraceNode {
  label: string;
  value: number;
  children: TraceNode[];
  note: string | null;
  ref: string | null;
}

export interface RubricResult {
  code: string;
  description: string;
  kind: RubricKind;
  value: number;
  dependsOn: string[];
  trace: TraceNode;
}

export interface Totals {
  earnings: number;
  deductions: number;
  net: number;
}

export interface EvaluationResult {
  success: boolean;
  rubrics: RubricResult[];
  totals: Totals | null;
  order: string[];
  diagnostics: Diagnostic[];
}

export interface SweepPoint {
  x: number;
  earnings: number;
  deductions: number;
  net: number;
  marginalRetained: number | null;
}

export interface SweepAnalysis {
  success: boolean;
  points: SweepPoint[] | null;
  diagnostics: Diagnostic[];
}

export interface SweepRequest {
  sheet: PayrollSheet;
  input: string;
  from: number;
  to: number;
  points: number;
}
