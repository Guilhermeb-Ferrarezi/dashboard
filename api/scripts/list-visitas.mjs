// Lista as visitas registradas, com nome/telefone do contato.
// Uso: bun --env-file=.env run scripts/list-visitas.mjs
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

try {
  const rows = await sql`
    SELECT
      v.id,
      v.data_visita,
      v.amount_cents,
      v.forma_pagamento,
      v.observacoes,
      v.created_at,
      c.id AS contato_id,
      c.nome AS contato_nome,
      c.telefone AS contato_telefone,
      c.ja_participou
    FROM corujao_visitas v
    JOIN corujao_contatos c ON c.id = v.contato_id
    ORDER BY v.id DESC
    LIMIT 50
  `;

  if (rows.length === 0) {
    console.log("Nenhuma visita registrada ainda.");
    process.exit(0);
  }

  // Driver postgres devolve `date` como Date JS — formato pra YYYY-MM-DD
  // independente do fuso (usa getUTC* pra não shift de dia em GMT-3).
  function fmtDate(d) {
    if (typeof d === "string") return d;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  console.log(`=== ${rows.length} visita(s) (mais recentes primeiro) ===\n`);
  for (const r of rows) {
    const valor = (r.amount_cents / 100).toFixed(2).replace(".", ",");
    const nome = r.contato_nome ?? "(sem nome)";
    const tel = r.contato_telefone ?? "(sem telefone)";
    console.log(
      `#${String(r.id).padStart(3)}  ${fmtDate(r.data_visita)}  R$ ${valor.padStart(9)}  ${r.forma_pagamento.padEnd(9)}  ${nome} <${tel}>`
    );
    if (r.observacoes) console.log(`     obs: ${r.observacoes}`);
  }
} finally {
  await sql.end();
}
