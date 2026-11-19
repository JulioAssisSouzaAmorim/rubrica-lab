interface Props {
  onClose: () => void;
}

const steps = [
  ['Ajuste as entradas', 'Salário, dependentes, horas extras… Tudo recalcula na hora.'],
  ['Edite as fórmulas', 'Escreva como numa planilha: SALARIO_BASE * 30%. Erros aparecem grifados.'],
  ['Entenda cada valor', 'Clique numa linha do holerite para ver a memória de cálculo passo a passo.'],
  ['Guarde o que criou', 'Salve rubricas e tabelas na biblioteca para usar de novo.'],
] as const;

export function Guide({ onClose }: Props) {
  return (
    <section className="guide" aria-labelledby="guide-title">
      <div className="guide-head">
        <h2 id="guide-title">Bem-vindo ao Rubrica Lab 👋</h2>
        <button type="button" className="ghost" onClick={onClose}>
          Entendi, esconder
        </button>
      </div>
      <p>
        Uma folha de pagamento em que cada rubrica é uma fórmula. Já carregamos um holerite CLT de exemplo
        para você brincar.{' '}
        <a
          href="https://github.com/JulioAssisSouzaAmorim/rubrica-lab/blob/main/docs/TUTORIAL.md"
          target="_blank"
          rel="noreferrer"
        >
          Ler o tutorial completo
        </a>
      </p>
      <ol className="guide-steps">
        {steps.map(([title, text]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
