// Round-trip Postgres pro fluxo de colaboradores:
// - Cria colaborador, atribui visita, verifica join.
// - DELETE colaborador → corujao_visitas.colaborador_id vira NULL (SET NULL).
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const TEST_TELEFONE = "+5511990005555";
const TEST_COLAB_MARKER = "test-fatia-4";

async function cleanup() {
  await sql`DELETE FROM corujao_contatos WHERE telefone = ${TEST_TELEFONE}`;
  await sql`DELETE FROM colaboradores WHERE mongo_id LIKE ${`${TEST_COLAB_MARKER}%`}`;
}

let exitCode = 0;
function fail(m) { console.log(`  ❌ ${m}`); exitCode = 1; }
function ok(m) { console.log(`  ✓ ${m}`); }

try {
  await cleanup();

  console.log("=== 1. Cria 2 colaboradores ===");
  const [c1] = await sql`
    INSERT INTO colaboradores (mongo_id, nome) VALUES (${`${TEST_COLAB_MARKER}-1`}, 'João Teste')
    RETURNING id, nome, ativo
  `;
  const [c2] = await sql`
    INSERT INTO colaboradores (mongo_id, nome) VALUES (${`${TEST_COLAB_MARKER}-2`}, 'Maria Teste')
    RETURNING id
  `;
  ok(`colaboradores #${c1.id} (${c1.nome}) e #${c2.id}`);

  console.log("\n=== 2. Cria contato e visita com colaborador #1 ===");
  const [contato] = await sql`
    INSERT INTO corujao_contatos (telefone, nome) VALUES (${TEST_TELEFONE}, 'Teste Atrib')
    RETURNING id
  `;
  const [v] = await sql`
    INSERT INTO corujao_visitas (contato_id, colaborador_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${contato.id}, ${c1.id}, CURRENT_DATE, 4500, 'pix')
    RETURNING id, colaborador_id
  `;
  if (v.colaborador_id === c1.id) ok("visita criada com colaborador_id correto");
  else fail("colaborador_id da visita não bateu");

  console.log("\n=== 3. JOIN visita + colaborador devolve nome ===");
  const [join] = await sql`
    SELECT v.id, c.nome AS colaborador_nome
    FROM corujao_visitas v JOIN colaboradores c ON c.id = v.colaborador_id
    WHERE v.id = ${v.id}
  `;
  if (join.colaborador_nome === "João Teste") ok("join devolveu 'João Teste'");
  else fail(`nome no join inesperado: ${join.colaborador_nome}`);

  console.log("\n=== 4. PATCH colaborador (desativar) — visita mantém referência ===");
  await sql`UPDATE colaboradores SET ativo = false WHERE id = ${c1.id}`;
  const [stillThere] = await sql`
    SELECT colaborador_id FROM corujao_visitas WHERE id = ${v.id}
  `;
  if (stillThere.colaborador_id === c1.id) ok("desativar não apaga referência (correto)");
  else fail("FK ficou inconsistente");

  console.log("\n=== 5. Mudar atribuição da visita (PATCH visita) ===");
  await sql`UPDATE corujao_visitas SET colaborador_id = ${c2.id} WHERE id = ${v.id}`;
  const [after] = await sql`SELECT colaborador_id FROM corujao_visitas WHERE id = ${v.id}`;
  if (after.colaborador_id === c2.id) ok("atribuição passou pra Maria");
  else fail("não mudou colaborador");

  console.log("\n=== 6. DELETE colaborador → ON DELETE SET NULL na visita ===");
  await sql`DELETE FROM colaboradores WHERE id = ${c2.id}`;
  const [orphan] = await sql`SELECT colaborador_id FROM corujao_visitas WHERE id = ${v.id}`;
  if (orphan.colaborador_id === null) ok("visita virou órfã (colaborador_id NULL)");
  else fail("FK deveria ter virado NULL");

  console.log("\n=== 7. mongo_id NULL em colaboradores ===");
  const [nullMongo] = await sql`
    INSERT INTO colaboradores (mongo_id, nome) VALUES (NULL, 'Sem Mongo')
    RETURNING id, mongo_id
  `;
  if (nullMongo.mongo_id === null) ok("NULL aceito em mongo_id");
  else fail("mongo_id deveria aceitar NULL");
  // Segundo NULL também aceita (UNIQUE trata NULL como distinto)
  const [second] = await sql`
    INSERT INTO colaboradores (mongo_id, nome) VALUES (NULL, 'Sem Mongo 2')
    RETURNING id
  `;
  ok("segundo NULL convive (UNIQUE trata NULL distinto)");
  await sql`DELETE FROM colaboradores WHERE id IN (${nullMongo.id}, ${second.id})`;

  console.log("\n=== Limpeza ===");
  await cleanup();
  ok("teste limpo");

  if (exitCode === 0) console.log("\n✓ TODOS OS PASSOS PASSARAM");
} catch (e) {
  console.error("ERRO:", e);
  exitCode = 1;
} finally {
  await sql.end();
  process.exit(exitCode);
}
