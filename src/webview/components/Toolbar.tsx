export function Toolbar({
  fileName,
  entryCount,
}: {
  fileName: string;
  entryCount: number;
}) {
  return (
    <div className="toolbar">
      <span className="toolbar-filename" title={fileName}>
        {fileName}
      </span>
      <span className="toolbar-count">
        {entryCount.toLocaleString()} entries
      </span>
    </div>
  );
}
