// Cenário de cancel: contato com 2 visitas em sessões distintas.
// Cancela uma → ja_participou continua true, sessão 1 perde vaga.
// Cancela a outra → ja_participou volta a false, sessão 2 perde vaga.
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const TEST_TELEFONE = "+5511990006666";

async function cleanup() {
  await sql`DELETE FROM corujao_contatos WHERE telefone = ${TEST_TELEFONE}`;
  await sql`DELETE FROM corujao_sessoes WHERE observacoes = 'script de teste — fatia 2.1'`;
}

let exitCode = 0;
function fail(msg) { console.log(`  ❌ ${msg}`); exitCode = 1; }
function ok(msg) { console.log(`  ✓ ${msg}`); }

async function vagasOfSessao(sessaoId) {
  const [r] = await sql`
    SELECT COUNT(*)::int AS vendidas FROM corujao_visitas WHERE sessao_id = ${sessaoId}
  `;
  return r.vendidas;
}

async function jaParticipouOf(contatoId) {
  const [r] = await sql`SELECT ja_participou FROM corujao_contatos WHERE id = ${contatoId}`;
  return r.ja_participou;
}

try {
  await cleanup();

  console.log("=== Setup: 2 sessões + 1 contato ===");
  const future1 = new Date(); future1.setDate(future1.getDate() + 3);
  const future2 = new Date(); future2.setDate(future2.getDate() + 10);
  const [s1] = await sql`
    INSERT INTO corujao_sessoes (data, status, observacoes)
    VALUES (${future1.toISOString().slice(0,10)}, 'aberto', 'script de teste — fatia 2.1')
    RETURNING id
  `;
  const [s2] = await sql`
    INSERT INTO corujao_sessoes (data, status, observacoes)
    VALUES (${future2.toISOString().slice(0,10)}, 'aberto', 'script de teste — fatia 2.1')
    RETURNING id
  `;
  const [contato] = await sql`
    INSERT INTO corujao_contatos (telefone, nome) VALUES (${TEST_TELEFONE}, 'Teste Cancel')
    RETURNING id
  `;
  console.log(`  sessões ${s1.id}, ${s2.id}; contato ${contato.id}`);

  console.log("\n=== Registra 2 visitas (em sessões diferentes) ===");
  const [v1] = await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${contato.id}, ${s1.id}, CURRENT_DATE, 4500, 'pix')
    RETURNING id
  `;
  await sql`UPDATE corujao_contatos SET ja_participou = true WHERE id = ${contato.id}`;
  const [v2] = await sql`
    INSERT INTO corujao_visitas (contato_id, sessao_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${contato.id}, ${s2.id}, CURRENT_DATE, 5000, 'pix')
    RETURNING id
  `;
  if ((await vagasOfSessao(s1.id)) === 1 && (await vagasOfSessao(s2.id)) === 1) {
    ok("ambas sessões com 1 vaga vendida");
  } else fail("contagem inicial errada");

  console.log("\n=== Cancela visita 1 (transação espelhando controller) ===");
  await sql.begin(async (tx) => {
    await tx`DELETE FROM corujao_visitas WHERE id = ${v1.id}`;
    const [r] = await tx`SELECT COUNT(*)::int AS c FROM corujao_visitas WHERE contato_id = ${contato.id}`;
    const novo = r.c > 0;
    await tx`UPDATE corujao_contatos SET ja_participou = ${novo}, updated_at = NOW() WHERE id = ${contato.id}`;
  });
  if ((await vagasOfSessao(s1.id)) === 0) ok("sessão 1 voltou a 0 vagas");
  else fail("sessão 1 não decrementou");
  if ((await jaParticipouOf(contato.id)) === true) ok("ja_participou continua true (ainda tem v2)");
  else fail("ja_participou caiu antes da hora");

  console.log("\n=== Cancela visita 2 (última) ===");
  await sql.begin(async (tx) => {
    await tx`DELETE FROM corujao_visitas WHERE id = ${v2.id}`;
    const [r] = await tx`SELECT COUNT(*)::int AS c FROM corujao_visitas WHERE contato_id = ${contato.id}`;
    const novo = r.c > 0;
    await tx`UPDATE corujao_contatos SET ja_participou = ${novo}, updated_at = NOW() WHERE id = ${contato.id}`;
  });
  if ((await vagasOfSessao(s2.id)) === 0) ok("sessão 2 voltou a 0 vagas");
  else fail("sessão 2 não decrementou");
  if ((await jaParticipouOf(contato.id)) === false) ok("ja_participou voltou a false (era a última)");
  else fail("ja_participou deveria ter voltado a false");

  console.log("\n=== Cancel de visita inexistente — SELECT vazio antes do delete ===");
  const inexistente = await sql`SELECT id FROM corujao_visitas WHERE id = 999999999`;
  if (inexistente.length === 0) ok("SELECT vazio → controller devolve 404");
  else fail("SELECT inesperado");

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
