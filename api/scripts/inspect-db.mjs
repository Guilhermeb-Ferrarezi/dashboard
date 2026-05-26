import postgres from "postgres";

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error("POSTGRES_URL não está definido");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const tables = await sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;

  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('checkout_orders', 'checkout_products', 'checkout_coupons')
    ORDER BY table_name, ordinal_position
  `;

  console.log("=== TABELAS NO BANCO ===");
  for (const t of tables) console.log(t.tablename);

  console.log("\n=== COLUNAS checkout_orders / checkout_products / checkout_coupons ===");
  let currentTable = "";
  for (const c of columns) {
    if (c.table_name !== currentTable) {
      console.log(`\n[${c.table_name}]`);
      currentTable = c.table_name;
    }
    const nul = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
    const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
    console.log(`  ${c.column_name} ${c.data_type} ${nul}${def}`);
  }

  console.log("\n=== TABELAS ANTIGAS DO CORUJÃO ===");
  const oldNames = ["corujao_clientes", "corujao_presencas", "corujao_sessoes"];
  for (const name of oldNames) {
    const found = tables.some((t) => t.tablename === name);
    console.log(`  ${name}: ${found ? "EXISTE" : "não existe"}`);
  }

  console.log("\n=== checkout_coupons ===");
  console.log(`  ${tables.some((t) => t.tablename === "checkout_coupons") ? "EXISTE" : "não existe"}`);
} finally {
  await sql.end();
}
