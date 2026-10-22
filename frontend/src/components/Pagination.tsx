import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

export default function Pagination({ pagina, totalPaginas, onCambiar }: PaginationProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="pagination">
      <button type="button" className="icon-btn" disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)} aria-label="Página anterior">
        <ChevronLeft size={16} />
      </button>
      <span className="pagination-label">Página {pagina} de {totalPaginas}</span>
      <button type="button" className="icon-btn" disabled={pagina === totalPaginas} onClick={() => onCambiar(pagina + 1)} aria-label="Página siguiente">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
