// ============================================================
//  data.js — Operaciones CRUD de actividades en Firestore
// ============================================================

const COLLECTION_REGISTROS = "registros";

/**
 * Obtiene todas las actividades de Firestore.
 * @returns {Promise<Array>}
 */
async function obtenerActividades() {
  try {
    const snap = await db.collection(COLLECTION_REGISTROS).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error al obtener actividades:", err);
    return [];
  }
}

/**
 * Guarda una nueva actividad en Firestore.
 * @param {Object} actividad
 */
async function guardarActividad(actividad) {
  try {
    await db.collection(COLLECTION_REGISTROS).doc(actividad.id).set(actividad);
  } catch (err) {
    console.error("Error al guardar actividad:", err);
    throw err;
  }
}

/**
 * Actualiza campos de una actividad existente.
 * @param {string} id
 * @param {Object} cambios
 */
async function actualizarActividad(id, cambios) {
  try {
    await db.collection(COLLECTION_REGISTROS).doc(id).update(cambios);
  } catch (err) {
    console.error("Error al actualizar actividad:", err);
    throw err;
  }
}

/**
 * Elimina una actividad de Firestore.
 * @param {string} id
 */
async function eliminarActividad(id) {
  try {
    await db.collection(COLLECTION_REGISTROS).doc(id).delete();
  } catch (err) {
    console.error("Error al eliminar actividad:", err);
    throw err;
  }
}
