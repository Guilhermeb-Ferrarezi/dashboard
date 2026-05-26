import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const TEST_TELEFONE = "+5511990001111";
const TEST_TELEFONE_LEAD = "+5511990002222";

async function cleanup() {
  await sql`DELETE FROM corujao_contatos WHERE telefone IN (${TEST_TELEFONE}, ${TEST_TELEFONE_LEAD})`;
}

try {
  await cleanup();

  console.log("=== 1. INSERT contato completo (nome + data_nascimento) ===");
  const [inserted] = await sql`
    INSERT INTO corujao_contatos (nome, telefone, email, origem, observacoes, data_nascimento)
    VALUES ('Contato Teste', ${TEST_TELEFONE}, 'teste@x.com', 'indicacao', 'script de teste', '1990-05-10')
    RETURNING id, nome, telefone, email, origem, ja_participou, data_nascimento, observacoes
  `;
  console.log("  id:", inserted.id);
  console.log("  nome:", inserted.nome);
  console.log("  telefone:", inserted.telefone);
  console.log("  data_nascimento:", inserted.data_nascimento, "(tipo:", typeof inserted.data_nascimento + ")");
  console.log("  ja_participou:", inserted.ja_participou, "(esperado: false)");

  console.log("\n=== 2. INSERT lead 'cru' (só telefone, sem nome nem data) ===");
  const [lead] = await sql`
    INSERT INTO corujao_contatos (telefone)
    VALUES (${TEST_TELEFONE_LEAD})
    RETURNING id, nome, telefone, email, origem, ja_participou, data_nascimento
  `;
  console.log("  id:", lead.id);
  console.log("  nome:", lead.nome, "(esperado: null)");
  console.log("  telefone:", lead.telefone);
  console.log("  data_nascimento:", lead.data_nascimento, "(esperado: null)");
  console.log("  origem:", lead.origem, "(esperado: espontaneo — default)");

  console.log("\n=== 3. INSERT DUPLICADO (mesmo telefone) ===");
  try {
    await sql`
      INSERT INTO corujao_contatos (nome, telefone) VALUES ('Duplicado', ${TEST_TELEFONE})
    `;
    console.log("  ❌ FALHA: deveria ter dado erro de unique");
    process.exitCode = 1;
  } catch (e) {
    if (e.code === "23505") {
      console.log("  ✓ erro 23505 (unique_violation) capturado");
      console.log("  ✓ constraint:", e.constraint_name);
      console.log("  -> controller mapeia pra 409 com mensagem:");
      console.log("     'Já existe um contato com esse telefone. Busque por ele na lista.'");
    } else {
      console.log("  ❌ código de erro inesperado:", e.code);
      throw e;
    }
  }

  console.log("\n=== 4. UPDATE — setar data_nascimento no lead 'cru' ===");
  const [updated1] = await sql`
    UPDATE corujao_contatos
    SET data_nascimento = '1985-12-20', nome = 'Lead Identificado', updated_at = NOW()
    WHERE id = ${lead.id}
    RETURNING id, nome, data_nascimento
  `;
  console.log("  nome:", updated1.nome, "(antes: null)");
  console.log("  data_nascimento:", updated1.data_nascimento, "(antes: null)");

  console.log("\n=== 5. UPDATE — limpar data_nascimento (set null) ===");
  const [updated2] = await sql`
    UPDATE corujao_contatos
    SET data_nascimento = NULL, updated_at = NOW()
    WHERE id = ${inserted.id}
    RETURNING id, data_nascimento
  `;
  console.log("  data_nascimento:", updated2.data_nascimento, "(esperado: null)");

  console.log("\n=== 6. UPDATE — limpar nome (set null) ===");
  const [updated3] = await sql`
    UPDATE corujao_contatos
    SET nome = NULL, updated_at = NOW()
    WHERE id = ${inserted.id}
    RETURNING id, nome
  `;
  console.log("  nome:", updated3.nome, "(esperado: null)");

  console.log("\n=== 7. SELECT final ===");
  const rows = await sql`
    SELECT id, nome, telefone, data_nascimento, ja_participou
    FROM corujao_contatos
    WHERE telefone IN (${TEST_TELEFONE}, ${TEST_TELEFONE_LEAD})
    ORDER BY id
  `;
  for (const r of rows) console.log("  ->", r);

  console.log("\n=== 8. Limpeza ===");
  await cleanup();
  console.log("  contatos de teste removidos");

  console.log("\n✓ TODOS OS PASSOS PASSARAM");
} catch (e) {
  console.error("ERRO:", e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
