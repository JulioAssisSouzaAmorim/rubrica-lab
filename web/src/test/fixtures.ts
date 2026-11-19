import type { EvaluationResult, PayrollSheet, SweepAnalysis } from '../types';

export const sheet: PayrollSheet = {
  rubrics: [
    { code: 'SALARIO', description: 'Salário base', kind: 'Earning', formula: 'SALARIO_BASE' },
    { code: 'INSS', description: 'INSS', kind: 'Deduction', formula: 'SALARIO * 10%' },
    { code: 'FGTS', description: 'FGTS', kind: 'Info', formula: 'SALARIO * 8%' },
  ],
  tables: [{ code: 'T', description: 'Tabela', brackets: [{ upTo: null, rate: 0.1, deduction: 0 }] }],
  inputs: { SALARIO_BASE: 1000 },
};

export const evaluation: EvaluationResult = {
  success: true,
  rubrics: [
    {
      code: 'SALARIO',
      description: 'Salário base',
      kind: 'Earning',
      value: 1000,
      dependsOn: [],
      trace: { label: 'SALARIO_BASE', value: 1000, children: [], note: 'entrada', ref: null },
    },
    {
      code: 'INSS',
      description: 'INSS',
      kind: 'Deduction',
      value: 100,
      dependsOn: ['SALARIO'],
      trace: {
        label: 'SALARIO * 10%',
        value: 100,
        note: null,
        ref: null,
        children: [
          { label: 'SALARIO', value: 1000, children: [], note: null, ref: 'SALARIO' },
          {
            label: '10%',
            value: 0.1,
            note: null,
            ref: null,
            children: [{ label: '10', value: 10, children: [], note: null, ref: null }],
          },
        ],
      },
    },
    {
      code: 'FGTS',
      description: 'FGTS',
      kind: 'Info',
      value: 80,
      dependsOn: ['SALARIO'],
      trace: { label: 'SALARIO * 8%', value: 80, children: [], note: null, ref: null },
    },
  ],
  totals: { earnings: 1000, deductions: 100, net: 900 },
  order: ['SALARIO', 'INSS', 'FGTS'],
  diagnostics: [],
};

export const failedEvaluation: EvaluationResult = {
  success: false,
  rubrics: [],
  totals: null,
  order: [],
  diagnostics: [
    {
      code: 'RL003',
      message: "Nome desconhecido 'SALARO'. Você quis dizer 'SALARIO'?",
      span: { start: 0, length: 6 },
      rubric: 'INSS',
    },
  ],
};

export const sweep: SweepAnalysis = {
  success: true,
  diagnostics: [],
  points: [
    { x: 1000, earnings: 1000, deductions: 100, net: 900, marginalRetained: null },
    { x: 2000, earnings: 2000, deductions: 200, net: 1800, marginalRetained: 0.9 },
    { x: 3000, earnings: 3000, deductions: 400, net: 2600, marginalRetained: 0.8 },
  ],
};
