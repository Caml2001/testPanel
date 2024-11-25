import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle, XCircle, MessageSquare, Upload, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function VerificationModal({ verification, onClose, onUpdateStatus }) {
  const [imageStatuses, setImageStatuses] = useState({
    front: { loading: true, error: false },
    back: { loading: true, error: false },
    selfie: { loading: true, error: false }
  });
  const [notes, setNotes] = useState(verification?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRefs = {
    front: useRef(null),
    back: useRef(null),
    selfie: useRef(null)
  };

  useEffect(() => {
    setImageStatuses({
      front: { loading: true, error: false },
      back: { loading: true, error: false },
      selfie: { loading: true, error: false }
    });
    setNotes(verification?.notes || '');
  }, [verification]);

  if (!verification) return null;

  const handleImageLoad = (type) => {
    console.log(`Imagen ${type} cargada correctamente`);
    setImageStatuses(prev => ({
      ...prev,
      [type]: { loading: false, error: false }
    }));
  };

  const handleImageError = (type) => {
    console.log(`Error al cargar imagen ${type}`);
    setImageStatuses(prev => ({
      ...prev,
      [type]: { loading: false, error: true }
    }));
  };

  const handleStatusUpdate = async (status) => {
    setIsSubmitting(true);
    await onUpdateStatus(verification.id, status, notes);
    setIsSubmitting(false);
    onClose();
  };

  const handleImageUpload = async (type, file) => {
    try {
      setUploading(true);
      console.log('Iniciando carga de imagen:', {
        tipo: type,
        tamaño: file.size,
        tipo_archivo: file.type,
        verification_id: verification.id
      });
      
      // Usar el UUID del registro existente para mantener consistencia
      const folderPath = verification.id;

      console.log('Información de verificación:', {
        id: verification.id,
        front_url: verification.front_photo_url,
        back_url: verification.back_photo_url,
        selfie_url: verification.selfie_url
      });

      // Create the new file path using verification ID
      const filePath = `${folderPath}/${Date.now()}_${type}.jpg`;
      console.log('Nueva ruta de archivo:', filePath);

      // Upload the new image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('id-photos')
        .upload(filePath, file, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Error en carga a storage:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('id-photos')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('No se pudo generar la URL pública');
      }

      console.log('URL pública generada:', {
        datos_url: urlData,
        url_publica: urlData.publicUrl
      });

      // Prepare update data with correct column names
      let updateField;
      if (type === 'selfie') {
        updateField = 'selfie_url';
      } else {
        updateField = `${type}_photo_url`;
      }

      const updateData = {
        [updateField]: urlData.publicUrl
      };

      console.log('Datos a actualizar:', {
        campo: updateField,
        valor: urlData.publicUrl,
        id_verificacion: verification.id
      });

      // Update the verification record
      const { data: dbData, error: updateError } = await supabase
        .from('identity_verifications')
        .update(updateData)
        .eq('id', verification.id)
        .select();

      if (updateError) {
        console.error('Error en actualización de base de datos:', updateError);
        throw updateError;
      }

      console.log('Respuesta de actualización:', {
        datos: dbData,
        error: updateError
      });

      // Update local state with correct field name
      verification[updateField] = urlData.publicUrl;
      setImageStatuses(prev => ({
        ...prev,
        [type]: { loading: false, error: false }
      }));

      toast.success('Imagen actualizada exitosamente');
      console.log('Proceso completado exitosamente para:', type);
    } catch (error) {
      console.error('Error detallado en carga de imagen:', {
        tipo: type,
        mensaje: error.message,
        detalles: error,
        codigo: error.code,
        stack: error.stack
      });
      setImageStatuses(prev => ({
        ...prev,
        [type]: { loading: false, error: true }
      }));
      toast.error(error.message || 'Error al actualizar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (type, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    await handleImageUpload(type, file);
  };

  const renderImage = (type, title) => {
    const url = verification[`${type === 'selfie' ? 'selfie_url' : `${type}_photo_url`}`];
    const { loading, error } = imageStatuses[type];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <input
            type="file"
            ref={fileInputRefs[type]}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileChange(type, e)}
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRefs[type].current?.click()}
            disabled={uploading}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-1"></div>
            ) : (
              <Camera className="w-4 h-4 mr-1" />
            )}
            Cambiar
          </button>
        </div>
        <div className="relative aspect-[3/2] rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 text-center">Error al cargar la imagen</p>
            </div>
          ) : (
            <img
              key={url}
              src={url}
              alt={title}
              className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => {
                console.log(`Imagen ${type} cargada correctamente, URL:`, url);
                handleImageLoad(type);
              }}
              onError={() => {
                console.log(`Error al cargar imagen ${type}, URL:`, url);
                handleImageError(type);
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Verificación de Identidad</h2>
            <p className="text-sm text-gray-500">
              Creada el {new Date(verification.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {renderImage('front', 'Frente del ID')}
            {renderImage('back', 'Reverso del ID')}
            {renderImage('selfie', 'Selfie')}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                <MessageSquare className="w-4 h-4 inline-block mr-1" />
                Notas
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar notas sobre la verificación..."
                className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-black focus:ring-black"
              />
            </div>

            {verification.status === 'pending' && (
              <div className="flex gap-4">
                <button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar verificación
                </button>
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar verificación
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}