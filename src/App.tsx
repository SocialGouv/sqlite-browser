import { useCallback, useState, useMemo } from "react";
import { Alert, Container } from "react-bootstrap";

import { useDropzone } from "react-dropzone";

import { Database } from "./sqlite/Database";

export const DropZone = ({
  onDrop,
  status,
  style,
}: {
  onDrop: any;
  status?: string;
  style?: Record<string | number, string & {}>;
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

  const dropStyle = useMemo(
    () => ({
      ...(isDragActive
        ? {
            borderColor: "#00e676",
          }
        : {}),
      ...(isDragAccept
        ? {
            borderColor: "#00e676",
          }
        : {}),
      ...(isDragReject
        ? {
            borderColor: "#ff1744",
          }
        : {}),
      ...style,
    }),
    [isDragActive, isDragReject, isDragAccept, style]
  );

  return (
    <div {...getRootProps({ style: dropStyle })} className={"dropZone"}>
      <input {...getInputProps()} />
      {(status && <div>{status}</div>) || (
        <div>
          Glissez un fichier sqlite ici
          <br />
          <div style={{ fontSize: "0.5em" }}>
            (Exemple :
            <a
              onClick={(e) => {
                // prevent file input trigger
                e.stopPropagation();
              }}
              href="https://github.com/lerocha/chinook-database/raw/master/ChinookDatabase/DataSources/Chinook_Sqlite.sqlite"
            >
              Chinook_Sqlite.sqlite
            </a>
            )
          </div>
        </div>
      )}
    </div>
  );
};

interface Db {
  name: string;
  source: any;
}

function App() {
  const [dbs, setDbs] = useState<Db[]>([]);
  const addDb = useCallback(
    (db: Db) => {
      setDbs([...dbs, db]);
    },
    [dbs]
  );

  const [progress, setProgress] = useState({ status: "", msg: "" });
  const reset = () => {
    setProgress({ status: "", msg: "" });
  };
  const onDrop = useCallback(
    (acceptedFiles) => {
      reset();
      if (acceptedFiles.length) {
        setProgress({
          status: "running",
          msg: "Chargement...",
        });
        const reader = new FileReader();
        const acceptedFile = acceptedFiles[0];
        reader.onload = async (e) => {
          setProgress({
            status: "",
            msg: "",
          });
          //@ts-expect-error
          const resultBuffer = Buffer.from(e.target.result);
          addDb({
            name: acceptedFile.name,
            source: resultBuffer,
          });
        };

        reader.readAsArrayBuffer(acceptedFile);
      } else {
        setProgress({
          status: "error",
          msg: `Aucun fichier détecté`,
        });
        reset();
      }
    },
    [addDb]
  );

  const dropHeight = dbs.length ? "auto" : "40vh";

  return (
    <Container fluid>
      <Alert style={{ marginTop: 20, textAlign: "center" }}>
        <h1>sqlite-browser</h1>
        <p>Explorez vos données SQLite</p>
      </Alert>
      <DropZone
        onDrop={onDrop}
        status={progress.msg}
        style={{ height: dropHeight }}
      />
      {dbs.map((db, index) => (
        <div key={db.name}>
          <h3>{db.name}</h3>
          <Database source={db.source} />
          <hr />
        </div>
      ))}
    </Container>
  );
}

export default App;
