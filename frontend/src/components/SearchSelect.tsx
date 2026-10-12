import { useEffect, useRef, useState } from 'react';

export default function SearchSelect<T>({
  items,
  selected,
  onSelect,
  getLabel,
  getKey,
  getSubLabel,
  placeholder,
  id,
}: {
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string | number;
  getSubLabel?: (item: T) => string | undefined;
  placeholder: string;
  id?: string;
}) {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', onFuera);
    return () => document.removeEventListener('mousedown', onFuera);
  }, []);

  const q = query.trim().toLowerCase();
  const filtrados = q
    ? items.filter((it) => getLabel(it).toLowerCase().includes(q) || getSubLabel?.(it)?.toLowerCase().includes(q))
    : items;

  return (
    <div className="search-select" ref={ref}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={abierto ? query : selected ? getLabel(selected) : ''}
        onFocus={() => {
          setAbierto(true);
          setQuery('');
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
      />
      {abierto && (
        <div className="search-select-list" role="listbox">
          {filtrados.length === 0 ? (
            <div className="search-select-empty">Sin resultados</div>
          ) : (
            filtrados.map((it) => (
              <button
                type="button"
                key={getKey(it)}
                className="search-select-option"
                onClick={() => {
                  onSelect(it);
                  setAbierto(false);
                  setQuery('');
                }}
              >
                <span>{getLabel(it)}</span>
                {getSubLabel?.(it) && <span className="search-select-sub">{getSubLabel(it)}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
