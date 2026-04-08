// ============================================================
//  usuarios.js — Gestión de usuarios en Firestore
// ============================================================

const COLLECTION_USUARIOS = "usuarios";

/**
 * Obtiene todos los usuarios.
 * @returns {Promise<Array>}
 */
async function obtenerUsuarios() {
  try {
    const snap = await db.collection(COLLECTION_USUARIOS).get();
    return snap.docs.map(doc => ({ ...doc.data() }));
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    return [];
  }
}

/**
 * Agrega un nuevo usuario.
 * @param {Object} usuario - { username, nombre, turno }
 * @returns {Promise<boolean>}
 */
async function agregarUsuario(usuario) {
  const username = usuario.username.toUpperCase().trim();

  try {
    const doc = await db.collection(COLLECTION_USUARIOS).doc(username).get();

    if (doc.exists) {
      alert("El usuario ya existe");
      return false;
    }

    await db.collection(COLLECTION_USUARIOS).doc(username).set({
      username,
      nombre: usuario.nombre.trim(),
      turno:  usuario.turno
    });

    return true;
  } catch (err) {
    console.error("Error al agregar usuario:", err);
    return false;
  }
}

/**
 * Busca un usuario por su username.
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function buscarUsuarioPorUsername(username) {
  try {
    const doc = await db
      .collection(COLLECTION_USUARIOS)
      .doc(username.toUpperCase().trim())
      .get();

    return doc.exists ? doc.data() : null;
  } catch (err) {
    console.error("Error al buscar usuario:", err);
    return null;
  }
}

/**
 * Elimina un usuario por username.
 * @param {string} username
 */
async function eliminarUsuario(username) {
  try {
    await db
      .collection(COLLECTION_USUARIOS)
      .doc(username.toUpperCase().trim())
      .delete();
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
  }
}

// ============================================================
//  Seed de usuarios iniciales (solo si la colección está vacía)
// ============================================================

(async function seedUsuariosIniciales() {
  try {
    const snap = await db.collection(COLLECTION_USUARIOS).limit(1).get();
    if (!snap.empty) return;

    const defaults = [
      { username: "DOMINGUEZMH", nombre: "Heber Dominguez", turno: "A" },
      { username: "JUAN",        nombre: "Juan Perez",       turno: "B" }
    ];

    for (const u of defaults) {
      await db.collection(COLLECTION_USUARIOS).doc(u.username).set(u);
    }

    console.log("Usuarios iniciales creados en Firestore.");
  } catch (err) {
    console.warn("No se pudo hacer seed de usuarios:", err);
  }
})();
