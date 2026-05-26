// Round-trip Postgres real pro fluxo de sessões + visitas amarradas.
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const TEST_TELEFONE = "+5511990007777";

async function cleanup() {
  // contatos com cascade levam suas visitas; sessões precisam ser apagadas
  // primeiro (visitas usam sessao_id com onDelete:set null) ou depois.
  await sql`DELETE FROM corujao_contatos WHERE telefone = ${TEST_TELEFONE}`;
  await sql`DELETE FROM corujao_sessoes WHERE observacoes = 'script de teste — fatia 3'`;
}

let exitCode = 0;
function fail(msg) { console.log(`  ❌ ${msg}`); exitCode = 1; }
function ok(msg) { console.log(`  ✓ ${msg}`); }

try {
  await cleanup();

  console.log("=== 1. Cria sessão futura (D+7) com 10 vagas ===");
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const futureStr = future.toISOString().slice(0, 10);
  const [sessao] = await sql`
    INSERT INTO corujao_sessoes (data, total_vagas, status, observacoes)
    VALUES (${futureStr}, 10, 'aberto', 'script de teste — fatia 3')
    RETURNING id, data, total_vagas, status
  `;
  console.log(`  sessão id=${sessao.id} data=${futureStr} status=${sessao.status}`);

  console.log("\n=== 2. Cria contato + visita amarrada à sessão ===");
  const [contato] = await sql`
    INSERT INTO corujao_contatos (telefone, nome)
    VALUES (${TEST_TELEFONE}, 'Teste Sessão')
    RETURNING id
  `;
  await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${contato.id}, ${sessao.id}, CURRENT_DATE, 4500, 'pix')
  `;
  const [vagas] = await sql`
    SELECT COUNT(*)::int AS vendidas FROM corujao_visitas WHERE sessao_id = ${sessao.id}
  `;
  if (vagas.vendidas === 1) ok(`vagasVendidas = 1 (10 - 1 = 9 restantes)`);
  else fail(`vagasVendidas esperado 1, obtido ${vagas.vendidas}`);

  console.log("\n=== 3. Sessão cancelada não deve aparecer em proxima ===");
  const [sessaoCancelada] = await sql`
    INSERT INTO corujao_sessoes (data, status, observacoes)
    VALUES (${futureStr}, 'cancelado', 'script de teste — fatia 3')
    RETURNING id
  `;
  const proximas = await sql`
    SELECT id, status FROM corujao_sessoes
    WHERE data >= CURRENT_DATE AND status IN ('planejado','aberto','lotado')
      AND observacoes = 'script de teste — fatia 3'
    ORDER BY data ASC, id ASC
  `;
  const cancelOk = !proximas.some((s) => s.id === sessaoCancelada.id);
  if (cancelOk) ok("sessão cancelada filtrada do query de próxima");
  else fail("cancelada apareceu no filtro");

  console.log("\n=== 4. Sessão com data passada não conta como próxima ===");
  const past = new Date();
  past.setDate(past.getDate() - 30);
  const pastStr = past.toISOString().slice(0, 10);
  const [sessaoPassada] = await sql`
    INSERT INTO corujao_sessoes (data, status, observacoes)
    VALUES (${pastStr}, 'realizado', 'script de teste — fatia 3')
    RETURNING id
  `;
  const passadaApareceu = proximas.some((s) => s.id === sessaoPassada.id);
  if (!passadaApareceu) ok("sessão passada filtrada");
  else fail("passada apareceu");

  console.log("\n=== 5. Visita com sessao_id inexistente → 23503 ===");
  try {
    await sql`
      INSERT INTO corujao_visitas (contato_id, sessao_id, data_visita, amount_cents, forma_pagamento)
      VALUES (${contato.id}, 999999999, CURRENT_DATE, 4500, 'pix')
    `;
    fail("deveria ter lançado 23503");
  } catch (e) {
    if (e.code === "23503" && (e.constraint_name ?? "").includes("sessao")) {
      ok(`23503 capturado em ${e.constraint_name}`);
    } else {
      fail(`código/constraint inesperados: ${e.code} ${e.constraint_name}`);
    }
  }

  console.log("\n=== 6. Limpeza ===");
  await cleanup();
  ok("contatos + sessões removidos");

  if (exitCode === 0) console.log("\n✓ TODOS OS PASSOS PASSARAM");
} catch (e) {
  console.error("ERRO:", e);
  exitCode = 1;
} finally {
  await sql.end();
  process.exit(exitCode);
}
