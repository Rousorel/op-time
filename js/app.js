// ============================================================
//  app.js — Lógica principal (async con Firebase)
// ============================================================

let registrosCacheados = [];
let unsubscribeRegistros = null;

window.onload = async function () {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (usuario) {
    mostrarApp(usuario);
  }
};

/* ========================= */
/* LOGIN                      */
/* ========================= */

async function guardarNombre() {
  const username = document.getElementById("username").value.trim().toUpperCase();

  if (!username) {
    alert("Ingresa usuario");
    return;
  }

  setLoading(true);

  const usuario = await buscarUsuarioPorUsername(username);

  setLoading(false);

  if (!usuario) {
    alert("Usuario no registrado");
    return;
  }

  localStorage.setItem("usuario", JSON.stringify(usuario));

  mostrarApp(usuario);
  await cargarHistorial();
  await mostrarActividadActiva();
}

function mostrarApp(usuario) {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display  = "block";

  document.getElementById("saludo").innerText =
    `Hola, ${usuario.nombre} · Turno ${usuario.turno}`;

  mostrarReloj();
  
  // Iniciar listener de tiempo real para registros (0 lecturas después del inicial)
  iniciarListenerRegistros();
}

function iniciarListenerRegistros() {
  if (unsubscribeRegistros) unsubscribeRegistros();

  unsubscribeRegistros = db.collection("registros").onSnapshot(
    snapshot => {
      registrosCacheados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      cargarHistorial();
      mostrarActividadActiva();
    },
    err => console.error("Error en listener registros:", err)
  );
}

function mostrarReloj() {
  const estado = document.getElementById("estado");

  setInterval(() => {
    const now = new Date();
    estado.innerText = now.toLocaleString("es-MX");
  }, 1000);
}

/* ========================= */
/* ACTIVIDAD — INICIAR        */
/* ========================= */

async function iniciarActividad() {
  const actividad = document.getElementById("actividad").value;
  const cart      = document.getElementById("cart").value.trim();
  const cantidad  = document.getElementById("cantidad").value;

  if (!actividad || !cart || !cantidad) {
    alert("Completa todos los campos");
    return;
  }

  const usuario   = JSON.parse(localStorage.getItem("usuario"));

  const activa = registrosCacheados.find(
    r => r.status === "En proceso" && r.nombre === usuario.nombre
  );

  if (activa) {
    alert("Ya tienes una actividad en proceso");
    return;
  }

  const nueva = {
    id:        Date.now().toString(),
    nombre:    usuario.nombre,
    turno:     usuario.turno,
    actividad: actividad.trim().toLowerCase(),
    cart,
    cantidad,
    inicio:    new Date().toISOString(),
    fin:       null,
    status:    "En proceso"
  };

  setLoading(true);
  await guardarActividad(nueva);
  setLoading(false);

  localStorage.setItem("actividadActualId", nueva.id);
  document.getElementById("estado").innerText = "Actividad en proceso...";
}

/* ========================= */
/* ACTIVIDAD — FINALIZAR      */
/* ========================= */

async function finalizarActividad() {
  const usuario   = JSON.parse(localStorage.getItem("usuario"));

  const activa = registrosCacheados.find(
    r => r.status === "En proceso" && r.nombre === usuario.nombre
  );

  if (!activa) {
    alert("No hay actividad en proceso");
    return;
  }

  localStorage.setItem("actividadFinalizarId", activa.id);

  // Mostrar modal
  const modal = document.getElementById("modalFinalizacion");
  modal.classList.remove("hidden");

  document.getElementById("comentarioExitoso").value    = "";
  document.getElementById("comentarioFallo").value      = "";
  document.getElementById("comentarioContainer").classList.add("hidden");
  document.getElementById("comentarioContainerFallo").classList.add("hidden");
}

function responderFinalizacion(exitoso) {
  localStorage.setItem("finalizacionExitosa", exitoso);

  const comentarioContainer      = document.getElementById("comentarioContainer");
  const comentarioContainerFallo = document.getElementById("comentarioContainerFallo");
  const btnSi       = document.getElementById("btnSi");
  const btnNo       = document.getElementById("btnNo");
  const btnConfirmar = document.getElementById("btnConfirmar");

  if (exitoso) {
    comentarioContainerFallo.classList.add("hidden");
    comentarioContainer.classList.remove("hidden");
  } else {
    comentarioContainer.classList.add("hidden");
    comentarioContainerFallo.classList.remove("hidden");
  }

  btnSi.disabled = true;
  btnNo.disabled = true;
  btnConfirmar.classList.remove("hidden");
}

async function confirmarFinalizacion() {
  const actividadId = localStorage.getItem("actividadFinalizarId");
  const exitoso     = localStorage.getItem("finalizacionExitosa") === "true";
  const modal       = document.getElementById("modalFinalizacion");

  let cambios;

  if (exitoso) {
    const comentario = document.getElementById("comentarioExitoso").value.trim();
    cambios = {
      fin:       new Date().toISOString(),
      status:    "Finalizado",
      exitoso:   true,
      comentario: comentario || ""
    };
  } else {
    const comentario = document.getElementById("comentarioFallo").value.trim();

    if (!comentario) {
      alert("Por favor, ingrese un comentario describiendo la incidencia");
      return;
    }

    cambios = {
      fin:       new Date().toISOString(),
      status:    "Finalizado",
      exitoso:   false,
      comentario
    };
  }

  setLoading(true);
  await actualizarActividad(actividadId, cambios);
  setLoading(false);

  localStorage.removeItem("actividadFinalizarId");
  localStorage.removeItem("finalizacionExitosa");

  modal.classList.add("hidden");

  document.getElementById("btnSi").disabled  = false;
  document.getElementById("btnNo").disabled  = false;
  document.getElementById("btnConfirmar").classList.add("hidden");

  document.getElementById("estado").innerText = "Actividad finalizada ✓";

  limpiarCampos();
  await cargarHistorial();
  await mostrarActividadActiva();
}

function limpiarCampos() {
  document.getElementById("cart").value     = "";
  document.getElementById("cantidad").value = "";
}

/* ========================= */
/* SESIÓN                     */
/* ========================= */

function cerrarSesion() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("actividadActualId");

  limpiarTimer();
  
  // Detener listener para ahorrar lecturas
  if (unsubscribeRegistros) {
    unsubscribeRegistros();
    unsubscribeRegistros = null;
  }
  registrosCacheados = [];

  document.getElementById("app").style.display   = "none";
  document.getElementById("login").style.display = "block";

  document.getElementById("username").value   = "";
  document.getElementById("estado").innerText = "";
}

/* ========================= */
/* HISTORIAL                  */
/* ========================= */

function cargarHistorial() {
  const usuario   = JSON.parse(localStorage.getItem("usuario"));
  const lista     = document.getElementById("historial");

  if (!lista) return;

  lista.innerHTML = "";

  registrosCacheados
    .filter(r => r.nombre === usuario.nombre && r.status === "Finalizado")
    .sort((a, b) => new Date(b.fin) - new Date(a.fin))
    .forEach(r => {
      const item = document.createElement("li");
      const icono = r.exitoso === false ? "❌" : "✅";
      item.textContent = `${icono} ${r.actividad} — ${r.cart} — ${r.cantidad} pcs`;
      lista.appendChild(item);
    });
}

/* ========================= */
/* ACTIVIDAD ACTIVA           */
/* ========================= */

function obtenerActividadActiva() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  return registrosCacheados.find(
    r => r.nombre === usuario.nombre && r.status === "En proceso"
  );
}

function mostrarActividadActiva() {
  const activa = obtenerActividadActiva();
  const box    = document.getElementById("actividadActiva");

  if (!activa) {
    box.classList.add("hidden");
    limpiarTimer();
    habilitarInputs(true);
    return;
  }

  box.classList.remove("hidden");

  document.getElementById("act_tipo").textContent     = activa.actividad;
  document.getElementById("act_cart").textContent     = activa.cart;
  document.getElementById("act_cantidad").textContent = activa.cantidad;

  iniciarTimer(activa.inicio);
  habilitarInputs(false);
}

/* ========================= */
/* TIMER                      */
/* ========================= */

let timerInterval = null;

function iniciarTimer(inicio) {
  const timerEl = document.getElementById("act_timer");

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const diff = Math.floor((new Date() - new Date(inicio)) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    timerEl.textContent = `${h}h ${m}m ${s}s`;
  }, 1000);
}

function limpiarTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ========================= */
/* UI CONTROL                 */
/* ========================= */

function habilitarInputs(enabled) {
  ["actividad", "cart", "cantidad"].forEach(id => {
    document.getElementById(id).disabled = !enabled;
  });

  document.getElementById("btnInicio").disabled = !enabled;
  document.getElementById("btnFin").disabled    = enabled;
}

function setLoading(isLoading) {
  const btn = document.getElementById("btnInicio");
  if (!btn) return;
  btn.style.opacity = isLoading ? "0.6" : "1";
  btn.style.pointerEvents = isLoading ? "none" : "auto";
}

/* ========================= */
/* KEYBOARD SHORTCUTS         */
/* ========================= */

function handleEnter(event) {
  if (event.key === "Enter") guardarNombre();
}

function handleCartEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("cantidad").focus();
  }
}

function handleCantidadEnter(event) {
  if (event.key === "Enter") iniciarActividad();
}
