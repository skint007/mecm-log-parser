export function Toolbar({
  fileName,
  entryCount,
  search,
  onSearchChange,
}: {
  fileName: string;
  entryCount: number;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="toolbar">
      <span className="toolbar-filename" title={fileName}>
        {fileName}
      </span>
      <span className="toolbar-count">
        {entryCount.toLocaleString()} entries
      </span>
      <div className="toolbar-search">
        <input
          className="toolbar-search-input"
          type="search"
          placeholder="Search entries…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search log entries"
        />
      </div>
    </div>
  );
}
