import React, {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useState,
  useMemo,
  ReactElement,
} from "react";
import "./App.css";

import { useDropzone } from "react-dropzone";

import initSQL, {
  Database,
  QueryExecResult,
  SqlValue,
} from "sql.js/dist/sql-asm-memory-growth";
import internal from "stream";

const useSqlite = (source: Promise<any>): [null | Database] => {
  const [db, setDb] = useState(null);
  const initDb = async () => {
    const [SQL, buf] = await Promise.all([
      initSQL({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      }),
      await source,
    ]);
    const db = new SQL.Database(new Uint8Array(buf));
    return db;
  };
  useEffect(() => {
    //@ts-expect-error
    initDb().then((db: Database) => setDb(db));
    return () => {
      console.log("close db");
      //@ts-expect-error
      db && db.close();
    };
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
  }, [query, db]);
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
  }, [query, offset, limit]);

  return {
    columns: columnsResult?.columns || [],
    rows: rowsResult?.values || [],
    pagination,
    setOffset,
  };
};

//import styles from "./csv.module.css";

export const DropZone = ({
  onDrop,
  status,
}: {
  onDrop: any;
  status?: string;
}) => {
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    //accept: "text/sqlite",
  });

  const acceptStyle = {
    borderColor: "#00e676",
  };

  const rejectStyle = {
    borderColor: "#ff1744",
  };

  const style = useMemo(
    () => ({
      ...(isDragActive ? acceptStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {}),
    }),
    [isDragActive, isDragReject, isDragAccept]
  );

  return (
    <div {...getRootProps({ style })} className={"dropZone"}>
      <input {...getInputProps()} />
      <p>{status || "Glissez un fichier SQLITE ici"}</p>
    </div>
  );
};

const Table = ({ db, name }: { db: Database; name: string }) => {
  const [query, setQuery] = useState(`SELECT * from ${name}`);
  const { columns, rows, pagination, setOffset } = usePagination({
    db,
    table: name,
    query: query,
  });

  const nextPage = () => {
    setOffset(pagination.offset + rows.length);
  };

  const prevPage = () => {
    setOffset(Math.max(0, pagination.offset - pagination.limit));
  };

  const onInputChange = (e: any) => {
    setQuery(
      `SELECT * from ${name} where "Nom d'exercice" like '%${e.target.value}%' or "Prénom d'exercice" like '%${e.target.value}%'`
    );
  };

  return (
    columns && (
      <div style={{ width: "90vw", margin: "0 5vw" }}>
        <h3>
          {name} ({Intl.NumberFormat().format(pagination.total)})
        </h3>
        {pagination && (
          <>
            <button onClick={prevPage} disabled={!pagination.offset}>
              prev
            </button>

            <button
              onClick={nextPage}
              disabled={pagination.offset + pagination.limit > pagination.total}
            >
              next
            </button>
            <input
              placeholder="rechercher...."
              style={{ width: 300, display: "inline-block" }}
              onChange={onInputChange}
            />
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

const Sqlite = ({ source }: { source: Promise<any> }) => {
  const [db] = useSqlite(source);
  const tables =
    (db &&
      db
        .exec(
          "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';"
        )
        .flatMap((row) => row.values.map((val) => val.toString()))) ||
    [];
  return (
    db &&
    tables && (
      <>
        {tables.map((table) => (
          <Table key={table} db={db} name={table} />
        ))}
      </>
    )
  );
};

interface Db {
  name: string;
  source: any;
}

function App() {
  const [dbs, setDbs] = useState<Db[]>([]);
  const addDb = (db: Db) => {
    setDbs([...dbs, db]);
  };

  const [progress, setProgress] = useState({ status: "", msg: "" });
  const reset = () => {
    setProgress({ status: "", msg: "" });
  };
  const onDrop = useCallback((acceptedFiles) => {
    reset();
    if (acceptedFiles.length) {
      setProgress({
        status: "running",
        msg: "Démarrage...",
      });
      const reader = new FileReader();
      const acceptedFile = acceptedFiles[0];
      reader.onload = async (e) => {
        //@ts-expect-error
        const resultBuffer = Buffer.from(e.target.result);
        addDb({
          name: acceptedFile.name,
          source: resultBuffer,
        });
      };

      // setTimeout(() => {

      reader.readAsArrayBuffer(acceptedFile);
    } else {
      setProgress({
        status: "error",
        msg: `Aucun fichier détecté`,
      });
      reset();
    }
  }, []);

  const addExample = () => {
    addDb({
      name: "example",
      source: fetch("/PS_LibreAcces.sqlite").then((res) => res.arrayBuffer()),
    });
  };
  return (
    <div className="App">
      <button onClick={addExample}>Load big example</button>
      <DropZone onDrop={onDrop} status={progress.msg} />
      {dbs.map((db, index) => (
        <div key={db.name}>
          <h2>{db.name}</h2>
          <Sqlite source={db.source} />
        </div>
      ))}
      {/*db && tables.map((table) => <Table key={table} db={db} name={table} />)*/}
    </div>
  );
}

export default App;
