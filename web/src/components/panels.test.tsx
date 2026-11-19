import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sheet } from '../test/fixtures';
import type { Library, PayrollSheet, TaxTable } from '../types';
import { Guide } from './Guide';
import { LibraryPanel } from './LibraryPanel';
import { SheetEditor } from './SheetEditor';
import { TablesEditor } from './TablesEditor';

const table: TaxTable = {
  code: 'MINHA',
  description: 'Minha tabela',
  brackets: [
    { upTo: 1000, rate: 0.05, deduction: 0 },
    { upTo: null, rate: 0.1, deduction: 50 },
  ],
};

const library: Library = {
  rubrics: [
    { rubric: sheet.rubrics[1]!, builtIn: true },
    { rubric: { code: 'BONUS', description: 'Bônus', kind: 'Earning', formula: '100' }, builtIn: false },
  ],
  tables: [
    { table: sheet.tables[0]!, builtIn: true },
    { table, builtIn: false },
  ],
};

describe('TablesEditor', () => {
  it('edits brackets with rates shown as percent', () => {
    const onChange = vi.fn<(tables: TaxTable[]) => void>();
    render(<TablesEditor tables={[table]} onChange={onChange} onSave={() => {}} />);

    const rate = screen.getByLabelText('MINHA faixa 1: alíquota');
    expect(rate).toHaveValue(5);
    fireEvent.change(rate, { target: { value: '7.5' } });
    expect(onChange.mock.lastCall?.[0][0]?.brackets[0]?.rate).toBeCloseTo(0.075);

    fireEvent.change(screen.getByLabelText('MINHA faixa 1: até'), { target: { value: '' } });
    expect(onChange.mock.lastCall?.[0][0]?.brackets[0]?.upTo).toBeNull();
  });

  it('adds and removes brackets and tables, and saves', async () => {
    const onChange = vi.fn<(tables: TaxTable[]) => void>();
    const onSave = vi.fn();
    render(<TablesEditor tables={[table]} onChange={onChange} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: '+ Faixa' }));
    expect(onChange.mock.lastCall?.[0][0]?.brackets).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: 'Remover faixa 2 de MINHA' }));
    expect(onChange.mock.lastCall?.[0][0]?.brackets).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: '+ Tabela' }));
    expect(onChange.mock.lastCall?.[0][1]?.code).toBe('TABELA_2');

    await userEvent.click(screen.getByRole('button', { name: 'Remover tabela MINHA' }));
    expect(onChange.mock.lastCall?.[0]).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar tabela MINHA na biblioteca' }));
    expect(onSave).toHaveBeenCalledWith(table);
  });
});

describe('SheetEditor extras', () => {
  const props = {
    sheet,
    diagnostics: [],
    functions: [{ name: 'max', signature: 'max(a, b, ...)', description: 'Maior dos valores.' }],
    onChange: () => {},
    onSaveRubric: () => {},
    onSaveTable: () => {},
  };

  it('adds and removes inputs, rejecting invalid or duplicate names', async () => {
    const onChange = vi.fn<(next: PayrollSheet) => void>();
    render(<SheetEditor {...props} onChange={onChange} />);
    const add = screen.getByRole('button', { name: '+ Entrada' });
    const name = screen.getByLabelText('Nome da nova entrada');

    await userEvent.type(name, 'salario_base');
    expect(add).toBeDisabled();

    await userEvent.clear(name);
    await userEvent.type(name, 'bonus{Enter}');
    expect(onChange.mock.lastCall?.[0].inputs).toEqual({ SALARIO_BASE: 1000, BONUS: 0 });

    await userEvent.click(screen.getByRole('button', { name: 'Remover entrada SALARIO_BASE' }));
    expect(onChange.mock.lastCall?.[0].inputs).toEqual({});
  });

  it('saves a rubric and documents the functions', async () => {
    const onSaveRubric = vi.fn();
    render(<SheetEditor {...props} onSaveRubric={onSaveRubric} />);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar INSS na biblioteca' }));
    expect(onSaveRubric).toHaveBeenCalledWith(sheet.rubrics[1]);
    expect(screen.getByText('max(a, b, ...)')).toBeInTheDocument();
  });
});

describe('LibraryPanel', () => {
  it('lets users reuse anything but delete only their own items', async () => {
    const handlers = {
      onUseRubric: vi.fn(),
      onDeleteRubric: vi.fn(),
      onUseTable: vi.fn(),
      onDeleteTable: vi.fn(),
    };
    render(<LibraryPanel library={library} {...handlers} />);

    const rubrics = screen.getByRole('list', { name: 'Rubricas salvas' });
    expect(within(rubrics).getByText('Padrão')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir rubrica INSS' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir tabela T' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Usar rubrica BONUS' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir rubrica BONUS' }));
    await userEvent.click(screen.getByRole('button', { name: 'Usar tabela MINHA' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir tabela MINHA' }));

    expect(handlers.onUseRubric).toHaveBeenCalledWith(library.rubrics[1]!.rubric);
    expect(handlers.onDeleteRubric).toHaveBeenCalledWith('BONUS');
    expect(handlers.onUseTable).toHaveBeenCalledWith(table);
    expect(handlers.onDeleteTable).toHaveBeenCalledWith('MINHA');
  });

  it('shows a loading state', () => {
    render(
      <LibraryPanel
        library={null}
        onUseRubric={() => {}}
        onDeleteRubric={() => {}}
        onUseTable={() => {}}
        onDeleteTable={() => {}}
      />,
    );
    expect(screen.getByText('Carregando biblioteca…')).toBeInTheDocument();
  });
});

describe('Guide', () => {
  it('explains the steps and can be dismissed', async () => {
    const onClose = vi.fn();
    render(<Guide onClose={onClose} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Entendi, esconder' }));
    expect(onClose).toHaveBeenCalled();
  });
});
