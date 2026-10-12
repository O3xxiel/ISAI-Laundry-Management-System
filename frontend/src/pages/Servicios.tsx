import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Servicio, UnidadCobro } from '../api';
import AlertCard from '../components/AlertCard';

const UNIDADES: { value: UnidadCobro; label: string }[] = [
  { value: 'peso', label: 'Por libra' },
  { value: 'pieza', label: 'Por pieza' },
  { value: 'fijo', label: 'Tarifa fija' },
];

const ETIQUETA_UNIDAD: Record<UnidadCobro, string> = {
  peso: '/ lb',
  pieza: '/ pieza',
  fijo: 'fijo',
};

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [nombre, setNombre] = useState('');
  const [unidadCobro, setUnidadCobro] = useState<UnidadCobro>('peso');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState('');

  function cargar() {
    api.servicios.listar().then(setServicios);
  }

  useEffect(cargar, []);

  async function crearServicio(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.servicios.crear({ nombre, unidadCobro, precio: Number(precio) });
      setNombre('');
      setPrecio('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h1>Catálogo de servicios</h1>

      <form onSubmit={crearServicio} className="form-row">
        <input type="text" placeholder="Nombre (ej. Edredón)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <select value={unidadCobro} onChange={(e) => setUnidadCobro(e.target.value as UnidadCobro)}>
          {UNIDADES.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Precio (Q)"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          required
        />
        <button type="submit">Agregar servicio</button>
      </form>
      {error && <AlertCard>{error}</AlertCard>}

      <table>
        <thead>
          <tr><th>Servicio</th><th>Cobro</th><th>Precio</th></tr>
        </thead>
        <tbody>
          {servicios.map((s) => (
            <tr key={s.id}>
              <td>{s.nombre}</td>
              <td>{UNIDADES.find((u) => u.value === s.unidadCobro)?.label}</td>
              <td>Q{s.precio} {ETIQUETA_UNIDAD[s.unidadCobro]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
