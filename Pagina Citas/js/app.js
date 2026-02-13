(function () {
  'use strict';

  const STORAGE_PACIENTES = 'sonrisa-sana-pacientes';
  const STORAGE_CITAS = 'sonrisa-sana-citas';
  const LIMIT_ULTIMOS = 5;

  const HORAS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  function getPacientes() {
    try {
      const data = localStorage.getItem(STORAGE_PACIENTES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function setPacientes(arr) {
    localStorage.setItem(STORAGE_PACIENTES, JSON.stringify(arr));
  }

  function getCitas() {
    try {
      const data = localStorage.getItem(STORAGE_CITAS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function setCitas(arr) {
    localStorage.setItem(STORAGE_CITAS, JSON.stringify(arr));
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function formatFechaISO(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatFechaTexto(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('es-ES', opts);
  }

  function hoyISO() {
    return formatFechaISO(new Date());
  }

  // --- Navegación ---
  const views = document.querySelectorAll('.view');
  const navLinks = document.querySelectorAll('.nav-link');

  function showView(viewId) {
    views.forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + viewId);
    });
    navLinks.forEach(function (a) {
      const isActive = a.getAttribute('data-view') === viewId;
      a.classList.toggle('active', isActive);
    });
    if (viewId === 'agendar') {
      llenarSelectPacientes();
      llenarSelectHoras();
    }
    if (viewId === 'citas-dia') {
      const inputFecha = document.getElementById('citas-dia-fecha');
      if (!inputFecha.value) inputFecha.value = hoyISO();
      actualizarCitasDelDia();
    }
    if (viewId === 'consultar') {
      filtrarConsultar();
    }
    if (viewId === 'registro') {
      renderUltimosPacientes();
    }
    if (viewId === 'inicio') {
      actualizarEstadisticas();
    }
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) showView(view);
    });
  });

  document.querySelectorAll('[data-view]').forEach(function (el) {
    if (el.classList.contains('nav-link')) return;
    el.addEventListener('click', function (e) {
      const view = el.getAttribute('data-view');
      if (view) {
        e.preventDefault();
        showView(view);
      }
    });
  });

  document.querySelectorAll('.btn-quick[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const view = btn.getAttribute('data-goto');
      if (view) showView(view);
    });
  });

  // --- Fecha actual (Inicio) ---
  const fechaActualEl = document.getElementById('fecha-actual');
  if (fechaActualEl) {
    fechaActualEl.textContent = formatFechaTexto(hoyISO());
  }

  // --- Estadísticas Inicio ---
  function actualizarEstadisticas() {
    const hoy = hoyISO();
    const citas = getCitas();
    const pacientes = getPacientes();
    const citasHoy = citas.filter(function (c) { return c.fecha === hoy; });
    const ahora = new Date();
    const proxima = citas
      .filter(function (c) {
        const d = new Date(c.fecha + 'T' + c.hora);
        return d >= ahora;
      })
      .sort(function (a, b) {
        return new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora);
      })[0];

    const statCitas = document.getElementById('stat-citas-dia');
    const statPacientes = document.getElementById('stat-pacientes');
    const statProxima = document.getElementById('stat-proxima');

    if (statCitas) statCitas.textContent = citasHoy.length;
    if (statPacientes) statPacientes.textContent = pacientes.length;
    if (statProxima) {
      if (proxima) {
        const p = getPacientes().find(function (x) { return x.id === proxima.pacienteId; });
        statProxima.textContent = (p ? p.nombre : 'Paciente') + ' - ' + proxima.fecha + ' ' + proxima.hora;
      } else {
        statProxima.textContent = 'No hay citas pendientes';
      }
    }
  }

  // --- Registro de pacientes ---
  const formPaciente = document.getElementById('form-paciente');
  const btnCancelarPaciente = document.getElementById('btn-cancelar-paciente');

  if (formPaciente) {
    formPaciente.addEventListener('submit', function (e) {
      e.preventDefault();
      const nombre = document.getElementById('paciente-nombre').value.trim();
      const telefono = document.getElementById('paciente-telefono').value.trim();
      if (!nombre || !telefono) return;
      const pacientes = getPacientes();
      pacientes.push({ id: id(), nombre, telefono });
      setPacientes(pacientes);
      formPaciente.reset();
      renderUltimosPacientes();
      actualizarEstadisticas();
      llenarSelectPacientes();
    });
  }

  if (btnCancelarPaciente) {
    btnCancelarPaciente.addEventListener('click', function () {
      document.getElementById('form-paciente').reset();
    });
  }

  function renderUltimosPacientes() {
    const tbody = document.getElementById('tabla-ultimos-pacientes');
    const resumen = document.getElementById('registro-resumen');
    if (!tbody) return;
    const pacientes = getPacientes();
    const ultimos = pacientes.slice(-LIMIT_ULTIMOS).reverse();
    const total = pacientes.length;
    const mostrar = Math.min(LIMIT_ULTIMOS, total);

    if (resumen) resumen.textContent = 'Mostrando los ' + mostrar + ' más recientes de ' + total + ' totales';

    tbody.innerHTML = ultimos.map(function (p) {
      return (
        '<tr>' +
          '<td>' + escapeHtml(p.nombre) + '</td>' +
          '<td>' + escapeHtml(p.telefono) + '</td>' +
          '<td><button type="button" class="btn-table btn-delete" data-delete-paciente="' + p.id + '"><i class="fas fa-trash-alt"></i> Eliminar</button></td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-delete-paciente]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('¿Eliminar este paciente?')) return;
        const pid = btn.getAttribute('data-delete-paciente');
        let list = getPacientes().filter(function (x) { return x.id !== pid; });
        setPacientes(list);
        list = getCitas().filter(function (c) { return c.pacienteId !== pid; });
        setCitas(list);
        renderUltimosPacientes();
        actualizarEstadisticas();
        llenarSelectPacientes();
        if (document.getElementById('view-consultar').classList.contains('active')) filtrarConsultar();
      });
    });
  }

  // --- Consultar (búsqueda y tabla) ---
  const buscarInput = document.getElementById('buscar-paciente');
  function filtrarConsultar() {
    const term = (buscarInput && buscarInput.value.trim().toLowerCase()) || '';
    const pacientes = getPacientes();
    const filtrados = term
      ? pacientes.filter(function (p) {
          return p.nombre.toLowerCase().includes(term) || (p.telefono && p.telefono.includes(term));
        })
      : pacientes;

    const tbody = document.getElementById('tabla-consultar-pacientes');
    if (!tbody) return;
    tbody.innerHTML = filtrados.map(function (p) {
      return (
        '<tr>' +
          '<td><i class="fas fa-user"></i> ' + escapeHtml(p.nombre) + '</td>' +
          '<td><i class="fas fa-phone"></i> ' + escapeHtml(p.telefono) + '</td>' +
          '<td>' +
            '<button type="button" class="btn-table btn-edit" data-edit-paciente="' + p.id + '"><i class="fas fa-edit"></i> Editar</button>' +
            '<button type="button" class="btn-table btn-delete" data-delete-paciente="' + p.id + '"><i class="fas fa-trash-alt"></i> Eliminar</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-edit-paciente]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        abrirModalEditarPaciente(btn.getAttribute('data-edit-paciente'));
      });
    });
    tbody.querySelectorAll('[data-delete-paciente]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('¿Eliminar este paciente?')) return;
        const pid = btn.getAttribute('data-delete-paciente');
        let list = getPacientes().filter(function (x) { return x.id !== pid; });
        setPacientes(list);
        list = getCitas().filter(function (c) { return c.pacienteId !== pid; });
        setCitas(list);
        filtrarConsultar();
        actualizarEstadisticas();
        llenarSelectPacientes();
      });
    });
  }

  if (buscarInput) {
    buscarInput.addEventListener('input', filtrarConsultar);
    buscarInput.addEventListener('keyup', filtrarConsultar);
  }

  // --- Modal editar paciente ---
  const modalEditar = document.getElementById('modal-editar-paciente');
  const formEditar = document.getElementById('form-editar-paciente');
  const btnCerrarEditar = document.getElementById('btn-cerrar-modal-editar');

  function abrirModalEditarPaciente(pacienteId) {
    const p = getPacientes().find(function (x) { return x.id === pacienteId; });
    if (!p) return;
    document.getElementById('editar-paciente-id').value = p.id;
    document.getElementById('editar-paciente-nombre').value = p.nombre;
    document.getElementById('editar-paciente-telefono').value = p.telefono;
    if (modalEditar) modalEditar.classList.remove('hidden');
  }

  if (formEditar) {
    formEditar.addEventListener('submit', function (e) {
      e.preventDefault();
      const id = document.getElementById('editar-paciente-id').value;
      const nombre = document.getElementById('editar-paciente-nombre').value.trim();
      const telefono = document.getElementById('editar-paciente-telefono').value.trim();
      const pacientes = getPacientes().map(function (x) {
        if (x.id === id) return { id: x.id, nombre, telefono };
        return x;
      });
      setPacientes(pacientes);
      if (modalEditar) modalEditar.classList.add('hidden');
      filtrarConsultar();
      renderUltimosPacientes();
      llenarSelectPacientes();
    });
  }

  if (btnCerrarEditar) btnCerrarEditar.addEventListener('click', function () { if (modalEditar) modalEditar.classList.add('hidden'); });
  if (modalEditar) {
    modalEditar.addEventListener('click', function (e) {
      if (e.target === modalEditar) modalEditar.classList.add('hidden');
    });
  }

  // --- Select paciente (Agendar / Editar cita) ---
  function llenarSelectPacientes(selectId) {
    const ids = selectId ? [selectId] : ['cita-paciente', 'editar-cita-paciente'];
    const pacientes = getPacientes();
    ids.forEach(function (sid) {
      const sel = document.getElementById(sid);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">Selecciona un paciente</option>' +
        pacientes.map(function (p) { return '<option value="' + p.id + '">' + escapeHtml(p.nombre) + ' - ' + escapeHtml(p.telefono) + '</option>'; }).join('');
      if (current && pacientes.some(function (p) { return p.id === current; })) sel.value = current;
    });
  }

  function llenarSelectHoras(selectId) {
    const ids = selectId ? [selectId] : ['cita-hora', 'editar-cita-hora'];
    ids.forEach(function (sid) {
      const sel = document.getElementById(sid);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">Selecciona una hora</option>' +
        HORAS.map(function (h) { return '<option value="' + h + '">' + h + '</option>'; }).join('');
      if (current && HORAS.includes(current)) sel.value = current;
    });
  }

  // --- Formulario nueva cita ---
  const formCita = document.getElementById('form-cita');
  const btnCancelarCita = document.getElementById('btn-cancelar-cita');

  if (formCita) {
    formCita.addEventListener('submit', function (e) {
      e.preventDefault();
      const pacienteId = document.getElementById('cita-paciente').value;
      const fecha = document.getElementById('cita-fecha').value;
      const hora = document.getElementById('cita-hora').value;
      if (!pacienteId || !fecha || !hora) return;
      const citas = getCitas();
      const conflicto = citas.some(function (c) { return c.fecha === fecha && c.hora === hora; });
      if (conflicto) {
        alert('Ya existe una cita para esa fecha y hora.');
        return;
      }
      citas.push({ id: id(), pacienteId, fecha, hora });
      setCitas(citas);
      formCita.reset();
      actualizarEstadisticas();
      showView('citas-dia');
      document.getElementById('citas-dia-fecha').value = fecha;
      actualizarCitasDelDia();
    });
  }

  if (btnCancelarCita) btnCancelarCita.addEventListener('click', function () { document.getElementById('form-cita').reset(); });

  const citaFecha = document.getElementById('cita-fecha');
  if (citaFecha) citaFecha.min = hoyISO();

  // --- Citas del día ---
  const citasDiaFecha = document.getElementById('citas-dia-fecha');
  const citasDiaTexto = document.getElementById('citas-dia-fecha-texto');
  const citasDiaResumen = document.getElementById('citas-dia-resumen');

  if (citasDiaFecha) {
    citasDiaFecha.value = hoyISO();
    citasDiaFecha.addEventListener('change', actualizarCitasDelDia);
  }

  function actualizarCitasDelDia() {
    const fecha = document.getElementById('citas-dia-fecha') && document.getElementById('citas-dia-fecha').value;
    if (!fecha) return;
    if (citasDiaTexto) citasDiaTexto.textContent = formatFechaTexto(fecha);
    const citas = getCitas().filter(function (c) { return c.fecha === fecha; });
    const pacientes = getPacientes();
    citas.sort(function (a, b) { return a.hora.localeCompare(b.hora); });

    if (citasDiaResumen) citasDiaResumen.textContent = citas.length + ' cita(s) para esta fecha';

    const tbody = document.getElementById('tabla-citas-dia');
    if (!tbody) return;
    tbody.innerHTML = citas.map(function (c) {
      const p = pacientes.find(function (x) { return x.id === c.pacienteId; });
      const nombre = p ? p.nombre : 'Desconocido';
      const telefono = p ? p.telefono : '-';
      return (
        '<tr>' +
          '<td><span class="badge-hora">' + escapeHtml(c.hora) + '</span></td>' +
          '<td>' + escapeHtml(nombre) + '</td>' +
          '<td><i class="fas fa-phone"></i> ' + escapeHtml(telefono) + '</td>' +
          '<td>' +
            '<button type="button" class="btn-table btn-edit" data-edit-cita="' + c.id + '"><i class="fas fa-edit"></i> Editar</button>' +
            '<button type="button" class="btn-table btn-delete" data-delete-cita="' + c.id + '"><i class="fas fa-trash-alt"></i> Eliminar</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-edit-cita]').forEach(function (btn) {
      btn.addEventListener('click', function () { abrirModalEditarCita(btn.getAttribute('data-edit-cita')); });
    });
    tbody.querySelectorAll('[data-delete-cita]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('¿Eliminar esta cita?')) return;
        const cid = btn.getAttribute('data-delete-cita');
        const list = getCitas().filter(function (x) { return x.id !== cid; });
        setCitas(list);
        actualizarCitasDelDia();
        actualizarEstadisticas();
      });
    });
  }

  // --- Modal editar cita ---
  const modalEditarCita = document.getElementById('modal-editar-cita');
  const formEditarCita = document.getElementById('form-editar-cita');
  const btnCerrarCita = document.getElementById('btn-cerrar-modal-cita');

  function abrirModalEditarCita(citaId) {
    const c = getCitas().find(function (x) { return x.id === citaId; });
    if (!c) return;
    document.getElementById('editar-cita-id').value = c.id;
    llenarSelectPacientes('editar-cita-paciente');
    llenarSelectHoras('editar-cita-hora');
    document.getElementById('editar-cita-paciente').value = c.pacienteId;
    document.getElementById('editar-cita-fecha').value = c.fecha;
    document.getElementById('editar-cita-hora').value = c.hora;
    if (modalEditarCita) modalEditarCita.classList.remove('hidden');
  }

  if (formEditarCita) {
    formEditarCita.addEventListener('submit', function (e) {
      e.preventDefault();
      const id = document.getElementById('editar-cita-id').value;
      const pacienteId = document.getElementById('editar-cita-paciente').value;
      const fecha = document.getElementById('editar-cita-fecha').value;
      const hora = document.getElementById('editar-cita-hora').value;
      const citas = getCitas().map(function (x) {
        if (x.id === id) return { id: x.id, pacienteId, fecha, hora };
        return x;
      });
      const conflicto = citas.some(function (c) {
        return c.id !== id && c.fecha === fecha && c.hora === hora;
      });
      if (conflicto) {
        alert('Ya existe otra cita para esa fecha y hora.');
        return;
      }
      setCitas(citas);
      if (modalEditarCita) modalEditarCita.classList.add('hidden');
      actualizarCitasDelDia();
      actualizarEstadisticas();
    });
  }

  if (btnCerrarCita) btnCerrarCita.addEventListener('click', function () { if (modalEditarCita) modalEditarCita.classList.add('hidden'); });
  if (modalEditarCita) {
    modalEditarCita.addEventListener('click', function (e) {
      if (e.target === modalEditarCita) modalEditarCita.classList.add('hidden');
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // Inicial
  renderUltimosPacientes();
  actualizarEstadisticas();
  if (citasDiaFecha && citasDiaFecha.value) actualizarCitasDelDia();
})();
