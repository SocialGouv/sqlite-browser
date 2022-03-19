import React, { useCallback, useEffect, useState } from "react";
import "./App.css";

import initSQL, {
  Database,
  QueryExecResult,
  SqlValue,
} from "sql.js/dist/sql-asm-memory-growth";
import internal from "stream";

const useSqlite = (): [null | Database] => {
  const [db, setDb] = useState(null);
  const initDb = async () => {
    const [SQL, buf] = await Promise.all([
      initSQL({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      }),
      await fetch("/PS_LibreAcces5.sqlite").then((res) => res.arrayBuffer()),
    ]);
    const db = new SQL.Database(new Uint8Array(buf));
    return db;
  };
  useEffect(() => {
    initDb().then((db: any) => setDb(db));
  }, []);
  return [db];
};

const useSelect = (
  db: Database,
  query: string | null
): [null | QueryExecResult] => {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!query) {
      setResult(null);
      return;
    }
    const res = db.exec(query) as any;
    setResult(res[0]);
  }, [query]);
  return [result];
};

interface PaginationResult {
  columns: null | string[];
  rows: SqlValue[][];
  pagination: { total: number; offset: number; limit: number };
  setOffset: Function;
}

interface PaginationParams {
  db: Database;
  table: string;
  query: string;
  limit?: number;
}

const usePagination = ({
  db,
  table,
  query,
  limit = 10,
}: PaginationParams): PaginationResult => {
  const [columnsResult] = useSelect(db, `${query} LIMIT 1 OFFSET 0`);
  const [totalResult] = useSelect(db, `select count(*) from ${table}`);
  const columns = columnsResult && columnsResult.columns;
  const [paginatedQuery, setPaginatedQuery] = useState(null);
  const [rowsResult] = useSelect(db, paginatedQuery);
  const [offset, setOffset] = useState(0);

  const total = (totalResult && (totalResult.values[0][0] as number)) || 0;
  const pagination = { total, offset, limit };

  useEffect(() => {
    setPaginatedQuery(`${query} LIMIT ${limit} OFFSET ${offset}` as any);
  }, [query, offset]);

  return {
    columns: columnsResult?.columns || [],
    rows: rowsResult?.values || [],
    pagination,
    setOffset,
  };
};

const Table = ({ db, name }: { db: Database; name: string }) => {
  const { columns, rows, pagination, setOffset } = usePagination({
    db,
    table: name,
    query: `SELECT * from ${name}`,
  });
  console.log("Table", { columns, rows, pagination, setOffset });
  const nextPage = () => {
    setOffset(pagination.offset + rows.length);
  };
  const prevPage = () => {
    setOffset(
      Math.max(0, pagination.offset - Math.min(pagination.limit, rows.length))
    );
  };
  return (
    columns && (
      <div>
        <h3>{name}</h3>
        {pagination && (
          <>
            <button onClick={prevPage} disabled={!pagination.offset}>
              prev
            </button>

            <button
              onClick={nextPage}
              disabled={pagination.offset + rows.length > pagination.total}
            >
              next
            </button>
          </>
        )}
        <table>
          <thead>
            <tr>{columns && columns.map((col) => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {rows &&
              rows.map((values, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {columns.map((col, colIndex) => {
                    return (
                      <td key={rowIndex + "-" + colIndex}>
                        {values[colIndex]}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    )
  );
};

function App() {
  const [db] = useSqlite();
  const tables =
    (db &&
      db
        .exec(
          "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';"
        )
        .map((row) => row.values[0].toString())) ||
    [];

  return (
    <div className="App">
      {db && tables.map((table) => <Table key={table} db={db} name={table} />)}
    </div>
  );
}

export default App;
