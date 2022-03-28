import { useState, useMemo } from "react";
import { useSqlite, useSelect } from "../hooks";
import { Form, Tabs, Tab } from "react-bootstrap";
import { PaginationTable, Table } from "./Table";

import { Database as SqliteDatabase } from "sql.js/dist/sql-asm-memory-growth";

const getTables = (db: SqliteDatabase | null) =>
  (db &&
    db
      .exec(
        "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';"
      )
      .flatMap((row) => row.values.map((val) => val.toString()))) ||
  [];

const Query = ({ db }: { db: SqliteDatabase }) => {
  const [query, setQuery] = useState("");
  const [results] = useSelect(db, query);
  return (
    <div>
      <Form.Control
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        as="textarea"
        rows={2}
        placeholder="select * from album;"
      />
      <br />
      {results && (
        <div>
          {results.values.length} result(s)
          <br />
          <Table rows={results.values} columns={results.columns} />
        </div>
      )}
    </div>
  );
};

export const Database = ({ source }: { source: Promise<any> }) => {
  const [db] = useSqlite(source);
  const tables = useMemo(() => getTables(db), [db]);
  return (
    (db && tables && tables.length && (
      <Tabs defaultActiveKey={tables[0]} className="mb-3">
        <Tab key="sql" eventKey="sql" title="SQL">
          <Query db={db} />
        </Tab>
        {tables.map((table) => (
          <Tab key={table} eventKey={table} title={table}>
            <PaginationTable key={table} db={db} name={table} />
          </Tab>
        ))}
      </Tabs>
    )) ||
    null
  );
};
