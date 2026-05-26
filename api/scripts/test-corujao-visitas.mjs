// Round-trip Postgres real pro fluxo de visitas.
// Cria contato → registra visita → confere ja_participou=true → erros de FK e amount.
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const TEST_TELEFONE = "+5511990008888";

async function cleanup() {
  // visitas têm cascade no contato; deletar o contato limpa tudo.
  await sql`DELETE FROM corujao_contatos WHERE telefone = ${TEST_TELEFONE}`;
}

let exitCode = 0;
function fail(msg) {
  console.log(`  ❌ ${msg}`);
  exitCode = 1;
}
function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

try {
  await cleanup();

  console.log("=== 1. Cria contato lead cru ===");
  const [contato] = await sql`
    INSERT INTO corujao_contatos (telefone, nome)
    VALUES (${TEST_TELEFONE}, 'Teste Visita')
    RETURNING id, ja_participou
  `;
  console.log(`  contato id=${contato.id} ja_participou=${contato.ja_participou}`);
  if (contato.ja_participou !== false) fail("ja_participou deveria nascer false");

  console.log("\n=== 2. INSERT visita PIX R$45,00 + UPDATE ja_participou ===");
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO corujao_visitas (contato_id, data_visita, amount_cents, forma_pagamento)
      VALUES (${contato.id}, CURRENT_DATE, 4500, 'pix')
    `;
    await tx`
      UPDATE corujao_contatos SET ja_participou = true, updated_at = NOW()
      WHERE id = ${contato.id}
    `;
  });
  const [after] = await sql`
    SELECT ja_participou FROM corujao_contatos WHERE id = ${contato.id}
  `;
  if (after.ja_participou) ok("ja_participou virou true após visita");
  else fail("ja_participou deveria estar true");

  const visitas = await sql`
    SELECT id, amount_cents, forma_pagamento, data_visita
    FROM corujao_visitas WHERE contato_id = ${contato.id}
  `;
  console.log(`  visitas registradas: ${visitas.length}`);
  if (visitas[0]?.amount_cents !== 4500) fail("amount_cents deveria ser 4500");
  if (visitas[0]?.forma_pagamento !== "pix") fail("forma deveria ser pix");

  console.log("\n=== 3. Cortesia com 0 centavos é aceita no DB ===");
  await sql`
    INSERT INTO corujao_visitas (contato_id, data_visita, amount_cents, forma_pagamento)
    VALUES (${contato.id}, CURRENT_DATE, 0, 'cortesia')
  `;
  ok("INSERT cortesia 0 não bloqueia (regra de amount=0 é no controller)");

  console.log("\n=== 4. contatoId inexistente → 23503 (FK fail) ===");
  try {
    await sql`
      INSERT INTO corujao_visitas (contato_id, data_visita, amount_cents, forma_pagamento)
      VALUES (999999999, CURRENT_DATE, 4500, 'pix')
    `;
    fail("deveria ter lançado 23503");
  } catch (e) {
    if (e.code === "23503") ok(`23503 capturado (FK ${e.constraint_name})`);
    else { console.error(e); fail(`código inesperado: ${e.code}`); }
  }

  console.log("\n=== 5. Forma de pagamento inválida → 23514 (check fail)? ===");
  // Schema usa text + enum no Drizzle, sem CHECK no DB; mas se houver,
  // o INSERT seguinte falha. Aceitamos qualquer comportamento (controller
  // já filtra antes de chegar aqui).
  try {
    await sql`
      INSERT INTO corujao_visitas (contato_id, data_visita, amount_cents, forma_pagamento)
      VALUES (${contato.id}, CURRENT_DATE, 4500, 'boleto')
    `;
    console.log("  (sem CHECK no DB — controller é a única defesa)");
  } catch (e) {
    ok(`CHECK do DB rejeitou (code=${e.code})`);
  }

  console.log("\n=== 6. Limpeza ===");
  await cleanup();
  ok("contato + visitas removidos");

  if (exitCode === 0) console.log("\n✓ TODOS OS PASSOS PASSARAM");
} catch (e) {
  console.error("ERRO:", e);
  exitCode = 1;
} finally {
  await sql.end();
  process.exit(exitCode);
}
