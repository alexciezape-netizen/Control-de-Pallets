/* ═══════════════════════════════════════════════════════════
   CONTROL DE PALLETS — app.js
   ═══════════════════════════════════════════════════════════

   CONFIGURACIÓN DE INTEGRACIÓN:
   ─────────────────────────────────────────────────────────
   Reemplaza POWER_AUTOMATE_URL con la URL real de tu flujo
   de Power Automate HTTP Request Trigger. Ver guía en
   GUIA_INTEGRACION.md para instrucciones paso a paso.
   ═══════════════════════════════════════════════════════════ */

// ┌─────────────────────────────────────────────────────────┐
// │  ⚙️  CONFIGURACIÓN — EDITAR ANTES DE USAR               │
// └─────────────────────────────────────────────────────────┘
const CONFIG = {
  // Reemplaza esta URL con la del trigger HTTP de Power Automate
  POWER_AUTOMATE_URL: "https://default95d411cfc2b44147a725de03841ecb.97.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/d9653f4541cc4e739d3ba4d9c796a07b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=6RGeB1VW4jhFGsJiVDfmmoXQ49hYGDU9Doo_9yixeus",

  // Modo de prueba: si es true, no envía datos reales, solo muestra en consola
  TEST_MODE: false,
};

// ┌─────────────────────────────────────────────────────────┐
// │  CAMPOS REQUERIDOS (para validación)                    │
// └─────────────────────────────────────────────────────────┘
const REQUIRED_FIELDS = [
  { id: "responsable", label: "Responsable" },
  { id: "cdOrigen", label: "CD Origen" },
  { id: "cdDestino", label: "CD Destino" },
  { id: "cantidad", label: "Cantidad" },
  { id: "tipoPallet", label: "Tipo de Pallet" },
  { id: "nGRE", label: "N° GRE" },
  { id: "chofer", label: "Chofer" },
  { id: "placa", label: "Placa" },
];

// ┌─────────────────────────────────────────────────────────┐
// │  UTILIDADES                                             │
// └─────────────────────────────────────────────────────────┘

/**
 * Muestra un toast de notificación temporal.
 * @param {string} msg   - Mensaje a mostrar
 * @param {'error'|'success-toast'|''} type - Tipo visual
 */
function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = "toast"; }, 3400);
}

/**
 * Formatea la fecha actual al formato usado en el Excel: DD/MM/YYYY HH:mm
 */
function getFormattedDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Muestra u oculta el campo "otros" según el select relacionado.
 * @param {string} selectId - ID del select
 * @param {string} extraId  - ID del div extra-input
 */
function toggleOtros(selectId, extraId) {
  const sel = document.getElementById(selectId);
  const extra = document.getElementById(extraId);
  if (sel.value === "OTROS") {
    extra.classList.add("visible");
    extra.querySelector("input").focus();
  } else {
    extra.classList.remove("visible");
    extra.querySelector("input").value = "";
  }
}

// ┌─────────────────────────────────────────────────────────┐
// │  RECOLECCIÓN DE DATOS DEL FORMULARIO                    │
// └─────────────────────────────────────────────────────────┘

/**
 * Lee todos los campos del formulario y retorna un objeto JSON.
 * La estructura coincide exactamente con las columnas del Excel.
 */
function collectFormData() {
  const origenRaw = document.getElementById("cdOrigen").value;
  const destinoRaw = document.getElementById("cdDestino").value;

  const origen = origenRaw === "OTROS" ? document.getElementById("origenOtrosInput").value.trim() : origenRaw;
  const destino = destinoRaw === "OTROS" ? document.getElementById("destinoOtrosInput").value.trim() : destinoRaw;

  return {
    // N° se genera automáticamente en Excel / Power Automate
    Fecha: getFormattedDateTime(),
    Responsable: document.getElementById("responsable").value.trim(),
    Origen: origen,
    Destino: destino,
    Cantidad: parseInt(document.getElementById("cantidad").value, 10),
    TipoPallet: document.getElementById("tipoPallet").value,
    NGRE: document.getElementById("nGRE").value.trim(),
    NIntervega: document.getElementById("nIntervega").value.trim() || "—",
    Chofer: document.getElementById("chofer").value.trim(),
    Placa: document.getElementById("placa").value.trim().toUpperCase(),
    Observaciones: document.getElementById("observaciones").value.trim() || "Ninguna",
  };
}

// ┌─────────────────────────────────────────────────────────┐
// │  VALIDACIÓN                                             │
// └─────────────────────────────────────────────────────────┘

/**
 * Valida todos los campos requeridos.
 * Devuelve true si el formulario es válido, false en caso contrario.
 */
function validateForm() {
  // Limpiar errores previos
  document.querySelectorAll(".error-field").forEach((el) => el.classList.remove("error-field"));

  for (const field of REQUIRED_FIELDS) {
    const el = document.getElementById(field.id);
    if (!el.value.trim()) {
      el.classList.add("error-field");
      el.focus();
      showToast(`⚠️  Campo requerido: ${field.label}`, "error");
      return false;
    }
  }

  // Validar campos "OTROS"
  const origenSel = document.getElementById("cdOrigen");
  if (origenSel.value === "OTROS") {
    const inp = document.getElementById("origenOtrosInput");
    if (!inp.value.trim()) {
      inp.classList.add("error-field");
      inp.focus();
      showToast("⚠️  Especifica el CD Origen personalizado", "error");
      return false;
    }
  }

  const destinoSel = document.getElementById("cdDestino");
  if (destinoSel.value === "OTROS") {
    const inp = document.getElementById("destinoOtrosInput");
    if (!inp.value.trim()) {
      inp.classList.add("error-field");
      inp.focus();
      showToast("⚠️  Especifica el CD Destino personalizado", "error");
      return false;
    }
  }

  // Validar cantidad positiva
  const cant = parseInt(document.getElementById("cantidad").value, 10);
  if (isNaN(cant) || cant < 1) {
    document.getElementById("cantidad").classList.add("error-field");
    showToast("⚠️  La cantidad debe ser mayor a 0", "error");
    return false;
  }

  return true;
}

// ┌─────────────────────────────────────────────────────────┐
// │  ENVÍO A POWER AUTOMATE                                 │
// └─────────────────────────────────────────────────────────┘

/**
 * Envía los datos del formulario al flujo HTTP de Power Automate.
 * Power Automate recibirá el JSON y añadirá una fila en Excel.
 *
 * @param {Object} data - Datos recolectados del formulario
 * @returns {Promise<boolean>} - true si el envío fue exitoso
 */
async function sendToPowerAutomate(data) {
  // ── MODO DE PRUEBA ─────────────────────────────────────
  if (CONFIG.TEST_MODE) {
    console.log("🧪 [TEST MODE] Datos que se enviarían a Power Automate:");
    console.table(data);
    await new Promise((r) => setTimeout(r, 1200)); // Simula latencia de red
    return true;
  }

  // ── ENVÍO REAL ─────────────────────────────────────────
  try {
    const response = await fetch(CONFIG.POWER_AUTOMATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error("Power Automate respondió con error:", response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error de red al conectar con Power Automate:", err);
    return false;
  }
}

// ┌─────────────────────────────────────────────────────────┐
// │  FLUJO PRINCIPAL: ENVIAR FORMULARIO                     │
// └─────────────────────────────────────────────────────────┘
async function submitForm() {
  if (!validateForm()) return;

  const data = collectFormData();
  const overlay = document.getElementById("loadingOverlay");
  const btnSubmit = document.getElementById("btnSubmit");

  // Mostrar loading
  overlay.classList.add("show");
  btnSubmit.disabled = true;

  const success = await sendToPowerAutomate(data);

  overlay.classList.remove("show");
  btnSubmit.disabled = false;

  if (success) {
    showSuccessScreen(data);
  } else {
    showToast("❌ Error al enviar. Verifica tu conexión e inténtalo de nuevo.", "error");
  }
}

// ┌─────────────────────────────────────────────────────────┐
// │  PANTALLA DE ÉXITO                                      │
// └─────────────────────────────────────────────────────────┘
function showSuccessScreen(data) {
  document.getElementById("formContent").classList.add("hidden");
  const screen = document.getElementById("successScreen");
  screen.classList.add("show");

  // Mostrar resumen del registro
  document.getElementById("successDetails").innerHTML = `
    <strong>Responsable:</strong> ${data.Responsable}<br>
    <strong>Fecha:</strong> ${data.Fecha}<br>
    <strong>Origen → Destino:</strong> ${data.Origen} → ${data.Destino}<br>
    <strong>Cantidad:</strong> ${data.Cantidad} &nbsp;|&nbsp; <strong>Tipo:</strong> ${data.TipoPallet}<br>
    <strong>N° GRE:</strong> ${data.NGRE} &nbsp;|&nbsp; <strong>Placa:</strong> ${data.Placa}
  `;

  if (CONFIG.TEST_MODE) {
    showToast("🧪 Modo prueba: datos en consola (F12)", "");
  } else {
    showToast("✅ Datos enviados a Excel correctamente", "success-toast");
  }
}

// ┌─────────────────────────────────────────────────────────┐
// │  LIMPIAR FORMULARIO                                     │
// └─────────────────────────────────────────────────────────┘
function clearForm() {
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    el.value = "";
    el.classList.remove("error-field");
  });
  document.getElementById("origenOtros").classList.remove("visible");
  document.getElementById("destinoOtros").classList.remove("visible");
  document.getElementById("responsable").focus();
  showToast("🗑️  Formulario limpiado", "");
}

// ┌─────────────────────────────────────────────────────────┐
// │  VOLVER AL FORMULARIO                                   │
// └─────────────────────────────────────────────────────────┘
function goHome() {
  document.getElementById("successScreen").classList.remove("show");
  document.getElementById("formContent").classList.remove("hidden");
  clearForm();
}

// ┌─────────────────────────────────────────────────────────┐
// │  INICIALIZACIÓN                                         │
// └─────────────────────────────────────────────────────────┘
document.addEventListener("DOMContentLoaded", () => {

  // ── Fecha en el header ──────────────────────────────────
  const now = new Date();
  document.getElementById("dateDisplay").textContent = now.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // ── Selects con toggle OTROS ────────────────────────────
  document.getElementById("cdOrigen").addEventListener("change", () => {
    toggleOtros("cdOrigen", "origenOtros");
  });
  document.getElementById("cdDestino").addEventListener("change", () => {
    toggleOtros("cdDestino", "destinoOtros");
  });

  // ── Placa en mayúsculas ──────────────────────────────────
  document.getElementById("placa").addEventListener("input", function () {
    this.value = this.value.toUpperCase();
  });

  // ── Solo números en cantidad ─────────────────────────────
  document.getElementById("cantidad").addEventListener("keypress", function (e) {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });

  // ── Botones ──────────────────────────────────────────────
  document.getElementById("btnSubmit").addEventListener("click", submitForm);
  document.getElementById("btnClear").addEventListener("click", () => {
    if (confirm("¿Deseas limpiar todos los campos?")) clearForm();
  });
  document.getElementById("btnHome").addEventListener("click", goHome);

  // ── Limpiar errores al escribir ──────────────────────────
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", () => el.classList.remove("error-field"));
    el.addEventListener("change", () => el.classList.remove("error-field"));
  });

  // ── Aviso de modo prueba en consola ─────────────────────
  if (CONFIG.TEST_MODE) {
    console.log(
      "%c🧪 MODO PRUEBA ACTIVO",
      "background:#E8184A;color:white;padding:4px 10px;border-radius:4px;font-weight:bold;"
    );
    console.log("Para activar el envío real:\n 1. Obtén tu URL de Power Automate (ver GUIA_INTEGRACION.md)\n 2. Pega la URL en CONFIG.POWER_AUTOMATE_URL\n 3. Cambia TEST_MODE a false");
  }
});
