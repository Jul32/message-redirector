// Optional SQL verification; PGLITE_MODULE points to a temporary @electric-sql/pglite installation.
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const { readFileSync } = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated;");
    const sql = readFileSync("supabase/demo-setup.sql", "utf8");
    await db.exec(sql);
    for (const [table, count] of [
      ["properties", 3],
      ["tenants", 5],
      ["messages", 12],
      ["rules", 5],
    ])
      assert.equal(
        (await db.query(`select count(*)::int as n from public.${table}`))
          .rows[0].n,
        count,
      );
    await db.exec(sql);
    assert.equal(
      (await db.query("select count(*)::int as n from public.messages")).rows[0]
        .n,
      12,
    );
    await db.exec("set role anon");
    const parent = (
      await db.query(
        "select * from public.messages where direction='incoming' order by id limit 1",
      )
    ).rows[0];
    const reply = (
      await db.query(
        "insert into public.messages(content,direction,reply_to) values ('We can visit tomorrow','outgoing',$1) returning *",
        [parent.id],
      )
    ).rows[0];
    assert.equal(reply.property_id, parent.property_id);
    assert.equal(reply.tenant_id, parent.tenant_id);
    assert.equal(reply.source, parent.source);
    assert.equal(reply.category, parent.category);
    assert.equal(reply.direction, "outgoing");
    const urgent = (
      await db.query(
        "insert into public.messages(tenant_id,property_id,content,source,direction) values ($1,$2,'Emergency leak','SMS','incoming') returning *",
        [parent.tenant_id, parent.property_id],
      )
    ).rows[0];
    assert.equal(urgent.category, "Urgent");
    await db.query("update public.messages set status='Resolved' where id=$1", [
      parent.id,
    ]);
    await assert.rejects(() =>
      db.query("update public.messages set content='tampered' where id=$1", [
        parent.id,
      ]),
    );
    await assert.rejects(() =>
      db.query("delete from public.messages where id=$1", [parent.id]),
    );
    await assert.rejects(() =>
      db.query(
        "insert into public.properties(name,address) values ('Bad','Bad')",
      ),
    );
    await assert.rejects(() =>
      db.query(
        "insert into public.messages(content,direction,reply_to) values ('nested','outgoing',$1)",
        [reply.id],
      ),
    );
    const rule = (
      await db.query(
        "insert into public.rules(keyword,category) values ('parcel','General') returning id",
      )
    ).rows[0];
    await db.query("delete from public.rules where id=$1", [rule.id]);
    const feedback = {
      id: "d988846b-0b50-4573-a403-3fcaadcc2c88",
      liked: "Inbox",
      confusing: "",
      missing: "",
      would_use: "Yes",
      name: null,
      email: null,
      created_at: new Date().toISOString(),
    };
    await db.query("select public.submit_demo_feedback($1::jsonb)", [
      JSON.stringify(feedback),
    ]);
    await db.query("select public.submit_demo_feedback($1::jsonb)", [
      JSON.stringify({ ...feedback, liked: "Cannot overwrite" }),
    ]);
    await assert.rejects(() => db.query("select * from public.feedback"));
    await assert.rejects(() => db.query("delete from public.feedback"));
    await db.exec("reset role");
    const saved = (await db.query("select * from public.feedback")).rows;
    assert.equal(saved.length, 1);
    assert.equal(saved[0].liked, "Inbox");
    assert.equal(
      (
        await db.query("select * from public.messages where reply_to=$1", [
          parent.id,
        ])
      ).rows.length,
      1,
    );
    console.log(
      "PASS: setup/seed repeatability, anon reads, incoming categorization, reply associations, status writes, forbidden writes, write-only feedback and duplicate prevention.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
