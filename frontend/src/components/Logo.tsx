interface LogoProps {
  size?: 'sm' | 'lg';
}

// Espacio reservado para el logo del cliente. Para usar uno real, reemplaza
// el contenido de este div por <img src="/logo.svg" alt="ISAI" />.
export default function Logo({ size = 'sm' }: LogoProps) {
  return (
    <div className={`logo-slot logo-slot--${size}`} aria-label="Logo de ISAI">
      ISAI
    </div>
  );
}
