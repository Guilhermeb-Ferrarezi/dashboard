import postgres from "postgres";
const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'checkout_orders'
    ORDER BY ordinal_position
  `;
  console.log("=== checkout_orders ===");
  for (const c of cols) {
    const nul = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
    const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
    console.log(`  ${c.column_name.padEnd(28)} ${c.data_type.padEnd(20)} ${nul}${def}`);
  }

  // Existe a coluna payment_method?
  const pm = cols.find((c) => c.column_name === "payment_method");
  console.log(`\n>>> payment_method existe? ${pm ? "SIM" : "NÃO"}`);

  if (pm) {
    // Quantas linhas têm valor?
    const [counts] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(payment_method)::int AS com_valor,
        COUNT(DISTINCT payment_method)::int AS valores_distintos
      FROM checkout_orders
    `;
    console.log(`>>> total linhas: ${counts.total}`);
    console.log(`>>> com payment_method: ${counts.com_valor}`);
    console.log(`>>> valores distintos: ${counts.valores_distintos}`);

    if (counts.com_valor > 0) {
      const vals = await sql`
        SELECT payment_method, COUNT(*)::int AS n
        FROM checkout_orders
        WHERE payment_method IS NOT NULL
        GROUP BY payment_method
        ORDER BY n DESC
        LIMIT 10
      `;
      console.log(`\n>>> distribuição:`);
      for (const v of vals) console.log(`     ${v.payment_method.padEnd(20)} ${v.n}`);
    }
  }
} finally {
  await sql.end();
}
