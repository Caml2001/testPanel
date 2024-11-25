import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, AlertCircle, ImageOff, CheckCircle, XCircle, Clock, Search, Filter, ChevronRight } from 'lucide-react';
import VerificationModal from './VerificationModal';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching verifications...');

      const { data, error: fetchError } = await supabase
        .from('identity_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error('Error al cargar las verificaciones');
      }

      setVerifications(data || []);
    } catch (err) {
      console.error('Error fetching verifications:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e) => {
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMTAwIDg4Ljg4ODlDMTAzLjY4MiA4OC44ODg5IDEwNi42NjcgODUuOTA0MSAxMDYuNjY3IDgyLjIyMjJDMTA2LjY2NyA3OC41NDA0IDEwMy42ODIgNzUuNTU1NiAxMDAgNzUuNTU1NkM5Ni4zMTgyIDc1LjU1NTYgOTMuMzMzNCA3OC41NDA0IDkzLjMzMzQgODIuMjIyMkM5My4zMzM0IDg1LjkwNDEgOTYuMzE4MiA4OC44ODg5IDEwMCA4OC44ODg5Wk0xMDAgOTUuNTU1NkM5NC44OTc4IDk1LjU1NTYgODQuNjY2NyA5OC4xMjI3IDg0LjY2NjcgMTAzLjIyMlYxMDYuNjY3SDExNS4zMzNWMTAzLjIyMkMxMTUuMzMzIDk4LjEyMjcgMTA1LjEwMiA5NS41NTU2IDEwMCA5NS41NTU2WiIgZmlsbD0iIzlDQTNCRiIvPjwvc3ZnPg==';
  };

  const updateVerificationStatus = async (id, status, notes = '') => {
    try {
      const { error } = await supabase
        .from('identity_verifications')
        .update({ status, notes })
        .eq('id', id);

      if (error) {
        console.error('Update error:', error);
        throw new Error('Error al actualizar el estado');
      }

      setVerifications(prev =>
        prev.map(v => v.id === id ? { ...v, status, notes } : v)
      );

      toast.success(`Verificación ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`);
    } catch (err) {
      console.error('Status update error:', err);
      toast.error(err.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'rejected':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      default:
        return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    }
  };

  const filteredVerifications = verifications.filter(verification => {
    if (filter !== 'all' && verification.status !== filter) return false;
    
    if (search) {
      const searchLower = search.toLowerCase();
      const createdAt = new Date(verification.created_at).toLocaleDateString();
      return (
        verification.id.toLowerCase().includes(searchLower) ||
        createdAt.includes(searchLower) ||
        (verification.notes || '').toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Verificaciones de Identidad</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona y revisa las verificaciones de identidad enviadas por los usuarios.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID o fecha..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black appearance-none"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobados</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {filteredVerifications.length === 0 ? (
            <div className="text-center py-12">
              <ImageOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">No hay verificaciones</h2>
              <p className="text-gray-600">
                {search || filter !== 'all' 
                  ? 'No se encontraron resultados con los filtros actuales.'
                  : 'Aún no se han subido documentos para verificar.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Documento
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Fecha
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Notas
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredVerifications.map((verification) => (
                    <tr 
                      key={verification.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedVerification(verification)}
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                        <div className="flex items-center">
                          <div className="h-16 w-24 flex-shrink-0">
                            <img
                              className="h-16 w-24 rounded-sm object-cover"
                              src={verification.front_photo_url}
                              alt=""
                              onError={handleImageError}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              ID: {verification.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeColor(verification.status)}`}>
                            {getStatusIcon(verification.status)}
                            <span className="ml-1">{getStatusText(verification.status)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(verification.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        <p className="line-clamp-2">
                          {verification.notes || 'Sin notas'}
                        </p>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedVerification && (
        <VerificationModal
          verification={selectedVerification}
          onClose={() => setSelectedVerification(null)}
          onUpdateStatus={updateVerificationStatus}
        />
      )}
    </div>
  );
}