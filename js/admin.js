// ============================================================
//  admin.js — Dashboard (real-time Firestore listener)
// ============================================================

let registros        = [];
let usuarios         = [];
let filtroFechaInicio = null;
let filtroFechaFin    = null;
let registrosActivos  = [];
let registrosFinalizados = [];
let unsubscribeListenerActivos = null;

/* ========================= */
/* INIT                       */
/* ========================= */

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];

  const inputInicio = document.getElementById("fecha_inicio");
  const inputFin    = document.getElementById("fecha_fin");

  if (inputInicio && inputFin) {
    inputInicio.value = hoy;
    inputFin.value    = hoy;

    filtroFechaInicio = new Date(hoy);
    filtroFechaFin    = new Date(hoy + "T23:59:59");
  }

  iniciarListenerTiempoReal();
  cargarUsuariosFirestore();
});

/* ========================= */
/* LISTENER TIEMPO REAL        */
/* ========================= */

function obtenerRangoConsulta() {
  if (filtroFechaInicio && filtroFechaFin) {
    return { inicio: filtroFechaInicio, fin: filtroFechaFin };
  }

  const hoy = new Date();
  return {
    inicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0),
    fin:    new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999)
  };
}

async function iniciarListenerTiempoReal() {
  if (unsubscribeListenerActivos) unsubscribeListenerActivos();

  const queryActivos = db.collection("registros")
    .where("status", "==", "En proceso");

  unsubscribeListenerActivos = queryActivos.onSnapshot(
    snapshot => {
      registrosActivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      registros = [...registrosActivos, ...registrosFinalizados];
      actualizarVistaAdmin();
    },
    err => {
      console.error("Error en listener Firestore:", err);
    }
  );
}

async function actualizarDatosFinalizados() {
  const { inicio, fin } = obtenerRangoConsulta();
  const inicioISO = inicio.toISOString();
  const finISO    = fin.toISOString();

  registrosFinalizados = [];
  actualizarVistaAdmin();

  try {
    const queryFinalizados = db.collection("registros")
      .where("status", "==", "Finalizado")
      .where("fin", ">=", inicioISO)
      .where("fin", "<=", finISO)
      .orderBy("fin");

    const snapshot = await queryFinalizados.get();
    registrosFinalizados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    registros = [...registrosActivos, ...registrosFinalizados];
    actualizarVistaAdmin();
  } catch (err) {
    console.error("Error al cargar registros finalizados:", err);
  }
}

async function cargarUsuariosFirestore() {
  try {
    usuarios = await obtenerUsuarios();
    cargarUsuarios();
  } catch (err) {
    console.error("Error al cargar usuarios:", err);
  }
}

function actualizarVistaAdmin() {
  calcularKPIs(registros);
  llenarFiltros(registros);
  filtrar();
  actualizarUPH();
  actualizarEstadoCarga();
}

function actualizarEstadoCarga() {
  const etiqueta = document.getElementById("dataStatusInfo");
  if (!etiqueta) return;

  if (registrosFinalizados.length === 0) {
    etiqueta.textContent = "Solo en proceso. Actualiza.";
    etiqueta.classList.remove("hidden");
    return;
  }

  const textoRango = (!filtroFechaInicio && !filtroFechaFin)
    ? " (hoy)"
    : "";

  etiqueta.textContent = `Finalizados${textoRango}`;
  etiqueta.classList.remove("hidden");
}

/* ========================= */
/* TABLA                      */
/* ========================= */

function renderTabla(data) {
  const tabla = document.getElementById("tabla");
  if (!tabla) return;

  tabla.innerHTML = "";

  data.forEach(r => {
    const tiempo         = calcularTiempo(r.inicio, r.fin);
    const claseNoExitoso = (r.status === "Finalizado" && r.exitoso === false)
      ? "row-no-exitoso"
      : "";

    tabla.innerHTML += `
      <tr class="${claseNoExitoso}" data-id="${r.id}">
        <td>${r.nombre}</td>
        <td>${r.actividad}</td>
        <td>${r.cart}</td>
        <td>${r.cantidad}</td>
        <td>${formatearFecha(r.inicio)}</td>
        <td>${r.fin ? formatearFecha(r.fin) : "—"}</td>
        <td><span class="status-badge status-${r.status === "En proceso" ? "proceso" : "final"}">${r.status}</span></td>
        <td>${tiempo}</td>
        <td>
          ${r.comentario
            ? `<span title="${r.comentario}" class="btn-comentario">💬</span>`
            : ""}
          <button onclick="editarRegistro('${r.id}')" class="btn-edit">✏️</button>
          <button onclick="eliminarRegistro('${r.id}')" class="btn-delete">🗑️</button>
        </td>
      </tr>
    `;
  });
}

/* ========================= */
/* FILTROS                    */
/* ========================= */

function llenarFiltros(data) {
  llenarSelect("f_nombre",    obtenerUnicos(data.map(r => r.nombre)));
  llenarSelect("f_actividad", obtenerUnicos(data.map(r => r.actividad)));
  llenarSelect("f_cart",      obtenerUnicos(data.map(r => r.cart)));
  llenarSelect("f_cantidad",  obtenerUnicos(data.map(r => r.cantidad)));
  llenarSelect("f_inicio",    obtenerUnicos(data.map(r => formatearSoloFecha(r.inicio))));
  llenarSelect("f_fin",       obtenerUnicos(data.map(r => r.fin ? formatearSoloFecha(r.fin) : "—")));
  llenarSelect("f_status",    obtenerUnicos(data.map(r => r.status)));
}

function llenarSelect(id, valores) {
  const select = document.getElementById(id);
  if (!select) return;

  const valorActual = select.value;

  select.innerHTML = "";

  const def = document.createElement("option");
  def.value       = "";
  def.textContent = "Todos";
  select.appendChild(def);

  valores.forEach(v => {
    const opt       = document.createElement("option");
    opt.value       = v;
    opt.textContent = v;
    select.appendChild(opt);
  });

  if ([...select.options].some(o => o.value === valorActual)) {
    select.value = valorActual;
  }
}

function obtenerUnicos(arr) {
  return [...new Set(arr.filter(v => v !== null && v !== undefined))]
    .sort((a, b) => a.toString().localeCompare(b.toString()));
}

/* ========================= */
/* FILTRAR                    */
/* ========================= */

function filtrar() {
  const f_nombre    = document.getElementById("f_nombre")?.value;
  const f_actividad = document.getElementById("f_actividad")?.value;
  const f_cart      = document.getElementById("f_cart")?.value;
  const f_cantidad  = document.getElementById("f_cantidad")?.value;
  const f_inicio    = document.getElementById("f_inicio")?.value;
  const f_fin       = document.getElementById("f_fin")?.value;
  const f_status    = document.getElementById("f_status")?.value;

  const filtrados = registros.filter(r => {
    const fechaFin = r.fin ? new Date(r.fin) : null;

    return (
      (!f_nombre    || r.nombre === f_nombre) &&
      (!f_actividad || r.actividad === f_actividad) &&
      (!f_cart      || r.cart === f_cart) &&
      (!f_cantidad  || r.cantidad.toString() === f_cantidad) &&
      (!f_status    || r.status === f_status) &&
      (!f_inicio    || formatearSoloFecha(r.inicio) === f_inicio) &&
      (!f_fin       || (r.fin && formatearSoloFecha(r.fin) === f_fin)) &&
      (!filtroFechaInicio || !fechaFin || fechaFin >= filtroFechaInicio) &&
      (!filtroFechaFin    || !fechaFin || fechaFin <= filtroFechaFin)
    );
  });

  renderTabla(filtrados);
}

async function eliminarRegistro(id) {
  const confirmar = confirm("¿Eliminar registro? Esta acción no se puede deshacer.");
  if (!confirmar) return;

  await eliminarActividad(id);
  // El listener onSnapshot actualizará la UI automáticamente
}

function editarRegistro(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const r = registros.find(reg => reg.id === id);
  if (!r || !row) return;

  const actividades = obtenerUnicos(registros.map(reg => reg.actividad)).filter(Boolean);
  const actividadOptions = actividades.map(act => `<option value="${act}" ${r.actividad === act ? 'selected' : ''}>${act}</option>`).join('');

  row.innerHTML = `
    <td><input type="text" value="${r.nombre}" id="edit_nombre_${id}"></td>
    <td><select id="edit_actividad_${id}">${actividadOptions}</select></td>
    <td><input type="text" value="${r.cart}" id="edit_cart_${id}"></td>
    <td><input type="number" value="${r.cantidad}" id="edit_cantidad_${id}"></td>
    <td><input type="datetime-local" value="${formatearDatetimeLocal(r.inicio)}" id="edit_inicio_${id}"></td>
    <td><input type="datetime-local" value="${r.fin ? formatearDatetimeLocal(r.fin) : ''}" id="edit_fin_${id}"></td>
    <td>
      <select id="edit_status_${id}" onchange="toggleExitoso('${id}')">
        <option value="En proceso" ${r.status === 'En proceso' ? 'selected' : ''}>En proceso</option>
        <option value="Finalizado" ${r.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
      </select>
      <div id="exitoso_container_${id}" style="margin-top: 5px;">
        ${r.status === 'Finalizado' ? `<label><input type="checkbox" id="edit_exitoso_${id}" ${r.exitoso ? 'checked' : ''}> Éxito</label>` : ''}
      </div>
    </td>
    <td>${calcularTiempo(r.inicio, r.fin)}</td>
    <td>
      <button onclick="guardarEdicion('${id}')" class="btn-save">💾</button>
      <button onclick="cancelarEdicion('${id}')" class="btn-cancel">❌</button>
    </td>
  `;
}

function toggleExitoso(id) {
  const statusSelect = document.getElementById(`edit_status_${id}`);
  const container = document.getElementById(`exitoso_container_${id}`);
  if (statusSelect.value === 'Finalizado') {
    container.innerHTML = `<label><input type="checkbox" id="edit_exitoso_${id}"> Éxito</label>`;
  } else {
    container.innerHTML = '';
  }
}

async function guardarEdicion(id) {
  const nombre = document.getElementById(`edit_nombre_${id}`).value;
  const actividad = document.getElementById(`edit_actividad_${id}`).value;
  const cart = document.getElementById(`edit_cart_${id}`).value;
  const cantidad = parseInt(document.getElementById(`edit_cantidad_${id}`).value);
  const inicio = document.getElementById(`edit_inicio_${id}`).value.replace('T', ' ');
  const finInput = document.getElementById(`edit_fin_${id}`).value;
  const fin = finInput ? finInput.replace('T', ' ') : null;
  const status = document.getElementById(`edit_status_${id}`).value;
  const exitosoEl = document.getElementById(`edit_exitoso_${id}`);
  const exitoso = exitosoEl ? exitosoEl.checked : null;

  const cambios = {
    nombre,
    actividad,
    cart,
    cantidad,
    inicio,
    fin,
    status,
    ...(status === 'Finalizado' ? { exitoso } : { exitoso: null })
  };

  try {
    await actualizarActividad(id, cambios);
    // El listener actualizará la UI
  } catch (err) {
    alert("Error al guardar cambios: " + err.message);
  }
}

function cancelarEdicion(id) {
  // Re-render the table to cancel edit
  const filtrados = registros.filter(r => {
    const fechaFin = r.fin ? new Date(r.fin) : null;
    return (
      (!filtroFechaInicio || !fechaFin || fechaFin >= filtroFechaInicio) &&
      (!filtroFechaFin || !fechaFin || fechaFin <= filtroFechaFin)
    );
  });
  renderTabla(filtrados);
}

/* ========================= */
/* KPIs                       */
/* ========================= */

function calcularKPIs(data) {
  const resumen = {
    "consolidacion":    { proceso: 0, final: 0, personas: new Set() },
    "vas":              { proceso: 0, final: 0, personas: new Set() },
    "empaque":          { proceso: 0, final: 0, personas: new Set() },
    "etiquetado manual":{ proceso: 0, final: 0, personas: new Set() },
    "decasing":         { proceso: 0, final: 0, personas: new Set() },
    "otro":             { proceso: 0, final: 0, personas: new Set() }
  };

  data.forEach(r => {
    const tipo    = (r.actividad || "").trim().toLowerCase();
    const cantidad = Number(r.cantidad) || 0;
    const key      = resumen[tipo] ? tipo : "otro";

    if (r.status === "En proceso") {
      resumen[key].proceso += cantidad;
      resumen[key].personas.add(r.nombre);
    }

    if (r.status === "Finalizado" && r.exitoso !== false) {
      const fechaFin = new Date(r.fin);
      const cumple   =
        (!filtroFechaInicio || fechaFin >= filtroFechaInicio) &&
        (!filtroFechaFin    || fechaFin <= filtroFechaFin);

      if (cumple) resumen[key].final += cantidad;
    }
  });

  setKPI("consol",    resumen["consolidacion"]);
  setKPI("vas",       resumen["vas"]);
  setKPI("empaque",   resumen["empaque"]);
  setKPI("etiquetado",resumen["etiquetado manual"]);
  setKPI("decasing",  resumen["decasing"]);
}

function setKPI(prefix, data) {
  if (!data) return;
  const el = id => document.getElementById(`${prefix}_${id}`);
  if (el("proceso"))  el("proceso").innerText  = data.proceso;
  if (el("final"))    el("final").innerText    = data.final;
  if (el("personas")) el("personas").innerText = data.personas.size;
}

/* ========================= */
/* UPH                        */
/* ========================= */

function actualizarUPH() {
  const actividadFiltro = (document.getElementById("uph_actividad")?.value || "");
  const turnoFiltro     = (document.getElementById("uph_turno")?.value || "").trim().toUpperCase();
  const search          = (document.getElementById("uph_search")?.value || "").trim().toLowerCase();

  const finalizados = registros.filter(r => r.status === "Finalizado" && r.fin);

  const finalizadosFecha = finalizados.filter(r => {
    const fechaFin = obtenerFechaTurno(r.fin);
    return (
      (!filtroFechaInicio || fechaFin >= filtroFechaInicio) &&
      (!filtroFechaFin    || fechaFin <= filtroFechaFin)
    );
  });

  const registrosFiltrados = finalizadosFecha.filter(r => {
    const turnoReg = (r.turno || "").trim().toUpperCase();
    return (
      (!turnoFiltro     || turnoReg === turnoFiltro) &&
      (!actividadFiltro || r.actividad === actividadFiltro) &&
      (!search          || `${r.nombre} ${r.actividad}`.toLowerCase().includes(search))
    );
  });

  llenarActividadesUPH(finalizadosFecha);
  renderUPH(registrosFiltrados);
}

function renderUPH(data) {
  const tabla    = document.getElementById("tablaUPH");
  const theadRow = document.getElementById("uphHeaderRow");
  if (!tabla || !theadRow) return;

  const buckets = Array.from({ length: 24 }, (_, i) => (6 + i) % 24);

  theadRow.innerHTML = `
    <th>Usuario</th>
    <th>Actividad</th>
    <th>Turno</th>
    ${buckets.map(h => `<th>${formatHora(h)}</th>`).join("")}
    <th>Total</th>
  `;

  const resumen = {};

  data.forEach(r => {
    const fin = new Date(r.fin);
    if (isNaN(fin)) return;

    const hora = fin.getHours();
    const key  = `${r.nombre}||${r.actividad}`;

    if (!resumen[key]) {
      resumen[key] = {
        nombre:    r.nombre,
        actividad: r.actividad,
        turno:     (r.turno || "").trim().toUpperCase(),
        horas:     Array(buckets.length).fill(0),
        total:     0
      };
    }

    const cantidad = Number(r.cantidad) || 0;
    const index    = buckets.indexOf(hora);
    if (index === -1) return;

    resumen[key].horas[index] += cantidad;
    resumen[key].total        += cantidad;
  });

  const rows = Object.values(resumen).sort((a, b) => {
    if (a.turno    !== b.turno)    return a.turno.localeCompare(b.turno);
    if (a.nombre   !== b.nombre)   return a.nombre.localeCompare(b.nombre);
    return a.actividad.localeCompare(b.actividad);
  });

  tabla.innerHTML = "";
  rows.forEach(row => {
    const cols = row.horas.map(v => {
      let clase = '';
      if (v > 90) clase = 'uph-high';
      else if (v < 90 && v > 0) clase = 'uph-low';
      return `<td class="${clase}">${v || ""}</td>`;
    }).join("");
    const totalClase = row.total > 90 ? 'uph-high' : (row.total < 90 && row.total > 0 ? 'uph-low' : '');
    tabla.innerHTML += `
      <tr>
        <td>${row.nombre}</td>
        <td>${row.actividad}</td>
        <td>${row.turno}</td>
        ${cols}
        <td class="${totalClase}"><strong>${row.total}</strong></td>
      </tr>
    `;
  });
}

function llenarActividadesUPH(data) {
  const select = document.getElementById("uph_actividad");
  if (!select) return;

  const actividadActual = select.value;
  const actividades     = obtenerUnicos(data.map(r => r.actividad));

  select.innerHTML = '<option value="">Todas las actividades</option>';
  actividades.forEach(act => {
    const opt   = document.createElement("option");
    opt.value       = act;
    opt.textContent = act;
    select.appendChild(opt);
  });

  if ([...select.options].some(o => o.value === actividadActual)) {
    select.value = actividadActual;
  }
}

/* ========================= */
/* USUARIOS                   */
/* ========================= */

async function crearUsuario() {
  const username = document.getElementById("u_username").value.trim();
  const nombre   = document.getElementById("u_nombre").value.trim();
  const turno    = document.getElementById("u_turno").value;

  if (!username || !nombre || !turno) {
    alert("Completa todos los campos");
    return;
  }

  const ok = await agregarUsuario({ username, nombre, turno });
  if (!ok) return;

  await cargarUsuariosFirestore();
  limpiarFormularioUsuario();
}

function limpiarFormularioUsuario() {
  document.getElementById("u_username").value = "";
  document.getElementById("u_nombre").value   = "";
  document.getElementById("u_turno").value    = "";
}

function cargarUsuarios() {
  const search   = (document.getElementById("u_search")?.value || "").trim().toLowerCase();
  const usuariosFiltr = usuarios.filter(u =>
    !search || `${u.username} ${u.nombre}`.toLowerCase().includes(search)
  );
  const tabla = document.getElementById("tablaUsuarios");
  if (!tabla) return;

  tabla.innerHTML = "";
  usuariosFiltr.forEach(u => {
    tabla.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>${u.nombre}</td>
        <td>${u.turno}</td>
        <td>
          <button class="btn-delete-user" onclick="eliminarUser('${u.username}')">🗑️</button>
        </td>
      </tr>
    `;
  });
}

function filtrarUsuarios() {
  cargarUsuarios();
}

async function eliminarUser(username) {
  if (!confirm("¿Eliminar usuario?")) return;

  await eliminarUsuario(username);
  await cargarUsuariosFirestore();
}

/* ========================= */
/* FILTRO FECHA               */
/* ========================= */

function aplicarFiltroFecha() {
  const inicio = document.getElementById("fecha_inicio").value;
  const fin    = document.getElementById("fecha_fin").value;

  filtroFechaInicio = inicio ? new Date(inicio)              : null;
  filtroFechaFin    = fin    ? new Date(fin + "T23:59:59")   : null;

  registrosFinalizados = [];
  registros = [...registrosActivos];
  actualizarVistaAdmin();
}

function limpiarFiltroFecha() {
  const hoy = new Date().toISOString().split("T")[0];

  filtroFechaInicio = new Date(hoy);
  filtroFechaFin    = new Date(hoy + "T23:59:59");

  document.getElementById("fecha_inicio").value = hoy;
  document.getElementById("fecha_fin").value    = hoy;

  registrosFinalizados = [];
  registros = [...registrosActivos];
  actualizarVistaAdmin();
}

/* ========================= */
/* TOGGLE PANELES             */
/* ========================= */

function toggleKPI() {
  const kpiSection = document.getElementById("kpiSection");
  const btn        = document.querySelector(".toggle-kpi-btn");
  if (!kpiSection || !btn) return;

  kpiSection.classList.toggle("hidden");
  btn.textContent = kpiSection.classList.contains("hidden")
    ? "Mostrar KPI"
    : "Ocultar KPI";
}

function toggleUsuarios() {
  const panel = document.getElementById("usuariosPanel");
  const btn   = document.querySelector(".toggle-users-btn");

  panel.classList.toggle("hidden");
  btn.textContent = panel.classList.contains("hidden")
    ? "Mostrar usuarios"
    : "Ocultar usuarios";
}

/* ========================= */
/* EXPORTAR CSV               */
/* ========================= */

function exportarCSV() {
  const headers = ["Nombre","Actividad","Cart","Cantidad","Inicio","Fin","Status","Tiempo","Exitoso","Comentario"];

  const filas = registros.map(r => [
    r.nombre,
    r.actividad,
    r.cart,
    r.cantidad,
    r.inicio  ? formatearFecha(r.inicio) : "",
    r.fin     ? formatearFecha(r.fin)    : "",
    r.status,
    calcularTiempo(r.inicio, r.fin),
    r.exitoso === false ? "No" : "Sí",
    r.comentario || ""
  ]);

  const csv = [headers, ...filas]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href     = url;
  link.download = `actividades_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

/* ========================= */
/* UTILIDADES                 */
/* ========================= */

function pad(v) {
  return v.toString().padStart(2, "0");
}

function formatearFecha(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatearSoloFecha(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function formatearDatetimeLocal(fecha) {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function obtenerFechaTurno(fecha) {
  const d = new Date(fecha);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return d;
}

function formatHora(hora) {
  return hora.toString().padStart(2, "0") + ":00";
}

function calcularTiempo(inicio, fin) {
  const start = new Date(inicio);
  const end   = fin ? new Date(fin) : new Date();
  let diff    = Math.floor((end - start) / 1000);

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  return `${h}h ${m}m ${s}s`;
}
