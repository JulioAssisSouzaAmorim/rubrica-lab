import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { evaluation, failedEvaluation, sheet } from '../test/fixtures';
import type { PayrollSheet } from '../types';
import { FormulaField } from './FormulaField';
import { LineChart } from './LineChart';
import { Payslip } from './Payslip';
import { SheetEditor } from './SheetEditor';
import { TraceTree } from './TraceTree';

describe('TraceTree', () => {
  it('renders nested steps and navigates through rubric references', async () => {
    const onNavigate = vi.fn();
    render(<TraceTree node={evaluation.rubrics[1]!.trace} onNavigate={onNavigate} />);

    expect(screen.getByText('SALARIO * 10%')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'SALARIO' }));
    expect(onNavigate).toHaveBeenCalledWith('SALARIO');
  });

  it('shows notes', () => {
    render(<TraceTree node={evaluation.rubrics[0]!.trace} onNavigate={() => {}} />);
    expect(screen.getByText('entrada')).toBeInTheDocument();
  });
});

describe('FormulaField', () => {
  it('highlights the span of the first diagnostic', () => {
    render(
      <FormulaField
        code="INSS"
        value="SALARO * 10%"
        diagnostics={failedEvaluation.diagnostics}
        onChange={() => {}}
      />,
    );

    const input = screen.getByLabelText('Fórmula de INSS');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent("RL003: Nome desconhecido 'SALARO'");
    expect(screen.getByText('SALARO', { selector: 'mark' })).toBeInTheDocument();
  });

  it('is clean without diagnostics', () => {
    render(<FormulaField code="A" value="1" diagnostics={[]} onChange={() => {}} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Payslip', () => {
  it('splits earnings and deductions and shows totals', () => {
    render(<Payslip result={evaluation} selected={null} onSelect={() => {}} />);

    expect(screen.getByRole('table', { name: 'Proventos' })).toHaveTextContent('Salário base');
    expect(screen.getByRole('table', { name: 'Descontos' })).toHaveTextContent('INSS');
    expect(screen.getByRole('table', { name: 'Bases e informativas' })).toHaveTextContent('FGTS');
    expect(screen.getByTestId('net')).toHaveTextContent('900,00');
  });

  it('shows the trace of the selected rubric', async () => {
    const onSelect = vi.fn();
    render(<Payslip result={evaluation} selected="INSS" onSelect={onSelect} />);

    expect(screen.getByRole('heading', { name: /Memória de cálculo · INSS/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'FGTS' }));
    expect(onSelect).toHaveBeenCalledWith('FGTS');
  });
});

describe('SheetEditor', () => {
  it('edits inputs, formulas and the rubric list', async () => {
    const onChange = vi.fn<(next: PayrollSheet) => void>();
    render(<SheetEditor sheet={sheet} diagnostics={[]} onChange={onChange} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2500' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ inputs: { SALARIO_BASE: 2500 } }));

    fireEvent.change(screen.getByLabelText('Fórmula de INSS'), { target: { value: 'SALARIO * 9%' } });
    expect(onChange.mock.lastCall?.[0].rubrics[1]?.formula).toBe('SALARIO * 9%');

    await userEvent.click(screen.getByRole('button', { name: 'Remover FGTS' }));
    expect(onChange.mock.lastCall?.[0].rubrics).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: '+ Rubrica' }));
    expect(onChange.mock.lastCall?.[0].rubrics.at(-1)).toMatchObject({ code: 'NOVA_4', formula: '0' });
  });

  it('lists sheet-level diagnostics', () => {
    render(
      <SheetEditor
        sheet={sheet}
        diagnostics={[{ code: 'RL004', message: 'Dependência circular: A → A.', span: null, rubric: null }]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Dependência circular');
  });
});

describe('LineChart', () => {
  const props = {
    title: 'Bruto e líquido',
    xs: [0, 50, 100],
    formatX: (v: number) => `x${v}`,
    formatY: (v: number) => `y${v}`,
    series: [
      { id: 'a', label: 'Bruto', color: 'red', values: [0, 50, 100] },
      { id: 'b', label: 'Líquido', color: 'blue', values: [null, 40, 80] },
    ],
  };

  it('labels series in a legend and directly at the line end', () => {
    render(<LineChart {...props} />);

    expect(screen.getByRole('img', { name: 'Bruto e líquido' })).toBeInTheDocument();
    expect(screen.getAllByText('Líquido')).toHaveLength(2);
  });

  it('shows a tooltip for the nearest point on hover', () => {
    const { container } = render(<LineChart {...props} />);
    const hit = container.querySelector('rect.hit')!;
    hit.getBoundingClientRect = () => ({
      left: 0,
      width: 100,
      top: 0,
      height: 10,
      right: 100,
      bottom: 10,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(hit, { clientX: 95 });
    expect(screen.getByRole('status')).toHaveTextContent('x100');
    expect(screen.getByRole('status')).toHaveTextContent('Líquido: y80');

    fireEvent.pointerLeave(hit);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing with fewer than two points', () => {
    const { container } = render(<LineChart {...props} xs={[1]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
