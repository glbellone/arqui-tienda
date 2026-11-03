import { useEffect, useState } from 'react';
import { adminAnalitica, aProblema, type AnaliticaTienda } from '../api';

export default function AdminAnalitica() {
  const [analitica, setAnalitica] = useState<AnaliticaTienda[] | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<unknown | null>(null);

  const cargarDatos = () => {
    setCargando(true);
    setError(null);
    adminAnalitica
      .totalesPorTienda()
      .then((data) => {
        setAnalitica(data);
        setCargando(false);
      })
      .catch((err) => {
        setError(err);
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (cargando) {
    return <div className="p-6 text-center text-gray-600">Cargando analítica global...</div>;
  }

  if (error) {
    const problema = aProblema(error);
    return (
      <div className="p-6 text-center text-red-600">
        <h3 className="font-bold">{problema.title}</h3>
        <p>{problema.detail}</p>
        <button type="button" className="boton mt-4" onClick={cargarDatos}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración - Analítica Global</h1>
          <p className="text-gray-600 text-sm">Monitoreo global de tiendas (bypass de RLS para auditoría y oversight).</p>
        </div>
        <button type="button" className="boton" onClick={cargarDatos}>
          Actualizar
        </button>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tienda ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Productos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedidos Confirmados</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventas Totales</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Actualización</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analitica?.map((item) => (
              <tr key={item.tiendaId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.tiendaId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.totalProductos}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.totalPedidosConfirmados}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">
                  ${(item.montoTotalVentasCentavos / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                  {new Date(item.actualizadoEn).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!analitica || analitica.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No hay registros analíticos globales todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}