// Round-trip do DELETE contato.
// - Contato sem visita: delete trivial.
// - Contato com visitas: cascade apaga visitas junto, soma de receita
//   é informada corretamente.
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const TEST_TEL_VAZIO = "+5511990003331";
const TEST_TEL_COM_VISITAS = "+5511990003332";
const MARKER = "test-del-contato";

async function cleanup() {
  await sql`DELETE FROM corujao_contatos WHERE telefone IN (${TEST_TEL_VAZIO}, ${TEST_TEL_COM_VISITAS})`;
  await sql`DELETE FROM corujao_sessoes WHERE observacoes = ${MARKER}`;
}

let exitCode = 0;
function fail(m) { console.log(`  ❌ ${m}`); exitCode = 1; }
function ok(m) { console.log(`  ✓ ${m}`); }

try {
  await cleanup();

  console.log("=== Caso 1: contato sem visita ===");
  const [vazio] = await sql`
    INSERT INTO corujao_contatos (telefone, nome) VALUES (${TEST_TEL_VAZIO}, 'Vazio')
    RETURNING id
  `;
  const [statsVazio] = await sql`
    SELECT
      COUNT(*)::int AS visitas,
      COALESCE(SUM(CASE WHEN forma_pagamento <> 'cortesia' THEN amount_cents ELSE 0 END), 0)::int AS receita
    FROM corujao_visitas WHERE contato_id = ${vazio.id}
  `;
  if (statsVazio.visitas === 0 && statsVazio.receita === 0) ok("count + receita = 0");
  else fail(`stats inesperado: ${JSON.stringify(statsVazio)}`);
  const delVazio = await sql`DELETE FROM corujao_contatos WHERE id = ${vazio.id} RETURNING id`;
  if (delVazio.length === 1) ok("delete trivial OK");
  else fail("delete falhou");

  console.log("\n=== Caso 2: contato com 2 visitas (1 PIX, 1 cortesia) ===");
  const future = new Date(); future.setDate(future.getDate() + 5);
  const [sessao] = await sql`
    INSERT INTO corujao_sessoes (data, status, observacoes)
    VALUES (${future.toISOString().slice(0,10)}, 'aberto', ${MARKER}) RETURNING id
  `;
  const [comVisitas] = await sql`
    INSERT INTO corujao_contatos (telefone, nome) VALUES (${TEST_TEL_COM_VISITAS}, 'Com Visitas')
    RETURNING id
  `;
  await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, data_visita, amount_cents, forma_pagamento)
    VALUES
      (${comVisitas.id}, ${sessao.id}, CURRENT_DATE, 4500, 'pix'),
      (${comVisitas.id}, ${sessao.id}, CURRENT_DATE, 0,    'cortesia')
  `;
  const [statsCom] = await sql`
    SELECT
      COUNT(*)::int AS visitas,
      COALESCE(SUM(CASE WHEN forma_pagamento <> 'cortesia' THEN amount_cents ELSE 0 END), 0)::int AS receita
    FROM corujao_visitas WHERE contato_id = ${comVisitas.id}
  `;
  if (statsCom.visitas === 2 && statsCom.receita === 4500) {
    ok("count=2, receita=4500 (cortesia descontada)");
  } else fail(`stats: ${JSON.stringify(statsCom)}`);

  console.log("\n=== DELETE contato → cascade apaga visitas ===");
  await sql`DELETE FROM corujao_contatos WHERE id = ${comVisitas.id}`;
  const [restantes] = await sql`
    SELECT COUNT(*)::int AS n FROM corujao_visitas WHERE contato_id = ${comVisitas.id}
  `;
  if (restantes.n === 0) ok("visitas cascaded (não sobraram)");
  else fail(`sobraram ${restantes.n} visitas órfãs — cascade quebrou`);

  console.log("\n=== DELETE contato inexistente → 0 rows ===");
  const notFound = await sql`DELETE FROM corujao_contatos WHERE id = 999999999 RETURNING id`;
  if (notFound.length === 0) ok("0 linhas (controller mapeia pra 404)");
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
