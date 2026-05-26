import postgres from "postgres";
const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('colaboradores', 'corujao_visitas')
    ORDER BY table_name, ordinal_position
  `;
  let cur = "";
  for (const c of cols) {
    if (c.table_name !== cur) {
      console.log(`\n=== ${c.table_name} ===`);
      cur = c.table_name;
    }
    const nul = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
    const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
    console.log(`  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(30)} ${nul}${def}`);
  }

  const fks = await sql`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS ref_table,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'corujao_visitas' AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY kcu.column_name
  `;
  console.log("\n=== corujao_visitas FKs ===");
  for (const f of fks) {
    console.log(`  ${f.column_name} → ${f.ref_table} ON DELETE ${f.delete_rule}`);
  }
} finally {
  await sql.end();
}
