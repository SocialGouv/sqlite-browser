import { Table as BsTable, ButtonGroup, Button } from "react-bootstrap";

import { Database } from "sql.js/dist/sql-asm-memory-growth";

import { usePagination } from "../hooks";

export const Table = ({
  columns,
  rows,
}: {
  columns: string[] | null;
  rows: any;
}) => {
  return (
    <BsTable striped bordered hover size="sm">
      <thead>
        <tr>
          {columns && columns.map((col: any) => <th key={col}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows &&
          rows.map((values: any, rowIndex: any) => (
            <tr key={`row-${rowIndex}`}>
              {columns &&
                columns.map((col, colIndex) => {
                  return (
                    <td
                      style={{ maxWidth: "100%", overflow: "hidden" }}
                      key={rowIndex + "-" + colIndex}
                    >
                      {values[colIndex]}
                    </td>
                  );
                })}
            </tr>
          ))}
      </tbody>
    </BsTable>
  );
};

export const PaginationTable = ({
  db,
  name,
  limit = 10,
}: {
  db: Database;
  name: string;
  limit?: number;
}) => {
  const query = `SELECT * from ${name}`;
  const { columns, rows, pagination, setOffset } = usePagination({
    db,
    table: name,
    query,
    limit,
  });

  const nextPage = () => {
    setOffset(pagination.offset + rows.length);
  };

  const prevPage = () => {
    setOffset(Math.max(0, pagination.offset - pagination.limit));
  };

  return (
    columns && (
      <div>
        <Table columns={columns} rows={rows} />
        {pagination && rows && (
          <ButtonGroup size="sm">
            <Button onClick={prevPage} disabled={!pagination.offset}>
              Prev
            </Button>
            <Button
              onClick={nextPage}
              disabled={pagination.offset + pagination.limit > pagination.total}
            >
              Next
            </Button>
          </ButtonGroup>
        )}
      </div>
    )
  );
};
