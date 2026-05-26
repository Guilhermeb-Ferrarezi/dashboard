import postgres from "postgres";
const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const fks = await sql`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS ref_table,
      ccu.column_name AS ref_column,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('checkout_orders', 'checkout_payments', 'checkout_customers')
    ORDER BY tc.table_name, kcu.column_name, tc.constraint_name
  `;
  console.log("=== FKs em checkout_orders / checkout_payments ===");
  let cur = "";
  for (const f of fks) {
    if (f.table_name !== cur) {
      console.log(`\n[${f.table_name}]`);
      cur = f.table_name;
    }
    console.log(`  ${f.constraint_name}`);
    console.log(`    ${f.column_name} → ${f.ref_table}(${f.ref_column}) ON DELETE ${f.delete_rule}`);
  }
} finally {
  await sql.end();
}
