// Round-trip do DELETE sessão.
// Cria sessão + 2 visitas amarradas → deleta sessão → confere que as
// visitas mantêm valor/atribuição mas com sessao_id=NULL.
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const TEST_TELEFONE = "+5511990004444";
const MARKER = "test-delete-sessao";

async function cleanup() {
  await sql`DELETE FROM corujao_contatos WHERE telefone = ${TEST_TELEFONE}`;
  await sql`DELETE FROM corujao_sessoes WHERE observacoes = ${MARKER}`;
}

let exitCode = 0;
function fail(m) { console.log(`  ❌ ${m}`); exitCode = 1; }
function ok(m) { console.log(`  ✓ ${m}`); }

try {
  await cleanup();

  console.log("=== Setup: sessão + 2 visitas ===");
  const future = new Date(); future.setDate(future.getDate() + 5);
  const [sessao] = await sql`
    INSERT INTO corujao_sessoes (data, total_vagas, status, observacoes)
    VALUES (${future.toISOString().slice(0,10)}, 10, 'aberto', ${MARKER})
    RETURNING id
  `;
  const [contato] = await sql`
    INSERT INTO corujao_contatos (telefone, nome) VALUES (${TEST_TELEFONE}, 'Teste Del Sessao')
    RETURNING id
  `;
  const [v1] = await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${contato.id}, ${sessao.id}, CURRENT_DATE, 4500, 'pix')
    RETURNING id, amount_cents
  `;
  const [v2] = await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${contato.id}, ${sessao.id}, CURRENT_DATE, 5000, 'pix')
    RETURNING id, amount_cents
  `;
  ok(`sessão ${sessao.id}, contato ${contato.id}, visitas ${v1.id}+${v2.id}`);

  console.log("\n=== Conta visitas amarradas antes do DELETE ===");
  const [pre] = await sql`
    SELECT COUNT(*)::int AS n FROM corujao_visitas WHERE sessao_id = ${sessao.id}
  `;
  if (pre.n === 2) ok("2 visitas amarradas (esperado)");
  else fail(`pre-delete esperado 2, obtido ${pre.n}`);

  console.log("\n=== DELETE sessão ===");
  const deleted = await sql`
    DELETE FROM corujao_sessoes WHERE id = ${sessao.id} RETURNING id
  `;
  if (deleted.length === 1) ok("sessão deletada");
  else fail("DELETE não retornou linha");

  console.log("\n=== Visitas órfãs (sessao_id=NULL, mas dados preservados) ===");
  const [check1] = await sql`
    SELECT sessao_id, amount_cents, contato_id FROM corujao_visitas WHERE id = ${v1.id}
  `;
  if (check1.sessao_id === null) ok("v1 sessao_id = NULL");
  else fail(`v1 sessao_id deveria ser NULL, obtido ${check1.sessao_id}`);
  if (check1.amount_cents === 4500) ok("v1 amount_cents preservado");
  else fail(`v1 amount_cents corrompido: ${check1.amount_cents}`);
  if (check1.contato_id === contato.id) ok("v1 contato_id preservado");
  else fail("v1 perdeu contato_id");

  const [check2] = await sql`
    SELECT sessao_id, amount_cents FROM corujao_visitas WHERE id = ${v2.id}
  `;
  if (check2.sessao_id === null && check2.amount_cents === 5000) {
    ok("v2 também órfã com valor preservado");
  } else fail("v2 inconsistente");

  console.log("\n=== DELETE sessão inexistente → 0 rows ===");
  const notFound = await sql`DELETE FROM corujao_sessoes WHERE id = 999999999 RETURNING id`;
  if (notFound.length === 0) ok("0 linhas afetadas (controller mapeia pra 404)");
  else fail("inesperado");

  console.log("\n=== Limpeza ===");
  await cleanup();
  ok("removido");

  if (exitCode === 0) console.log("\n✓ TODOS OS PASSOS PASSARAM");
} catch (e) {
  console.error("ERRO:", e);
  exitCode = 1;
} finally {
  await sql.end();
  process.exit(exitCode);
}
