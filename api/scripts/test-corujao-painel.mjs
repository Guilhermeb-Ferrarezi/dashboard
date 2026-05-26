// Round-trip do painel — monta o cenário direto no banco, depois roda
// queries equivalentes às do controller pra confirmar que os números
// batem. Não chama HTTP (evita acoplar middleware de auth).
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const MARKER = "test-fatia-6";

async function cleanup() {
  await sql`DELETE FROM corujao_contatos WHERE nome LIKE ${`${MARKER}%`}`;
  await sql`DELETE FROM corujao_sessoes WHERE observacoes = ${MARKER}`;
  await sql`DELETE FROM colaboradores WHERE mongo_id LIKE ${`${MARKER}%`}`;
}

let exitCode = 0;
function fail(m) { console.log(`  ❌ ${m}`); exitCode = 1; }
function ok(m) { console.log(`  ✓ ${m}`); }

try {
  await cleanup();

  // Setup:
  // - 2 colaboradores
  // - 2 sessões no mês corrente: 1 realizada (10 vagas), 1 cancelada (10 vagas)
  // - 5 visitas no mês: 3 pra realizada, 1 avulsa (sem sessão), 1 cortesia
  //
  // Esperado:
  //   vendasCount=5, receitaCents= 4500+5000+4500+5000+0 = 19000 (cortesia=0)
  //   sessoesRealizadas=1, vagasOfertadas=10, vagasOcupadas=3, taxa=0.3
  //   porColaborador: c1=3 vendas (9500 cents), c2=2 vendas (9500 cents), receita 0 da cortesia
  console.log("=== Setup ===");
  const [c1] = await sql`
    INSERT INTO colaboradores (mongo_id, nome) VALUES (${`${MARKER}-1`}, 'Colab Painel A') RETURNING id
  `;
  const [c2] = await sql`
    INSERT INTO colaboradores (mongo_id, nome) VALUES (${`${MARKER}-2`}, 'Colab Painel B') RETURNING id
  `;
  const hoje = new Date().toISOString().slice(0, 10);
  const [sRealizada] = await sql`
    INSERT INTO corujao_sessoes (data, total_vagas, status, observacoes)
    VALUES (${hoje}, 10, 'realizado', ${MARKER}) RETURNING id
  `;
  const [sCancelada] = await sql`
    INSERT INTO corujao_sessoes (data, total_vagas, status, observacoes)
    VALUES (${hoje}, 10, 'cancelado', ${MARKER}) RETURNING id
  `;
  const [ct] = await sql`
    INSERT INTO corujao_contatos (telefone, nome)
    VALUES ('+5511990000001', ${`${MARKER}-contato`}) RETURNING id
  `;

  // 3 visitas pra sRealizada (1 por c1, 1 por c2, 1 sem atribuição)
  await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, colaborador_id, data_visita, amount_cents, forma_pagamento)
    VALUES
      (${ct.id}, ${sRealizada.id}, ${c1.id}, ${hoje}, 4500, 'pix'),
      (${ct.id}, ${sRealizada.id}, ${c2.id}, ${hoje}, 5000, 'pix'),
      (${ct.id}, ${sRealizada.id}, NULL,     ${hoje}, 0,    'cortesia')
  `;
  // 1 visita avulsa por c1
  await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, colaborador_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${ct.id}, NULL, ${c1.id}, ${hoje}, 4500, 'pix')
  `;
  // 1 visita avulsa por c2
  await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, colaborador_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${ct.id}, NULL, ${c2.id}, ${hoje}, 5000, 'pix')
  `;
  ok(`5 visitas criadas (3 atribuídas, 1 cortesia, 1 sem atrib via cortesia)`);

  // Período = mes corrente; aqui simulamos com filtro pelo `hoje`.
  const periodFrom = new Date(); periodFrom.setDate(1);
  const fromStr = periodFrom.toISOString().slice(0, 10);

  console.log("\n=== Totais ===");
  const [tot] = await sql`
    SELECT
      COUNT(*)::int AS vendas,
      COALESCE(SUM(CASE WHEN forma_pagamento <> 'cortesia' THEN amount_cents ELSE 0 END), 0)::int AS receita
    FROM corujao_visitas
    WHERE data_visita BETWEEN ${fromStr} AND ${hoje}
      AND contato_id IN (SELECT id FROM corujao_contatos WHERE nome LIKE ${`${MARKER}%`})
  `;
  if (tot.vendas === 5) ok(`vendasCount = 5`);
  else fail(`vendasCount esperado 5, obtido ${tot.vendas}`);
  // 4500+5000+0+4500+5000 = 19000
  if (tot.receita === 19000) ok(`receitaCents = 19000 (cortesia descontada)`);
  else fail(`receita esperado 19000, obtido ${tot.receita}`);

  console.log("\n=== Vagas (sessões válidas = não-canceladas) ===");
  const [vagas] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM corujao_sessoes
       WHERE data BETWEEN ${fromStr} AND ${hoje} AND status <> 'cancelado'
       AND observacoes = ${MARKER}) AS sessoes_validas,
      (SELECT COALESCE(SUM(total_vagas), 0)::int FROM corujao_sessoes
       WHERE data BETWEEN ${fromStr} AND ${hoje} AND status <> 'cancelado'
       AND observacoes = ${MARKER}) AS ofertadas,
      (SELECT COUNT(*)::int FROM corujao_visitas v
       WHERE v.data_visita BETWEEN ${fromStr} AND ${hoje}
         AND v.sessao_id IS NOT NULL
         AND v.contato_id IN (SELECT id FROM corujao_contatos WHERE nome LIKE ${`${MARKER}%`})
      ) AS ocupadas
  `;
  if (vagas.sessoes_validas === 1) ok("sessoesRealizadas = 1 (cancelada não conta)");
  else fail(`sessoesRealizadas esperado 1, obtido ${vagas.sessoes_validas}`);
  if (vagas.ofertadas === 10) ok("vagasOfertadas = 10");
  else fail(`vagasOfertadas esperado 10, obtido ${vagas.ofertadas}`);
  if (vagas.ocupadas === 3) ok("vagasOcupadas = 3 (3 visitas com sessao_id)");
  else fail(`vagasOcupadas esperado 3, obtido ${vagas.ocupadas}`);

  console.log("\n=== Por colaborador ===");
  const porColab = await sql`
    SELECT v.colaborador_id, c.nome,
      COUNT(*)::int AS vendas,
      COALESCE(SUM(CASE WHEN v.forma_pagamento <> 'cortesia' THEN v.amount_cents ELSE 0 END), 0)::int AS receita
    FROM corujao_visitas v
    LEFT JOIN colaboradores c ON c.id = v.colaborador_id
    WHERE v.data_visita BETWEEN ${fromStr} AND ${hoje}
      AND v.contato_id IN (SELECT id FROM corujao_contatos WHERE nome LIKE ${`${MARKER}%`})
    GROUP BY v.colaborador_id, c.nome
    ORDER BY receita DESC
  `;
  // Esperado: c1=2 vendas / 9000; c2=2 vendas / 10000; sem atribuição=1 venda / 0 (cortesia)
  for (const row of porColab) {
    const tag = row.colaborador_id ? `${row.nome}` : "(sem atribuição)";
    console.log(`  ${tag.padEnd(24)} vendas=${row.vendas} receita=${row.receita}`);
  }
  const c1Row = porColab.find((r) => r.colaborador_id === c1.id);
  const c2Row = porColab.find((r) => r.colaborador_id === c2.id);
  const noneRow = porColab.find((r) => r.colaborador_id === null);
  if (c1Row?.vendas === 2 && c1Row?.receita === 9000) ok("c1 = 2 vendas / 9000");
  else fail(`c1 esperado 2/9000, obtido ${c1Row?.vendas}/${c1Row?.receita}`);
  if (c2Row?.vendas === 2 && c2Row?.receita === 10000) ok("c2 = 2 vendas / 10000");
  else fail(`c2 esperado 2/10000, obtido ${c2Row?.vendas}/${c2Row?.receita}`);
  if (noneRow?.vendas === 1 && noneRow?.receita === 0) ok("sem atribuição = 1 venda (cortesia) / 0 receita");
  else fail(`sem atrib esperado 1/0, obtido ${noneRow?.vendas}/${noneRow?.receita}`);

  console.log("\n=== Limpeza ===");
  await cleanup();
  ok("removidos");

  if (exitCode === 0) console.log("\n✓ TODOS OS PASSOS PASSARAM");
} catch (e) {
  console.error("ERRO:", e);
  exitCode = 1;
} finally {
  await sql.end();
  process.exit(exitCode);
}
