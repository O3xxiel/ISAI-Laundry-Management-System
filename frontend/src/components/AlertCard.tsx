import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react';

type Tipo = 'error' | 'warning' | 'success';

const ICONOS: Record<Tipo, typeof AlertCircle> = {
  error: AlertCircle,
  warning: TriangleAlert,
  success: CheckCircle2,
};

export default function AlertCard({ tipo = 'error', children }: { tipo?: Tipo; children: React.ReactNode }) {
  const Icono = ICONOS[tipo];
  return (
    <div className={`alert-card-inline alert-card-inline--${tipo}`} role="alert">
      <Icono size={17} strokeWidth={2} />
      <span>{children}</span>
    </div>
  );
}
