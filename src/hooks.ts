import { useEffect, useState, useCallback } from "react";

import initSQL, {
  Database,
  QueryExecResult,
  SqlValue,
} from "sql.js/dist/sql-asm-memory-growth";

export interface PaginationResult {
  columns: null | string[];
  rows: SqlValue[][];
  pagination: { total: number; offset: number; limit: number };
  setOffset: Function;
}

interface PaginationParams {
  db: Database;
  table?: string;
  query: string;
  limit?: number;
}

export const usePagination = ({
  db,
  table,
  query,
  limit = 10,
}: PaginationParams): PaginationResult => {
  const [columnsResult] = useSelect(
    db,
    `${query.replace(/;\s*$/, "")} LIMIT 1 OFFSET 0`
  );
  const [totalResult] = useSelect(
    db,
    table ? `select count(*) from ${table}` : "select 0"
  );
  const columns = (columnsResult && columnsResult.columns) || [];
  const [paginatedQuery, setPaginatedQuery] = useState(null);
  const [rowsResult] = useSelect(db, paginatedQuery);
  const [offset, setOffset] = useState(0);

  const total =
    (totalResult && (totalResult.values[0][0] as number)) ||
    rowsResult?.values?.length ||
    0;
  const pagination = { total, offset, limit };

  useEffect(() => {
    setPaginatedQuery(
      `${query.replace(/;\s*$/, "")} LIMIT ${limit} OFFSET ${offset}` as any
    );
  }, [query, offset, limit]);

  return {
    columns,
    rows: rowsResult?.values || [],
    pagination,
    setOffset,
  };
};

export const useSqlite = (source: Promise<any>): [null | Database] => {
  const [db, setDb] = useState(null);
  const initDb = useCallback(async (source) => {
    const [SQL, buf] = await Promise.all([
      initSQL({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      }),
      await source,
    ]);
    const loadDb = new SQL.Database(new Uint8Array(buf));
    //@ts-expect-error
    setDb(loadDb);
  }, []);
  useEffect(() => {
    if (db) {
      return;
    }
    initDb(source);
    return () => {
      console.log("close db");
      //@ts-expect-error
      db && db.close();
    };
  }, [initDb, source, db]);
  return [db];
};

export const useSelect = (
  db: Database,
  query: string | null
): [null | QueryExecResult] => {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!query) {
      setResult(null);
      return;
    }
    try {
      const res = db.exec(query) as any;
      setResult(res[0]);
    } catch (e) {
      console.error(e);
      setResult(null);
    }
  }, [query, db]);
  return [result];
};
