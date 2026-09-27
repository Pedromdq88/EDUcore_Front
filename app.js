const API_BASE_URL = 'http://localhost:8080/api/v1';

// Estado de sesión dinámico persistido por multi-tenant
let currentSession = {
  email: sessionStorage.getItem('current_user_email') || '',
  role: sessionStorage.getItem('current_user_role') || '',
  institutionId: sessionStorage.getItem('current_institution_id') || ''
};

let activeTutors = [];
let activeStudents = [];
let activeStaff = [];
let activeSubjects = [];
let portfoliosList = [];
let announcementsList = [];

let currentTutorData = null;
let currentStaffData = null;
let currentStudentData = null;
let currentSchoolProfile = null;
let hotSpreadsheetInstance = null;

// Catálogo dinámico provisto por el backend según el nivel de la institución
let currentLevelClassrooms = [];

let navigationHistory = [];

// Helper global para peticiones HTTP Multi-Tenant blindadas
async function apiFetch(endpoint, options = {}) {
  if (!currentSession.institutionId) {
    alert("Error: No se ha detectado la institución activa. Vuelva a iniciar sesión.");
    throw new Error("Missing institutionId");
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Institution-Id': currentSession.institutionId,
    'X-User-Role': currentSession.role
  };

  options.headers = {
    ...defaultHeaders,
    ...options.headers
  };

  return fetch(`${API_BASE_URL}${endpoint}`, options);
}

function pushNavigation(viewType, entityId = null) {
  const last = navigationHistory[navigationHistory.length - 1];
  if (!last || last.viewType !== viewType || last.entityId !== entityId) {
    navigationHistory.push({ viewType, entityId });
  }
}

// Variables Globales de Cuotas
let selectedStudentForCuotas = null;
let studentFeesList = [];
let institutionalEmails = { receiptEmail: '', feeQueryEmail: '' };
let isEditingCuotas = false;
let tempFeesState = {};

// Variables Globales de Retiros y Restricciones
let selectedStudentForRetiros = null;
let currentStudentPickups = [];
let selectedStudentForRestricciones = null;
let currentStudentRestrictions = [];

// ========================================================
// REGLA DE CORTE ESCOLAR Y ASIGNACIÓN SEGÚN NIVEL
// ========================================================

function calcularSala(fechaNacimientoStr, cicloLectivo = (currentSchoolProfile?.academicYear || new Date().getFullYear())) {
  if (!fechaNacimientoStr) return { valida: false, sala: "", error: "Seleccione fecha de nacimiento" };

  const [anioNac, mesNac, diaNac] = fechaNacimientoStr.split('-').map(Number);
  if (!anioNac || !mesNac || !diaNac) return { valida: false, sala: "", error: "Fecha incompleta" };

  const nivel = currentSchoolProfile?.educationLevel || 'JARDIN';

  const edadAlCorte = mesNac >= 7
      ? (cicloLectivo - anioNac - 1)
      : (cicloLectivo - anioNac);

  // Si es Nivel Inicial se aplica la regla legal estricta al 30 de junio
  if (nivel === 'JARDIN') {
    switch (edadAlCorte) {
      case 3:
        return { valida: true, sala: "1° Sección (3 años)", error: null };
      case 4:
        return { valida: true, sala: "2° Sección (4 años)", error: null };
      case 5:
        return { valida: true, sala: "3° Sección (5 años)", error: null };
      default:
        if (edadAlCorte < 3) {
          return { valida: false, sala: null, error: `❌ No admisible: Cumple ${edadAlCorte} años al 30/06 (Mínimo 3 años para Sala de 3)` };
        } else {
          return { valida: false, sala: null, error: `❌ Cumple ${edadAlCorte} años al 30/06 (Corresponde a Nivel Primario)` };
        }
    }
  }

  // En Primaria y Secundaria la asignación la define el selector oficial
  return { valida: true, sala: "", edadCalculada: edadAlCorte, error: null };
}

function recalcularSalaFormularioMatricula() {
  const birthDate = document.getElementById('studentBirthDate')?.value;
  const cicloLectivo = currentSchoolProfile?.academicYear || new Date().getFullYear();
  const nivel = currentSchoolProfile?.educationLevel || 'JARDIN';

  const labelSala = document.getElementById('labelSalaCalculada');
  const hiddenClassroom = document.getElementById('studentClassroom');
  const selectClassroom = document.getElementById('student-classroom');

  if (!birthDate) {
    if (labelSala) {
      labelSala.textContent = "Seleccione fecha de nacimiento";
      labelSala.className = "text-sm font-bold text-slate-500";
    }
    if (hiddenClassroom) hiddenClassroom.value = "";
    return;
  }

  const res = calcularSala(birthDate, cicloLectivo);

  if (nivel === 'JARDIN') {
    if (res.valida) {
      labelSala.textContent = res.sala;
      labelSala.className = "text-sm font-bold text-emerald-800";
      if (hiddenClassroom) hiddenClassroom.value = res.sala;
      if (selectClassroom) selectClassroom.value = res.sala;
    } else {
      labelSala.textContent = res.error;
      labelSala.className = "text-xs font-bold text-rose-600";
      if (hiddenClassroom) hiddenClassroom.value = "";
    }
  } else {
    // Primaria o Secundaria: solo muestra la edad al corte
    if (labelSala) {
      labelSala.textContent = `Edad al 30/06: ${res.edadCalculada} años`;
      labelSala.className = "text-sm font-bold text-slate-700";
    }
  }
}

function recalcularSalaFormularioEdicion() {
  const birthDate = document.getElementById('edit-student-nacimiento')?.value;
  const cicloLectivo = currentSchoolProfile?.academicYear || new Date().getFullYear();
  const nivel = currentSchoolProfile?.educationLevel || 'JARDIN';

  const labelSala = document.getElementById('edit-labelSalaCalculada');
  const hiddenClassroom = document.getElementById('edit-student-classroom');

  if (!birthDate) return;

  const res = calcularSala(birthDate, cicloLectivo);

  if (nivel === 'JARDIN') {
    if (res.valida) {
      if (labelSala) {
        labelSala.textContent = res.sala;
        labelSala.className = "text-xs font-bold text-emerald-800";
      }
      if (hiddenClassroom) hiddenClassroom.value = res.sala;
    } else {
      if (labelSala) {
        labelSala.textContent = res.error;
        labelSala.className = "text-xs font-bold text-rose-600";
      }
      if (hiddenClassroom) hiddenClassroom.value = "";
    }
  } else {
    if (labelSala) {
      labelSala.textContent = `Edad al corte: ${res.edadCalculada} años`;
      labelSala.className = "text-xs font-bold text-slate-700";
    }
  }
}

// ========================================================
// AUTENTICACIÓN Y NAVEGACIÓN
// ========================================================

async function loadLoginInstitutions() {
  const select = document.getElementById('loginInstitutionSelect');
  if (!select) return;

  try {
    const res = await fetch(`${API_BASE_URL}/public/institutions`);
    if (!res.ok) throw new Error("Error al consultar instituciones");

    const tenants = await res.json();

    if (tenants.length === 0) {
      select.innerHTML = '<option value="">No hay instituciones activas</option>';
      return;
    }

    select.innerHTML = tenants.map(t =>
        `<option value="${t.id}">${t.name} (${t.educationLevel || 'JARDIN'}) ${t.cueCode ? `- CUE: ${t.cueCode}` : ''}</option>`
    ).join('');

  } catch (err) {
    console.error("Error cargando tenants:", err);
    select.innerHTML = '<option value="">Error al cargar instituciones</option>';
  }
}

function handleLogin() {
  const email = document.getElementById('emailInput').value.trim();
  const selectInst = document.getElementById('loginInstitutionSelect');
  const detectedInstitutionId = selectInst ? selectInst.value : '';

  if (!email) {
    alert("Por favor ingrese su email institucional.");
    return;
  }

  if (!detectedInstitutionId) {
    alert("Debe seleccionar una institución válida.");
    return;
  }

  // 🧹 Limpieza preventiva de datos previos en memoria
  activeStudents = [];
  activeTutors = [];
  activeStaff = [];

  let role = 'TEACHER';
  if (email.includes('direccion') || email.includes('director')) role = 'DIRECTOR';
  else if (email.includes('admin')) role = 'ADMINISTRATIVE';
  else if (email.includes('preceptor')) role = 'PRECEPTOR';
  else if (email.includes('tutor') || email.includes('padre')) role = 'TUTOR';

  currentSession.email = email;
  currentSession.role = role;
  currentSession.institutionId = detectedInstitutionId;

  // Persistencia limpia en sessionStorage
  sessionStorage.setItem('current_user_email', email);
  sessionStorage.setItem('current_user_role', role);
  sessionStorage.setItem('current_institution_id', detectedInstitutionId);

  document.getElementById('userDisplay').innerText = email;
  document.getElementById('roleBadge').innerText =
      role === 'DIRECTOR' ? 'Directora' :
          (role === 'ADMINISTRATIVE' ? 'Administrativo' :
              (role === 'PRECEPTOR' ? 'Preceptor/a' :
                  (role === 'TUTOR' ? 'Tutor' : 'Docente')));

  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainDashboard').classList.remove('hidden');

  refreshAllData();
}

function handleLogout() {
  sessionStorage.removeItem('current_user_email');
  sessionStorage.removeItem('current_user_role');
  sessionStorage.removeItem('current_institution_id');
  sessionStorage.clear();
  location.reload();
}

let targetSelectParaCrearTutor = null;

function abrirModalRapidoTutor(selectId) {
  targetSelectParaCrearTutor = selectId;
  const form = document.getElementById('formTutorRapido');
  if (form) form.reset();
  document.getElementById('tutorModalRapido')?.classList.remove('hidden');
}

function cerrarModalRapidoTutor() {
  document.getElementById('tutorModalRapido')?.classList.add('hidden');
  targetSelectParaCrearTutor = null;
}

async function submitTutorRapido(e) {
  e.preventDefault();

  const payload = {
    firstName: document.getElementById('tutorModalFirstName').value.trim(),
    lastName: document.getElementById('tutorModalLastName').value.trim(),
    documentNumber: document.getElementById('tutorModalDni').value.trim(),
    relationship: document.getElementById('tutorModalRelationship').value, // 👈 Captura correcta del vínculo
    phone: document.getElementById('tutorModalPhone').value.trim(),
    email: document.getElementById('tutorModalEmail').value.trim(),
    nacionalidad: document.getElementById('tutorModalNacionalidad').value.trim(),
    profesion: document.getElementById('tutorModalProfesion').value.trim(),
    condicionActividad: document.getElementById('tutorModalActividad').value,
    convive: document.getElementById('tutorModalConvive').value,
    direccion: document.getElementById('tutorModalDireccion').value.trim(),
    tenantId: currentSession.institutionId
  };

  try {
    const res = await apiFetch('/tutors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const nuevoTutor = await res.json();
      await fetchTutors();

      if (targetSelectParaCrearTutor) {
        document.getElementById(targetSelectParaCrearTutor).value = nuevoTutor.id;
        const num = targetSelectParaCrearTutor.replace('studentTutor', '');
        const buscadorEl = document.getElementById(`buscadorTutor${num}`);
        if (buscadorEl) {
          buscadorEl.value = `${nuevoTutor.lastName}, ${nuevoTutor.firstName} (DNI: ${nuevoTutor.documentNumber || '-'})`;
        }
      }

      cerrarModalRapidoTutor();
      alert("✅ Tutor registrado y seleccionado correctamente.");
    } else {
      const errText = await res.text();
      alert(`Error al registrar el tutor: ${errText}`);
    }
  } catch (error) {
    console.error("Error en alta rápida de tutor:", error);
  }
}

function showSection(sectionId, clearHistory = true) {
  if (clearHistory) {
    navigationHistory = [];
  }

  document.querySelectorAll('.dashboard-view').forEach(v => v.classList.add('hidden'));

  ocultarYLimpiarFormulariosAlta();

  const targetView = document.getElementById(sectionId);
  if (targetView) targetView.classList.remove('hidden');

  document.querySelectorAll('aside nav button').forEach(b => b.classList.remove('bg-emerald-50', 'text-emerald-700'));
  const btn = document.getElementById(`nav-${sectionId}`);
  if (btn) btn.classList.add('bg-emerald-50', 'text-emerald-700');

  if (sectionId === 'inicioView') renderInicioFeed();
  if (sectionId === 'schoolProfileView') renderSchoolProfile();
  if (sectionId === 'spreadsheetView') renderSpreadsheetTable();
  if (sectionId === 'materiasView') renderMateriasView();
  if (sectionId === 'cuotasView') renderCuotasView();
  if (sectionId === 'retirosView') renderRetirosView();
  if (sectionId === 'restriccionesView') renderRestriccionesView();
  if (sectionId === 'comunicadosView') renderComunicadosView();
if (sectionId === 'fichaMedicaView') renderFichaMedicaView();
}

function toggleForm(id) { document.getElementById(id).classList.toggle('hidden'); }

function refreshAllData() {
  fetchSchoolProfile();
  fetchTutors();
  fetchStudents();
  fetchStaff();
  fetchSubjects();
  fetchAnnouncements();
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '--';
  return name.trim().split(/\s+/).slice(0, 2).map(n => n && n[0] ? n[0].toUpperCase() : '').join('');
}

function normalizarTexto(txt) {
  if (!txt) return '';
  return txt
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
}

// ========================================================
// MÓDULO 1: GESTIÓN DE MATERIAS / ASIGNATURAS (CATÁLOGO)
// ========================================================

async function fetchSubjects() {
  try {
    const res = await apiFetch('/subjects');
    activeSubjects = res.ok ? await res.json() : [];

    const badge = document.getElementById('countSubjectsBadge');
    if (badge) badge.innerText = activeSubjects.length;

    renderMateriasList();
  } catch (error) {
    console.error("Error al cargar asignaturas:", error);
  }
}

function renderMateriasView() {
  renderMateriasList();
}

function renderMateriasList() {
  const container = document.getElementById('materiasListContainer');
  const countLabel = document.getElementById('labelTotalMaterias');
  if (!container) return;

  if (countLabel) countLabel.innerText = `${activeSubjects.length} Materias`;

  if (activeSubjects.length === 0) {
    container.innerHTML = `
      <div class="col-span-3 p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
        No hay materias registradas. Agrega materias usando el formulario de la izquierda.
      </div>
    `;
    return;
  }

  const esAdmin = ['DIRECTOR', 'ADMINISTRATIVE'].includes(currentSession.role);

  container.innerHTML = activeSubjects.map(sub => `
    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-cyan-400 transition-all">
      <div class="flex items-center gap-2">
        <span class="material-icons-outlined text-cyan-700 text-sm">bookmark</span>
        <span class="text-xs font-bold text-slate-800">${sub.name}</span>
      </div>
      ${esAdmin ? `
        <button onclick="eliminarMateria('${sub.id}')" title="Eliminar materia" class="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors">
          <span class="material-icons-outlined text-sm">delete</span>
        </button>
      ` : ''}
    </div>
  `).join('');
}

async function crearMateriaSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('inputNombreMateria');
  if (!input) return;

  const raw = input.value.trim();
  if (!raw) return;

  const formattedName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

  try {
    const res = await apiFetch('/subjects', {
      method: 'POST',
      body: JSON.stringify({ name: formattedName })
    });

    if (res.ok) {
      input.value = '';
      await fetchSubjects();
    } else {
      const err = await res.text();
      alert(`No se pudo agregar la materia: ${err}`);
    }
  } catch (error) {
    console.error("Error al crear materia:", error);
  }
}

async function eliminarMateria(id) {
  if (!confirm("¿Deseas eliminar esta materia del catálogo institucional?")) return;

  try {
    const res = await apiFetch(`/subjects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchSubjects();
    }
  } catch (error) {
    console.error("Error al eliminar materia:", error);
  }
}

// ========================================================
// MÓDULO 2: ASIGNACIONES DINÁMICAS (MATERIA + AULA)
// ========================================================

function generarFilaAsignacionDocenteHtml(data = {}) {
  const defaultClass = currentLevelClassrooms[0] || '1° Sección (3 años)';
  const subjectSelected = data.subject || (activeSubjects[0]?.name || 'Docente Titular');
  const classroomSelected = data.classroom || defaultClass;
  const shiftSelected = data.shift || 'MANANA';
  const isTeacherSelected = data.isClassroomTeacher === true;

  const subjectOptions = activeSubjects.length > 0
      ? activeSubjects.map(s => `<option value="${s.name}" ${s.name === subjectSelected ? 'selected' : ''}>${s.name}</option>`).join('')
      : `<option value="Docente Titular">Docente Titular</option>`;

  const classroomOptions = currentLevelClassrooms.map(c =>
      `<option value="${c}" ${c === classroomSelected ? 'selected' : ''}>${c}</option>`
  ).join('');

  return `
    <div class="asg-row bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
      <div class="sm:col-span-4">
        <label class="block text-[10px] font-bold text-slate-500 uppercase">Materia / Asignatura</label>
        <select class="asg-input-subject w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800">
          ${subjectOptions}
        </select>
      </div>

      <div class="sm:col-span-3">
        <label class="block text-[10px] font-bold text-slate-500 uppercase">Aula / Sección</label>
        <select class="asg-input-classroom w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700">
          ${classroomOptions}
        </select>
      </div>

      <div class="sm:col-span-2">
        <label class="block text-[10px] font-bold text-slate-500 uppercase">Turno</label>
        <select class="asg-input-shift w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700">
          <option value="MANANA" ${shiftSelected === 'MANANA' ? 'selected' : ''}>Mañana</option>
          <option value="TARDE" ${shiftSelected === 'TARDE' ? 'selected' : ''}>Tarde</option>
          <option value="JORNADA_COMPLETA" ${shiftSelected === 'JORNADA_COMPLETA' ? 'selected' : ''}>J. Completa</option>
        </select>
      </div>

      <div class="sm:col-span-2 flex items-center gap-1.5 pt-2 sm:pt-4">
        <input type="checkbox" class="asg-input-teacher w-4 h-4 text-emerald-600 rounded cursor-pointer" ${isTeacherSelected ? 'checked' : ''}>
        <span class="text-[11px] font-bold text-emerald-950 select-none">Profe de Aula</span>
      </div>

      <div class="sm:col-span-1 text-right pt-2 sm:pt-4">
        <button type="button" onclick="this.closest('.asg-row').remove()" class="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer">
          <span class="material-icons-outlined text-base">delete</span>
        </button>
      </div>
    </div>
  `;
}

function agregarFilaAsignacionDocente(modo, data = {}) {
  const containerId = modo === 'alta' ? 'altaAssignmentsListContainer' : 'editAssignmentsListContainer';
  const container = document.getElementById(containerId);
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = generarFilaAsignacionDocenteHtml(data);
  container.appendChild(wrapper.firstElementChild);
}

function recolectarAsignacionesDocente(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const rows = container.querySelectorAll('.asg-row');
  const list = [];

  rows.forEach(r => {
    const subject = r.querySelector('.asg-input-subject')?.value;
    const classroom = r.querySelector('.asg-input-classroom')?.value;
    const shift = r.querySelector('.asg-input-shift')?.value || 'MANANA';
    const isClassroomTeacher = r.querySelector('.asg-input-teacher')?.checked || false;

    if (subject && classroom) {
      list.push({
        id: crypto.randomUUID(),
        subject,
        classroom,
        shift,
        isClassroomTeacher
      });
    }
  });

  return list;
}

// ========================================================
// GESTIÓN DE PERSONAL / STAFF
// ========================================================

function toggleFormStaffCreate() {
  toggleForm('staffFormContainer');
  const container = document.getElementById('altaAssignmentsListContainer');
  if (container && container.children.length === 0) {
    agregarFilaAsignacionDocente('alta');
  }
}

function handleStaffRoleChangeAlta(role) {
  const block = document.getElementById('staffDocenteConfigBlock');
  if (block) block.classList.toggle('hidden', role !== 'TEACHER');
}

function handleStaffRoleChangeEdicion(role) {
  const block = document.getElementById('editStaffDocenteBlock');
  if (block) block.classList.toggle('hidden', role !== 'TEACHER');
}

function renderStaffTable(list) {
  const countBadge = document.getElementById('countStaffBadge');
  if (countBadge) countBadge.innerText = list ? list.length : 0;

  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">No hay miembros del personal registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    let assignmentsBadges = '';
    if (u.assignments && u.assignments.length > 0) {
      assignmentsBadges = u.assignments.map(a => `
        <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded mr-1 mb-1 ${a.isClassroomTeacher ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-cyan-50 text-cyan-800 border border-cyan-200'}">
          ${a.isClassroomTeacher ? '★ ' : ''}${a.subject} (${a.classroom})
        </span>
      `).join('');
    } else if (u.classroom) {
      assignmentsBadges = `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">★ Docente de ${u.classroom}</span>`;
    }

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="p-3 font-semibold text-slate-900">${u.lastName || ''}, ${u.firstName || ''}</td>
        <td class="p-3 text-slate-600 font-medium">${u.email || '--'}</td>
        <td class="p-3">
          <div class="mb-1"><span class="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">${u.role || 'STAFF'}</span></div>
          <div class="flex flex-wrap">${assignmentsBadges}</div>
        </td>
        <td class="p-3 text-center">
          <button onclick="viewStaffProfile('${u.id}')" class="text-slate-400 hover:text-emerald-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer">
            <span class="material-icons-outlined">contact_page</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function fetchStaff() {
  try {
    const r = await apiFetch('/institution/staff');
    activeStaff = r.ok ? await r.json() : [];
    renderStaffTable(activeStaff);
  } catch(e) {
    console.error("Error staff:", e);
    renderStaffTable([]);
  }
}

function filterStaffTable() {
  const targetRole = document.getElementById('filterStaffRole')?.value;
  if (!targetRole || targetRole === 'TODOS') {
    renderStaffTable(activeStaff);
  } else {
    renderStaffTable(activeStaff.filter(u => u.role === targetRole));
  }
}

async function submitStaff() {
  const role = document.getElementById('staffRole')?.value;
  const hireDateValue = document.getElementById('staffHireDate')?.value;
  const firstName = document.getElementById('staffFirstName')?.value.trim() || '';
  const lastName = document.getElementById('staffLastName')?.value.trim() || '';
  const email = document.getElementById('staffEmail')?.value.trim() || '';
  const phone = document.getElementById('staffPhone')?.value.trim() || '';

  if (!firstName || !lastName || !email) {
    alert("Nombre, apellido y correo institucional son obligatorios.");
    return;
  }
  if (!hireDateValue) {
    alert("La fecha de contratación es obligatoria.");
    return;
  }

  const assignments = role === 'TEACHER' ? recolectarAsignacionesDocente('altaAssignmentsListContainer') : [];
  const primaryClass = assignments.find(a => a.isClassroomTeacher)?.classroom || (assignments[0]?.classroom || null);

  const payload = {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    email,
    password: "123",
    role,
    phone,
    hireDate: hireDateValue,
    classroom: primaryClass,
    status: "ACTIVE",
    tenantId: currentSession.institutionId,
    assignments
  };

  try {
    const response = await apiFetch('/institution/staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || "Error al registrar personal en el servidor");
    }

    document.getElementById('staffFirstName').value = '';
    document.getElementById('staffLastName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffPhone').value = '';
    document.getElementById('staffHireDate').value = '';
    document.getElementById('altaAssignmentsListContainer').innerHTML = '';
    toggleForm('staffFormContainer');

    alert("¡Personal y asignaciones guardadas exitosamente!");
    await fetchStaff();

  } catch (error) {
    console.error("Error en alta staff:", error);
    alert(`No se pudo registrar al personal: ${error.message}`);
  }
}

function viewStaffProfile(id) {
  const staffMember = activeStaff.find(u => u.id === id);
  if (!staffMember) return;
  currentStaffData = staffMember;

  let cursosAsignados = [];
  if (staffMember.assignments && staffMember.assignments.length > 0) {
    cursosAsignados = staffMember.assignments.map(a => ({
      nombre: a.subject,
      seccion: a.classroom,
      turno: a.shift === 'MANANA' ? 'Turno Mañana' : (a.shift === 'TARDE' ? 'Turno Tarde' : 'J. Completa'),
      cantidadAlumnos: activeStudents.filter(s => s.classroom === a.classroom).length,
      rol: a.isClassroomTeacher ? 'Docente de Aula / Titular' : 'Profesor de Asignatura',
      isClassroomTeacher: a.isClassroomTeacher
    }));
  } else if (staffMember.classroom) {
    cursosAsignados = [{
      nombre: "Docente Titular",
      seccion: staffMember.classroom,
      turno: "Turno Mañana",
      cantidadAlumnos: activeStudents.filter(s => s.classroom === staffMember.classroom).length,
      rol: 'Docente Titular',
      isClassroomTeacher: true
    }];
  }

  setDocenteData({
    id: staffMember.id,
    nombre: staffMember.firstName || '',
    apellido: staffMember.lastName || '',
    legajo: staffMember.id ? staffMember.id.substring(0, 8) : '-',
    cargo: staffMember.role || 'STAFF',
    estado: 'ACTIVO',
    dni: staffMember.documentNumber || '-',
    email: staffMember.email || '-',
    telefono: staffMember.phone || '-',
    fechaIngreso: staffMember.hireDate || '-',
    cursos: cursosAsignados
  });

  fetchDocentePortfolios(staffMember.id);
  evaluarPermisosBajaStaff();
}

function setDocenteData(data) {
  if (!data) return;

  document.querySelectorAll('.dashboard-view').forEach(v => v.classList.add('hidden'));
  document.getElementById('staffProfileView').classList.remove('hidden');

  const nombreCompleto = `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Sin Nombre';
  document.getElementById('docente-nombre').textContent = nombreCompleto;
  document.getElementById('docente-avatar').textContent = getInitials(nombreCompleto);
  document.getElementById('docente-legajo').textContent = `Legajo: ${data.legajo || '-'}`;
  document.getElementById('docente-cargo').textContent = `Cargo: ${data.cargo || '-'}`;
  document.getElementById('docente-estado').textContent = `Estado: ${data.estado || 'ACTIVO'}`;
  document.getElementById('docente-dni').textContent = data.dni || '-';
  document.getElementById('docente-email').textContent = data.email || '-';
  document.getElementById('docente-telefono').textContent = data.telefono || '-';
  document.getElementById('docente-ingreso').textContent = data.fechaIngreso || '-';

  const cursosCont = document.getElementById('cursos-container');
  cursosCont.innerHTML = '';

  if (data.cursos && data.cursos.length > 0) {
    data.cursos.forEach(c => {
      const item = document.createElement('div');
      item.className = 'bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5';
      item.innerHTML = `
        <div class="flex justify-between items-start">
          <h4 class="font-bold text-slate-800 text-xs">${c.nombre}</h4>
          ${c.isClassroomTeacher ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">Docente de Aula</span>' : ''}
        </div>
        <p class="text-[11px] text-slate-500">${c.seccion} | ${c.turno}</p>
        <span class="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded inline-block">${c.rol}</span>
      `;
      cursosCont.appendChild(item);
    });
  } else {
    cursosCont.innerHTML = '<p class="text-xs text-slate-400 col-span-3">No posee asignaciones registradas.</p>';
  }
}

function hideStaffProfile() {
  document.getElementById('staffProfileView').classList.add('hidden');
  document.getElementById('staffView').classList.remove('hidden');
}

function abrirModalEdicionStaff() {
  if (!currentStaffData) return;

  document.getElementById('edit-staff-nombre').value = currentStaffData.firstName || '';
  document.getElementById('edit-staff-apellido').value = currentStaffData.lastName || '';
  document.getElementById('edit-staff-email').value = currentStaffData.email || '';
  document.getElementById('edit-staff-role').value = currentStaffData.role || 'TEACHER';
  document.getElementById('edit-staff-dni').value = currentStaffData.documentNumber || '';
  document.getElementById('edit-staff-phone').value = currentStaffData.phone || '';

  const container = document.getElementById('editAssignmentsListContainer');
  container.innerHTML = '';

  const asgs = currentStaffData.assignments || [];
  if (asgs.length > 0) {
    asgs.forEach(a => agregarFilaAsignacionDocente('edit', a));
  } else {
    agregarFilaAsignacionDocente('edit');
  }

  handleStaffRoleChangeEdicion(currentStaffData.role || 'TEACHER');
  document.getElementById('staffEditModal').classList.remove('hidden');
}

function cerrarModalEdicionStaff() {
  document.getElementById('staffEditModal').classList.add('hidden');
}

async function guardarDatosStaff(e) {
  e.preventDefault();
  if (!currentStaffData || !currentStaffData.id) return;

  const role = document.getElementById('edit-staff-role').value;
  const assignments = role === 'TEACHER' ? recolectarAsignacionesDocente('editAssignmentsListContainer') : [];
  const primaryClass = assignments.find(a => a.isClassroomTeacher)?.classroom || (assignments[0]?.classroom || null);

  const updatedPayload = {
    ...currentStaffData,
    firstName: document.getElementById('edit-staff-nombre').value.trim(),
    lastName: document.getElementById('edit-staff-apellido').value.trim(),
    email: document.getElementById('edit-staff-email').value.trim(),
    role,
    documentNumber: document.getElementById('edit-staff-dni').value.trim(),
    phone: document.getElementById('edit-staff-phone').value.trim(),
    classroom: primaryClass,
    assignments
  };

  try {
    const response = await apiFetch(`/institution/staff/${currentStaffData.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedPayload)
    });

    if (!response.ok) throw new Error("Error al actualizar datos en el servidor");

    const usuarioActualizado = await response.json();
    alert("¡Legajo y asignaciones actualizadas!");

    currentStaffData = usuarioActualizado;
    cerrarModalEdicionStaff();
    await fetchStaff();
    viewStaffProfile(usuarioActualizado.id);

  } catch (error) {
    console.error("Error al actualizar:", error);
    alert("No se pudo actualizar el legajo.");
  }
}

function evaluarPermisosBajaStaff() {
  const btnBaja = document.getElementById('btn-baja-staff');
  if (btnBaja) {
    btnBaja.classList.toggle('hidden', !['DIRECTOR', 'ADMINISTRATIVE'].includes(currentSession.role));
  }
}

function calcularTiempoTrabajado(fechaIngresoStr) {
  if (!fechaIngresoStr) return "Tiempo no especificado";
  const fechaIngreso = new Date(fechaIngresoStr);
  const fechaActual = new Date();
  if (isNaN(fechaIngreso.getTime())) return "Fecha no disponible";

  let anios = fechaActual.getFullYear() - fechaIngreso.getFullYear();
  let meses = fechaActual.getMonth() - fechaIngreso.getMonth();
  if (meses < 0) { anios--; meses += 12; }
  const totalMeses = (anios * 12) + meses;
  return `${anios} años y ${meses} meses (${totalMeses} meses acumulados)`;
}

async function confirmarBajaStaff() {
  if (!currentStaffData || !currentStaffData.id) return;

  const nombreCompleto = `${currentStaffData.firstName || ''} ${currentStaffData.lastName || ''}`.trim();
  const fechaIngreso = currentStaffData.hireDate;
  const tiempoTrabajado = calcularTiempoTrabajado(fechaIngreso);

  const confirmacion = confirm(
      `¿Dar de baja al personal "${nombreCompleto}"?\n\n` +
      `Antigüedad: ${tiempoTrabajado}\nFecha ingreso: ${fechaIngreso || 'N/D'}`
  );
  if (!confirmacion) return;

  try {
    const response = await apiFetch(`/institution/staff/${currentStaffData.id}/baja`, {
      method: 'POST'
    });

    if (response.ok) {
      alert("Personal dado de baja correctamente y archivado en histórico.");
      hideStaffProfile();
      await fetchStaff();
    } else {
      alert("Error al dar de baja en el servidor.");
    }
  } catch (error) {
    console.error("Error baja staff:", error);
  }
}

// ========================================================
// MÓDULO 3: PORTFOLIO PROFESIONAL
// ========================================================

async function fetchDocentePortfolios(staffId) {
  try {
    const res = await apiFetch(`/portfolios?staffId=${staffId}`);
    portfoliosList = res.ok ? await res.json() : [];
    renderDocentePortfolios();
  } catch (e) {
    console.error("Error portfolios:", e);
  }
}

function renderDocentePortfolios() {
  const container = document.getElementById('docente-portfolios-container');
  if (!container) return;

  if (portfoliosList.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 p-5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
        Este docente aún no ha registrado capacitaciones en su portfolio profesional.
      </div>
    `;
    return;
  }

  container.innerHTML = portfoliosList.map(p => `
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-2 hover:border-amber-400 transition-all">
      <div>
        <div class="flex justify-between items-start mb-1">
          <span class="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">${p.category}</span>
          <span class="text-[10px] font-semibold text-slate-400">${p.activityDate || '-'}</span>
        </div>
        <h4 class="text-xs font-bold text-slate-900">${p.title}</h4>
        <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${p.description}</p>
      </div>

      <div class="pt-2 border-t border-slate-200/70 flex justify-between items-center">
        ${p.mediaUrl ? `
          <a href="${p.mediaUrl}" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline">
            <span class="material-icons-outlined text-xs">folder_open</span> Ver Certificado Digital
          </a>
        ` : '<span></span>'}
        <button onclick="eliminarPortfolioDocente('${p.id}')" title="Eliminar registro" class="text-slate-400 hover:text-rose-600 cursor-pointer">
          <span class="material-icons-outlined text-sm">delete</span>
        </button>
      </div>
    </div>
  `).join('');
}

function abrirModalNuevoPortfolio() {
  const form = document.getElementById('formPortfolio');
  if (form) form.reset();

  document.getElementById('portfolioEditId').value = '';
  document.getElementById('portfolioActivityDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('portfolioModal').classList.remove('hidden');
}

function cerrarModalPortfolio() {
  document.getElementById('portfolioModal').classList.add('hidden');
}

async function guardarPortfolio(e) {
  e.preventDefault();
  if (!currentStaffData) return;

  const payload = {
    staffId: currentStaffData.id,
    title: document.getElementById('portfolioTitle').value.trim(),
    category: document.getElementById('portfolioCategory').value,
    activityDate: document.getElementById('portfolioActivityDate').value,
    description: document.getElementById('portfolioDescription').value.trim(),
    mediaUrl: document.getElementById('portfolioMediaUrl').value.trim() || null
  };

  try {
    const res = await apiFetch('/portfolios', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      cerrarModalPortfolio();
      await fetchDocentePortfolios(currentStaffData.id);
    }
  } catch (error) {
    console.error("Error al guardar portfolio:", error);
  }
}

async function eliminarPortfolioDocente(id) {
  if (!confirm("¿Deseas eliminar este registro del portfolio?")) return;

  try {
    const res = await apiFetch(`/portfolios/${id}`, { method: 'DELETE' });
    if (res.ok && currentStaffData) {
      fetchDocentePortfolios(currentStaffData.id);
    }
  } catch (error) {
    console.error("Error al eliminar portfolio:", error);
  }
}

// ========================================================
// GESTIÓN DE TUTORES
// ========================================================

async function fetchTutors() {
  try {
    const r = await apiFetch('/tutors');
    activeTutors = r.ok ? await r.json() : [];

    const countBadge = document.getElementById('countTutorsBadge');
    if (countBadge) countBadge.innerText = activeTutors.length;

    const tbody = document.getElementById('tutorsTableBody');
    if (!tbody) return;

    if (activeTutors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">No hay tutores registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = activeTutors.map(t => `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="p-3 font-semibold text-slate-900">${t.lastName || ''}, ${t.firstName || ''}</td>
        <td class="p-3 text-slate-600 font-medium">${t.documentNumber || '--'}</td>
        <td class="p-3"><span class="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-md">${t.relationship || 'Tutor'}</span></td>
        <td class="p-3 text-center">
          <button onclick="viewTutorProfile('${t.id}')" class="text-slate-400 hover:text-emerald-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer">
            <span class="material-icons-outlined">contact_page</span>
          </button>
        </td>
      </tr>
    `).join('');

    populateTutorSelects();
  } catch(e) {
    console.error("Error tutores:", e);
  }
}

function populateTutorSelects() {
  const options = '<option value="">-- Seleccionar Tutor --</option>' + activeTutors.map(t => `<option value="${t.id}">${t.lastName}, ${t.firstName} (${t.relationship || 'Tutor'})</option>`).join('');
  const t1 = document.getElementById('studentTutor1');
  const t2 = document.getElementById('studentTutor2');
  if(t1) t1.innerHTML = options;
  if(t2) t2.innerHTML = options;
}

async function submitTutor() {
  const payload = {
    firstName: document.getElementById('tutorFirstName').value.trim(),
    lastName: document.getElementById('tutorLastName').value.trim(),
    documentNumber: document.getElementById('tutorDni').value.trim(),
    relationship: document.getElementById('tutorRelationship').value,
    phone: document.getElementById('tutorPhone').value.trim(),
    email: document.getElementById('tutorEmail').value.trim()
  };
  await apiFetch('/tutors', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  toggleForm('tutorFormContainer');
  fetchTutors();
}

async function viewTutorProfile(id, isBackNavigation = false) {
  const t = activeTutors.find(item => item.id === id);
  if(!t) { alert("Tutor no encontrado."); return; }

  if (!isBackNavigation) {
    if (currentStudentData && !document.getElementById('studentProfileView').classList.contains('hidden')) {
      pushNavigation('studentProfileView', currentStudentData.id);
    } else {
      pushNavigation('tutorsView', null);
    }
  }

  let hijosVinculados = activeStudents.filter(s => {
    if (Array.isArray(s.tutorIds) && s.tutorIds.includes(t.id)) return true;
    if (Array.isArray(s.tutors) && s.tutors.some(tut => (tut.id === t.id || tut.tutorId === t.id))) return true;
    return s.tutorId === t.id;
  }).map(s => ({
    id: s.id,
    nombre: s.firstName,
    apellido: s.lastName,
    curso: s.classroom,
    parentesco: t.relationship || 'Hijo/a'
  }));

  setTutorData({
    id: t.id,
    nombre: t.firstName,
    apellido: t.lastName,
    vinculo: t.relationship || 'Tutor Legal',
    dni: t.documentNumber,
    nacionalidad: t.nacionalidad || 'Argentina',
    profesion: t.profesion || '-',
    condicionActividad: t.condicionActividad || 'Trabaja',
    celular: t.phone || '-',
    telefonoFijo: t.phoneFijo || '-',
    email: t.email || '-',
    conviveEstudiante: t.convive || 'Sí',
    domicilio: t.direccion || '-',
    hijos: hijosVinculados
  });
}

function setTutorData(data) {
  if (!data) return;
  currentTutorData = data;

  document.querySelectorAll('.dashboard-view').forEach(v => v.classList.add('hidden'));
  document.getElementById('tutorProfileView').classList.remove('hidden');

  const nombreCompleto = `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Sin Nombre';
  document.getElementById('tutor-nombre').textContent = nombreCompleto;
  document.getElementById('tutor-avatar').textContent = getInitials(nombreCompleto);
  document.getElementById('tutor-vinculo').textContent = `Vínculo: ${data.vinculo || '-'}`;
  document.getElementById('tutor-dni').textContent = `DNI: ${data.dni || '-'}`;
  document.getElementById('tutor-celular').textContent = data.celular || '-';
  document.getElementById('tutor-email').textContent = data.email || '-';
  document.getElementById('tutor-nacionalidad').textContent = data.nacionalidad || '-';
  document.getElementById('tutor-profesion').textContent = data.profesion || '-';
  document.getElementById('tutor-actividad').textContent = data.condicionActividad || '-';
  document.getElementById('tutor-convive').textContent = data.conviveEstudiante || '-';
  document.getElementById('tutor-domicilio').textContent = data.domicilio || '-';


  const hijosCont = document.getElementById('hijos-container');
  hijosCont.innerHTML = '';

  if (data.hijos && data.hijos.length > 0) {
    data.hijos.forEach(h => {
      const item = document.createElement('div');
      item.className = 'bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center cursor-pointer hover:border-emerald-500 transition-all';
      item.onclick = () => showStudentProfile(h.id);
      item.innerHTML = `
        <div>
          <h4 class="font-bold text-slate-800 text-sm">${h.nombre} ${h.apellido}</h4>
          <p class="text-xs text-slate-500">Sección: ${h.curso || '-'}</p>
        </div>
        <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">${h.parentesco || 'Hijo/a'}</span>
      `;
      hijosCont.appendChild(item);
    });
  } else {
    hijosCont.innerHTML = '<p class="text-xs text-slate-400 col-span-2">No hay alumnos vinculados registrados.</p>';
  }
}

function hideTutorProfile() {
  document.getElementById('tutorProfileView').classList.add('hidden');
  const previous = navigationHistory.pop();
  if (previous) {
    if (previous.viewType === 'studentProfileView' && previous.entityId) {
      showStudentProfile(previous.entityId, true);
    } else {
      showSection(previous.viewType, false);
    }
  } else {
    showSection('tutorsView', true);
  }
}

function abrirModalEdicionTutor() {
  if (!currentTutorData) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('edit-nombre', currentTutorData.nombre);
  setVal('edit-apellido', currentTutorData.apellido);
  setVal('edit-vinculo', currentTutorData.vinculo || 'PADRE');
  setVal('edit-dni', currentTutorData.dni);
  setVal('edit-nacionalidad', currentTutorData.nacionalidad || 'Argentina');
  setVal('edit-profesion', currentTutorData.profesion);
  setVal('edit-actividad', currentTutorData.condicionActividad || 'Trabaja');
  setVal('edit-celular', currentTutorData.celular);
  setVal('edit-email', currentTutorData.email);
  setVal('edit-calle', currentTutorData.domicilio);
  setVal('edit-convive', currentTutorData.conviveEstudiante || 'Sí');

  document.getElementById('tutorEditModal')?.classList.remove('hidden');
}


async function guardarDatosTutor(e) {
  e.preventDefault();
  if (!currentTutorData?.id) return;

  const updatedData = {
    ...currentTutorData,
    firstName: document.getElementById('edit-nombre').value.trim(),
    lastName: document.getElementById('edit-apellido').value.trim(),
    relationship: document.getElementById('edit-vinculo').value,
    documentNumber: document.getElementById('edit-dni').value.trim(),
    nacionalidad: document.getElementById('edit-nacionalidad').value.trim(),
    profesion: document.getElementById('edit-profesion').value.trim(), // 👈 Envía la profesión editada
    condicionActividad: document.getElementById('edit-actividad').value,
    phone: document.getElementById('edit-celular').value.trim(),
    email: document.getElementById('edit-email').value.trim(),
    direccion: document.getElementById('edit-calle').value.trim(),
    convive: document.getElementById('edit-convive').value,
    tenantId: currentSession.institutionId
  };

  try {
    const res = await apiFetch(`/tutors/${currentTutorData.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedData)
    });

    if (res.ok) {
      cerrarModalEdicionTutor();
      await fetchTutors();
      viewTutorProfile(currentTutorData.id, true);
      alert("✅ Datos del tutor actualizados correctamente.");
    } else {
      alert("Error al actualizar los datos en el servidor.");
    }
  } catch (error) {
    console.error("Error al actualizar tutor:", error);
  }
}

function cerrarModalEdicionTutor() {
  const modal = document.getElementById('tutorEditModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}


async function confirmarBajaTutor() {
  if (!currentTutorData?.id) return;
  if (!confirm(`¿Dar de baja al tutor "${currentTutorData.nombre} ${currentTutorData.apellido}"?`)) return;

  try {
    const res = await apiFetch(`/tutors/${currentTutorData.id}/baja`, { method: 'POST' });
    if (res.ok) {
      alert("Tutor procesado con éxito.");
      hideTutorProfile();
      await refreshAllData();
    }
  } catch (error) {
    console.error("Error baja tutor:", error);
  }
}

// ========================================================
// GESTIÓN DE ALUMNOS Y MATRÍCULAS
// ========================================================

async function fetchStudents() {
  try {
    const r = await apiFetch('/students');
    activeStudents = r.ok ? await r.json() : [];
    renderStudentsTable(activeStudents);
  } catch(e) {
    console.error("Error estudiantes:", e);
    renderStudentsTable([]);
  }
}

function renderStudentsTable(list) {
  document.getElementById('countStudentsBadge').innerText = list.length;
  const tbody = document.getElementById('studentsTableBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">No hay alumnos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => `
    <tr class="hover:bg-slate-50/80 transition-colors">
      <td class="p-3 font-semibold text-slate-900">${s.lastName || ''}, ${s.firstName || ''}</td>
      <td class="p-3 text-slate-600 font-medium">${s.documentNumber || '--'}</td>
      <td class="p-3"><span class="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">${s.classroom || 'Sin asignar'}</span></td>
      <td class="p-3 text-center">
        <button onclick="showStudentProfile('${s.id}')" class="text-slate-400 hover:text-emerald-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer">
          <span class="material-icons-outlined">contact_page</span>
        </button>
      </td>
    </tr>
  `).join('');
}

function filterStudentsTable() {
  const target = document.getElementById('filterStudentClassroom').value;
  if(target === 'TODAS') { renderStudentsTable(activeStudents); }
  else { renderStudentsTable(activeStudents.filter(s => s.classroom === target)); }
}

async function showStudentProfile(studentId, isBackNavigation = false) {
  try {
    const response = await apiFetch(`/students/${studentId}`);
    if (!response.ok) throw new Error("Error al consultar el perfil");
    const data = await response.json();

    if (!isBackNavigation) {
      if (currentTutorData && !document.getElementById('tutorProfileView').classList.contains('hidden')) {
        pushNavigation('tutorProfileView', currentTutorData.id);
      } else {
        pushNavigation('alumnosView', null);
      }
    }

    currentStudentData = data;

    document.querySelectorAll('.dashboard-view').forEach(view => view.classList.add('hidden'));
    document.getElementById('studentProfileView').classList.remove('hidden');

    const nombre = data.firstName || '';
    const apellido = data.lastName || '';
    document.getElementById('alumno-nombre').textContent = `${nombre} ${apellido}`.trim() || '-';
    document.getElementById('alumno-avatar').textContent = getInitials(`${nombre} ${apellido}`);

    const legajoVisual = data.legajoNumber || data.legajo || (data.id ? data.id.substring(0, 8) : '-');
    document.getElementById('alumno-legajo').textContent = `Legajo: ${legajoVisual}`;
    document.getElementById('alumno-curso').textContent = `Sección: ${data.classroom || '-'}`;
    document.getElementById('alumno-estado').textContent = `Estado: ${data.status || 'ACTIVO'}`;

    // 🟢 Bloque 1: Identidad y Documentación
    document.getElementById('alumno-dni').textContent = data.documentNumber || '-';
    document.getElementById('alumno-cuil').textContent = data.cuil || '-';
    document.getElementById('alumno-dniStatus').textContent = data.dniStatus === 'FISICO' ? 'DNI Físico' : (data.dniStatus === 'EN_TRAMITE' ? 'En Trámite' : 'No posee');
    document.getElementById('alumno-genderIdentity').textContent = data.genderIdentity || '-';
    document.getElementById('alumno-nacimiento').textContent = data.birthDate || '-';

    // 🟢 Bloque 2: Origen y Nacimiento
    document.getElementById('alumno-birthCountry').textContent = data.birthCountry || '-';
    document.getElementById('alumno-nationality').textContent = data.nationality || 'Argentina';
    document.getElementById('alumno-birthProvince').textContent = data.birthProvince || '-';
    document.getElementById('alumno-birthLocality').textContent = data.birthLocality || '-';

    // 🟢 Bloque 3: Domicilio Actual
    const calleNro = `${data.street || ''} ${data.streetNumber || ''}`.trim();
    document.getElementById('alumno-domicilio').textContent = calleNro || data.address || '-';
    const pisoDeptoStr = `Piso: ${data.floor || '-'} | Torre: ${data.tower || '-'} | Depto: ${data.apartment || '-'}`;
    document.getElementById('alumno-pisoDepto').textContent = pisoDeptoStr;
    document.getElementById('alumno-addressLocality').textContent = data.addressLocality || '-';
    document.getElementById('alumno-betweenStreets').textContent = data.betweenStreets || 'Sin especificar';

    // 🟢 Bloque 4: Datos Sociodemográficos
    const hermanosStr = data.hasSiblings ? `Sí (${data.siblingCount || 0} total, ${data.siblingsInThisSchool || 0} en escuela)` : 'No';
    document.getElementById('alumno-hermanos').textContent = hermanosStr;
    document.getElementById('alumno-auh').textContent = data.receivesAuh ? 'Sí' : 'No';
    document.getElementById('alumno-native').textContent = data.belongsToNativePeople ? 'Sí' : 'No';
    document.getElementById('alumno-transport').textContent = data.transportationMethods || 'A pie';

    const btnBaja = document.getElementById('btn-baja-alumno');
    if (btnBaja) {
      btnBaja.classList.toggle('hidden', !['DIRECTOR', 'ADMINISTRATIVE'].includes(currentSession.role));
    }

    const tutoresCont = document.getElementById('tutores-container');
    tutoresCont.innerHTML = '';
    let listaTutores = data.tutors || data.tutores || [];
    if (listaTutores.length === 0 && activeTutors.length > 0 && data.tutorIds) {
      listaTutores = activeTutors.filter(t => data.tutorIds.includes(t.id));
    }

    if (listaTutores.length > 0) {
      listaTutores.forEach((t, index) => {
        const isPrimary = index === 0;
        const card = document.createElement('div');
        card.className = "p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-emerald-500 transition-all cursor-pointer flex justify-between items-center group mb-2";
        card.onclick = () => viewTutorProfile(t.id || t.tutorId);
        card.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              ${getInitials(`${t.firstName || ''} ${t.lastName || ''}`)}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-900 group-hover:text-emerald-700">${t.lastName || ''}, ${t.firstName || 'Tutor'}</h4>
                <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">${isPrimary ? 'Contacto Emergencia N°1' : 'Contacto Emergencia N°2'}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1">Vínculo: ${t.relationship || 'Tutor Legal'} | DNI: ${t.documentNumber || '--'} | Tel: ${t.phone || 'Sin Registrar'}</p>
            </div>
          </div>
          <span class="material-icons-outlined text-slate-400 group-hover:text-emerald-600">chevron_right</span>
        `;
        tutoresCont.appendChild(card);
      });
    } else {
      tutoresCont.innerHTML = `<p class="text-xs text-slate-400 italic p-3">No hay tutores vinculados.</p>`;
    }

    await fetchAndRenderPickupsGeneral(studentId, 'autorizados-container');
    await fetchAndRenderRestrictionsGeneral(studentId, 'restricciones-container');
    await renderComunicadosPrivadosAlumno(studentId);
    await cargarDetalleFichaMedicaPanel(studentId, 'perfilFichaMedicaContainer');

  } catch (error) {
    console.error("Error perfil alumno:", error);
  }
}

function hideStudentProfile() {
  document.getElementById('studentProfileView').classList.add('hidden');
  const previous = navigationHistory.pop();
  if (previous) {
    if (previous.viewType === 'tutorProfileView' && previous.entityId) {
      viewTutorProfile(previous.entityId, true);
    } else {
      showSection(previous.viewType, false);
    }
  } else {
    showSection('alumnosView', true);
  }
}



function recalcularSalaFormularioEdicion() {
  const birthDate = document.getElementById('edit-student-nacimiento')?.value;
  const cicloLectivo = currentSchoolProfile?.academicYear || new Date().getFullYear();
  const labelSala = document.getElementById('edit-labelSalaCalculada');

  if (!birthDate) {
    if (labelSala) labelSala.textContent = "Seleccione fecha de nacimiento";
    return;
  }

  const res = calcularSala(birthDate, cicloLectivo);

  if (labelSala) {
    if (res.valida) {
      labelSala.textContent = `Sugerencia legal al corte: ${res.sala || (res.edadCalculada + ' años')}`;
      labelSala.className = "text-xs font-bold text-emerald-800";
    } else {
      labelSala.textContent = res.error;
      labelSala.className = "text-xs font-bold text-rose-600";
    }
  }
}

function openEditStudentModal() {
  if (!currentStudentData) return;

  // Cargar datos básicos y nuevos
  document.getElementById('edit-student-nombre').value = currentStudentData.firstName || '';
  document.getElementById('edit-student-apellido').value = currentStudentData.lastName || '';
  document.getElementById('edit-student-legajo').value = currentStudentData.legajoNumber || currentStudentData.legajo || '';
  document.getElementById('edit-student-dni').value = currentStudentData.documentNumber || '';
  document.getElementById('edit-student-nacimiento').value = currentStudentData.birthDate || '';
  
  document.getElementById('edit-student-cuil').value = currentStudentData.cuil || '';
  document.getElementById('edit-student-dniStatus').value = currentStudentData.dniStatus || 'FISICO';
  document.getElementById('edit-student-genderIdentity').value = currentStudentData.genderIdentity || 'NO_RESPONDE';
  
  document.getElementById('edit-student-birthCountry').value = currentStudentData.birthCountry || 'ARGENTINA';
  document.getElementById('edit-student-nationality').value = currentStudentData.nationality || 'Argentina';
  document.getElementById('edit-student-birthProvince').value = currentStudentData.birthProvince || '';
  document.getElementById('edit-student-birthLocality').value = currentStudentData.birthLocality || '';

  document.getElementById('edit-student-street').value = currentStudentData.street || '';
  document.getElementById('edit-student-streetNumber').value = currentStudentData.streetNumber || '';
  document.getElementById('edit-student-floor').value = currentStudentData.floor || '';
  document.getElementById('edit-student-tower').value = currentStudentData.tower || '';
  document.getElementById('edit-student-apartment').value = currentStudentData.apartment || '';
  document.getElementById('edit-student-betweenStreets').value = currentStudentData.betweenStreets || '';
  document.getElementById('edit-student-addressLocality').value = currentStudentData.addressLocality || '';

  document.getElementById('edit-student-hasSiblings').value = currentStudentData.hasSiblings ? 'true' : 'false';
  document.getElementById('edit-student-siblingCount').value = currentStudentData.siblingCount || 0;
  document.getElementById('edit-student-siblingsInSchool').value = currentStudentData.siblingsInThisSchool || 0;
  document.getElementById('edit-student-receivesAuh').value = currentStudentData.receivesAuh ? 'true' : 'false';
  document.getElementById('edit-student-nativePeople').value = currentStudentData.belongsToNativePeople ? 'true' : 'false';
  document.getElementById('edit-student-transport').value = currentStudentData.transportationMethods || 'A_PIE';

  // Llenar el selector de aula
  const selectClassroom = document.getElementById('edit-student-classroom');
  if (selectClassroom && Array.isArray(currentLevelClassrooms)) {
    selectClassroom.innerHTML = '<option value="">-- Seleccionar sección manualmente --</option>' + 
      currentLevelClassrooms.map(c => `<option value="${c}">${c}</option>`).join('');
    selectClassroom.value = currentStudentData.classroom || '';
  }

  recalcularSalaFormularioEdicion();
  document.getElementById('studentEditModal').classList.remove('hidden');
}

async function guardarDatosAlumno(e) {
  e.preventDefault();
  if (!currentStudentData?.id) return;

  const birthDateVal = document.getElementById('edit-student-nacimiento')?.value;
  const academicYearVal = currentSchoolProfile?.academicYear || new Date().getFullYear();

  const selectEditClassroom = document.getElementById('edit-student-classroom');
  let aulaFinal = selectEditClassroom ? selectEditClassroom.value : null;

  if (!aulaFinal || aulaFinal === "") {
    aulaFinal = currentStudentData.classroom; 
  }

  const updatedPayload = {
    ...currentStudentData,
    firstName: document.getElementById('edit-student-nombre')?.value.trim() || currentStudentData.firstName,
    lastName: document.getElementById('edit-student-apellido')?.value.trim() || currentStudentData.lastName,
    legajoNumber: document.getElementById('edit-student-legajo')?.value.trim() || currentStudentData.legajoNumber,
    documentNumber: document.getElementById('edit-student-dni')?.value.trim() || currentStudentData.documentNumber,
    birthDate: birthDateVal || currentStudentData.birthDate,
    academicYear: academicYearVal,
    classroom: aulaFinal,
    seccion: aulaFinal,

    cuil: document.getElementById('edit-student-cuil')?.value.trim() || '',
    dniStatus: document.getElementById('edit-student-dniStatus')?.value || 'FISICO',
    genderIdentity: document.getElementById('edit-student-genderIdentity')?.value || 'NO_RESPONDE',
    birthCountry: document.getElementById('edit-student-birthCountry')?.value || 'ARGENTINA',
    nationality: document.getElementById('edit-student-nationality')?.value.trim() || 'Argentina',
    birthProvince: document.getElementById('edit-student-birthProvince')?.value.trim() || '',
    birthLocality: document.getElementById('edit-student-birthLocality')?.value.trim() || '',
    
    street: document.getElementById('edit-student-street')?.value.trim() || '',
    streetNumber: document.getElementById('edit-student-streetNumber')?.value.trim() || '',
    floor: document.getElementById('edit-student-floor')?.value.trim() || '',
    tower: document.getElementById('edit-student-tower')?.value.trim() || '',
    apartment: document.getElementById('edit-student-apartment')?.value.trim() || '',
    betweenStreets: document.getElementById('edit-student-betweenStreets')?.value.trim() || '',
    addressLocality: document.getElementById('edit-student-addressLocality')?.value.trim() || '',
    
    hasSiblings: document.getElementById('edit-student-hasSiblings')?.value === 'true',
    siblingCount: parseInt(document.getElementById('edit-student-siblingCount')?.value) || 0,
    siblingsInThisSchool: parseInt(document.getElementById('edit-student-siblingsInSchool')?.value) || 0,
    receivesAuh: document.getElementById('edit-student-receivesAuh')?.value === 'true',
    belongsToNativePeople: document.getElementById('edit-student-nativePeople')?.value === 'true',
    transportationMethods: document.getElementById('edit-student-transport')?.value || 'A_PIE'
  };

  try {
    const response = await apiFetch(`/students/${currentStudentData.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedPayload)
    });
    
    if (!response.ok) throw new Error("Error al actualizar alumno en el servidor");

    const alumnoActualizado = await response.json();
    currentStudentData = alumnoActualizado;

    const idx = activeStudents.findIndex(s => s.id === alumnoActualizado.id);
    if (idx !== -1) activeStudents[idx] = alumnoActualizado;

    closeEditStudentModal();
    renderStudentsTable(activeStudents);
    await showStudentProfile(alumnoActualizado.id, true);
    alert(`¡Ficha y datos oficiales actualizados correctamente!`);
  } catch (error) {
    alert(error.message);
  }
}

function closeEditStudentModal() {
  document.getElementById('studentEditModal').classList.add('hidden');
}

async function confirmarBajaAlumno() {
  if (!currentStudentData?.id) return;
  if (!confirm(`¿Dar de baja al alumno "${currentStudentData.firstName} ${currentStudentData.lastName}"?`)) return;

  try {
    const response = await apiFetch(`/students/${currentStudentData.id}/baja`, { method: 'POST' });
    if (response.ok) {
      alert("El alumno ha sido dado de baja.");
      hideStudentProfile();
      refreshAllData();
    }
  } catch (error) {
    console.error("Error baja alumno:", error);
  }
}

async function submitStudent() {
  // 🟢 VALIDACIÓN OBLIGATORIA DE CAMPOS PRINCIPALES
  const firstName = document.getElementById('studentFirstName')?.value.trim();
  const lastName = document.getElementById('studentLastName')?.value.trim();
  const dni = document.getElementById('studentDni')?.value.trim();
  const birthDateValue = document.getElementById('studentBirthDate')?.value;
  const tutor1Id = document.getElementById('studentTutor1')?.value;

  if (!firstName || !lastName || !dni || !birthDateValue) {
    alert("❌ Error: Por favor complete los campos obligatorios principales (Nombre, Apellido, DNI y Fecha de Nacimiento).");
    return; // Frena el proceso y no deja enviar
  }

  if (!tutor1Id) {
    alert("❌ Error: Es obligatorio asignar un Tutor Principal al alumno.");
    return;
  }

  const academicYearVal = currentSchoolProfile?.academicYear || new Date().getFullYear();
  const nivel = currentSchoolProfile?.educationLevel || 'JARDIN';

  let aulaFinal = document.getElementById('student-classroom')?.value;

  if (nivel === 'JARDIN') {
    const checkSala = calcularSala(birthDateValue, academicYearVal);
    if (!checkSala.valida) { alert(checkSala.error); return; }
    aulaFinal = checkSala.sala;
  } else {
    if (!aulaFinal) { alert("Debe seleccionar un año/grado."); return; }
  }

  const tutor2Id = document.getElementById('studentTutor2')?.value;
  const tutors = [];
  if (tutor1Id) tutors.push({ tutorId: tutor1Id, isPrimary: true });
  if (tutor2Id && tutor2Id !== tutor1Id) tutors.push({ tutorId: tutor2Id, isPrimary: false });

  if (tutors.length === 0) { alert("Debes seleccionar al menos un tutor responsable."); return; }

  // Objeto completo con los datos básicos y los nuevos campos oficiales de la planilla
  const studentData = {
    firstName: document.getElementById('studentFirstName')?.value.trim() || '',
    lastName: document.getElementById('studentLastName')?.value.trim() || '',
    legajoNumber: document.getElementById('studentLegajo')?.value.trim() || '',
    documentNumber: document.getElementById('studentDni')?.value.trim() || '',
    birthDate: birthDateValue,
    academicYear: academicYearVal,
    classroom: aulaFinal,
    status: "ACTIVE",

    // Nuevos campos oficiales añadidos:
    cuil: document.getElementById('studentCuil')?.value.trim() || '',
    dniStatus: document.getElementById('studentDniStatus')?.value || 'FISICO',
    genderIdentity: document.getElementById('studentGenderIdentity')?.value || 'NO_RESPONDE',
    birthCountry: document.getElementById('studentBirthCountry')?.value || 'ARGENTINA',
    nationality: document.getElementById('studentNationality')?.value.trim() || 'Argentina',
    birthProvince: document.getElementById('studentBirthProvince')?.value.trim() || '',
    birthLocality: document.getElementById('studentBirthLocality')?.value.trim() || '',
    
    street: document.getElementById('studentStreet')?.value.trim() || '',
    streetNumber: document.getElementById('studentStreetNumber')?.value.trim() || '',
    floor: document.getElementById('studentFloor')?.value.trim() || '',
    tower: document.getElementById('studentTower')?.value.trim() || '',
    apartment: document.getElementById('studentApartment')?.value.trim() || '',
    betweenStreets: document.getElementById('studentBetweenStreets')?.value.trim() || '',
    addressLocality: document.getElementById('studentAddressLocality')?.value.trim() || '',
    
    hasSiblings: document.getElementById('studentHasSiblings')?.value === 'true',
    siblingCount: parseInt(document.getElementById('studentSiblingCount')?.value) || 0,
    siblingsInThisSchool: parseInt(document.getElementById('studentSiblingsInSchool')?.value) || 0,
    receivesAuh: document.getElementById('studentReceivesAuh')?.value === 'true',
    belongsToNativePeople: document.getElementById('studentNativePeople')?.value === 'true',
    transportationMethods: document.getElementById('studentTransport')?.value || 'A_PIE'
  };

  try {
    const response = await apiFetch('/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    if (!response.ok) throw new Error("Error al guardar alumno");

    const alumnoCreado = await response.json();
    if (alumnoCreado.id) {
      await apiFetch(`/students/${alumnoCreado.id}/tutors`, {
        method: 'POST',
        body: JSON.stringify(tutors)
      });
    }

    alert(`¡Matrícula aprobada! Asignado a: ${aulaFinal}`);
    toggleForm('studentFormContainer');
    refreshAllData();
  } catch (error) {
    alert(error.message);
  }
}
// ========================================================
// GESTIÓN DE CUOTAS
// ========================================================

const ARANCELES_CICLO_LECTIVO = [
  { id: 0, nombre: 'Matrícula' },
  { id: 3, nombre: 'Marzo' },
  { id: 4, nombre: 'Abril' },
  { id: 5, nombre: 'Mayo' },
  { id: 6, nombre: 'Junio' },
  { id: 7, nombre: 'Julio' },
  { id: 8, nombre: 'Agosto' },
  { id: 9, nombre: 'Septiembre' },
  { id: 10, nombre: 'Octubre' },
  { id: 11, nombre: 'Noviembre' },
  { id: 12, nombre: 'Diciembre' }
];

async function renderCuotasView() {
  await fetchInstitutionalEmails();
  volverAListaCuotas();
  filterCuotasTable();
}

async function fetchInstitutionalEmails() {
  try {
    const res = await apiFetch('/institutions/settings/emails');
    if (res.ok) institutionalEmails = await res.json();
  } catch (e) { console.error("Error emails:", e); }
}

function filterCuotasTable() {
  const tbody = document.getElementById('cuotasTableBody');
  if (!tbody) return;

  const filterClassroom = document.getElementById('filterCuotasClassroom')?.value || 'TODAS';
  const rawQuery = document.getElementById('inputFilterCuotasStudents')?.value || '';

  const terms = normalizarTexto(rawQuery).split(/\s+/).filter(t => t.length > 0);

  const filtered = activeStudents.filter(s => {
    const matchClass = (filterClassroom === 'TODAS' || s.classroom === filterClassroom);
    if (!matchClass) return false;
    if (terms.length === 0) return true;

    const searchableString = normalizarTexto(`${s.firstName} ${s.lastName} ${s.legajoNumber || ''} ${s.documentNumber}`);
    return terms.every(term => searchableString.includes(term));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">No se encontraron alumnos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr class="hover:bg-slate-50/80 transition-colors">
      <td class="p-3.5 font-semibold text-slate-900">${s.lastName || ''}, ${s.firstName || ''}</td>
      <td class="p-3.5 text-slate-600 font-medium">${s.documentNumber || '--'}</td>
      <td class="p-3.5"><span class="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">${s.classroom || 'Sin asignar'}</span></td>
      <td class="p-3.5 text-center">
        <button onclick="abrirDetalleCuotas('${s.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all flex items-center gap-1 mx-auto">
          <span class="material-icons-outlined text-sm">payments</span>
          <span>Ver Cuotas</span>
        </button>
      </td>
    </tr>
  `).join('');
}

async function abrirDetalleCuotas(studentId) {
  selectedStudentForCuotas = studentId;
  const alumno = activeStudents.find(s => s.id === studentId);
  if (!alumno) return;

  document.getElementById('cuotasListView').classList.add('hidden');
  document.getElementById('cuotasDetailView').classList.remove('hidden');

  const legajoVisual = alumno.legajoNumber || alumno.legajo || (alumno.id ? alumno.id.substring(0, 8) : '-');
  document.getElementById('cuotasAlumnoNombre').textContent = `${alumno.lastName || ''}, ${alumno.firstName || ''}`;
  document.getElementById('cuotasAlumnoDni').textContent = alumno.documentNumber || '-';
  document.getElementById('cuotasAlumnoLegajoSala').textContent = `Legajo: ${legajoVisual} | Sección: ${alumno.classroom || '-'}`;

  const esAdmin = ['DIRECTOR', 'ADMINISTRATIVE'].includes(currentSession.role);
  document.getElementById('cuotasEditActionContainer').classList.toggle('hidden', !esAdmin);
  document.getElementById('btnEditarMailComprobante').style.display = esAdmin ? 'inline-block' : 'none';
  document.getElementById('btnEditarMailConsulta').style.display = esAdmin ? 'inline-block' : 'none';

  const mailCompEl = document.getElementById('linkMailComprobante');
  const mailConsEl = document.getElementById('linkMailConsulta');

  mailCompEl.textContent = institutionalEmails.receiptEmail || 'No configurado';
  mailCompEl.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(institutionalEmails.receiptEmail || '')}&su=${encodeURIComponent(`Comprobante - ${alumno.lastName}, ${alumno.firstName}`)}`;

  mailConsEl.textContent = institutionalEmails.feeQueryEmail || 'No configurado';
  mailConsEl.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(institutionalEmails.feeQueryEmail || '')}&su=${encodeURIComponent(`Consulta - ${alumno.lastName}, ${alumno.firstName}`)}`;

  isEditingCuotas = false;
  await fetchStudentFees(studentId);
  tempFeesState = {};
  studentFeesList.forEach(f => {
    tempFeesState[f.monthNumber] = (f.status === 'PAID');
  });

  dibujarCasillerosCuotas();
}

function volverAListaCuotas() {
  selectedStudentForCuotas = null;
  isEditingCuotas = false;
  document.getElementById('cuotasDetailView').classList.add('hidden');
  document.getElementById('cuotasListView').classList.remove('hidden');
}

async function fetchStudentFees(studentId) {
  const anio = currentSchoolProfile?.academicYear || 2026;
  try {
    const res = await apiFetch(`/students/${studentId}/fees?academicYear=${anio}`);
    studentFeesList = res.ok ? await res.json() : [];
  } catch (e) {
    studentFeesList = [];
  }
}

function dibujarCasillerosCuotas() {
  const container = document.getElementById('mesesCuotasContainer');
  if (!container) return;

  const mesActual = new Date().getMonth() + 1;

  container.innerHTML = ARANCELES_CICLO_LECTIVO.map(m => {
    const isPaid = tempFeesState[m.id] === true;
    let estiloBorde = 'border-slate-800 bg-slate-50 text-slate-500';
    let icono = '-';
    let textoEstado = 'Inactivo';

    if (isPaid) {
      estiloBorde = 'border-emerald-600 bg-emerald-50 text-emerald-700';
      icono = '✓';
      textoEstado = 'Abonado';
    } else {
      if (m.id === 0 || m.id <= mesActual) {
        estiloBorde = 'border-rose-600 bg-rose-50 text-rose-700';
        icono = '!';
        textoEstado = 'Pendiente';
      }
    }

    const cursorStyle = isEditingCuotas ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-emerald-500 shadow-xs' : 'cursor-default opacity-90';

    return `
      <div onclick="${isEditingCuotas ? `clickCasilleroEdicion(${m.id})` : ''}" 
           class="p-2.5 rounded-xl border-2 ${estiloBorde} ${cursorStyle} transition-all flex flex-col items-center justify-between text-center select-none min-h-[96px]">
        <span class="text-[11px] font-bold text-slate-700 uppercase tracking-tight">${m.nombre}</span>
        <div class="w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold text-sm ${estiloBorde}">
          ${icono}
        </div>
        <span class="text-[10px] font-semibold">${textoEstado}</span>
      </div>
    `;
  }).join('');
}

function habilitarModoEdicionCuotas() {
  isEditingCuotas = true;
  document.getElementById('btnHabilitarEdicionCuotas').classList.add('hidden');
  document.getElementById('btnGuardarEdicionCuotas').classList.remove('hidden');
  document.getElementById('btnCancelarEdicionCuotas').classList.remove('hidden');
  document.getElementById('badgeModoEdicion').classList.remove('hidden');
  dibujarCasillerosCuotas();
}

function cancelarModoEdicionCuotas() {
  isEditingCuotas = false;
  tempFeesState = {};
  studentFeesList.forEach(f => {
    tempFeesState[f.monthNumber] = (f.status === 'PAID');
  });
  document.getElementById('btnHabilitarEdicionCuotas').classList.remove('hidden');
  document.getElementById('btnGuardarEdicionCuotas').classList.add('hidden');
  document.getElementById('btnCancelarEdicionCuotas').classList.add('hidden');
  document.getElementById('badgeModoEdicion').classList.add('hidden');
  dibujarCasillerosCuotas();
}

function clickCasilleroEdicion(mesId) {
  tempFeesState[mesId] = !tempFeesState[mesId];
  dibujarCasillerosCuotas();
}

async function guardarCambiosCuotas() {
  if (!selectedStudentForCuotas) return;
  const anio = currentSchoolProfile?.academicYear || 2026;

  try {
    for (const m of ARANCELES_CICLO_LECTIVO) {
      const dbFee = studentFeesList.find(f => f.monthNumber === m.id);
      const isPaidCurrently = dbFee ? (dbFee.status === 'PAID') : false;
      const willBePaid = tempFeesState[m.id] === true;

      if (isPaidCurrently !== willBePaid) {
        await apiFetch(`/students/${selectedStudentForCuotas}/fees/toggle?academicYear=${anio}&monthNumber=${m.id}`, {
          method: 'POST'
        });
      }
    }

    await fetchStudentFees(selectedStudentForCuotas);

    tempFeesState = {};
    studentFeesList.forEach(f => {
      tempFeesState[f.monthNumber] = (f.status === 'PAID');
    });

    isEditingCuotas = false;
    document.getElementById('btnHabilitarEdicionCuotas').classList.remove('hidden');
    document.getElementById('btnGuardarEdicionCuotas').classList.add('hidden');
    document.getElementById('btnCancelarEdicionCuotas').classList.add('hidden');
    document.getElementById('badgeModoEdicion').classList.add('hidden');

    dibujarCasillerosCuotas();
    alert("¡Cuotas actualizadas exitosamente!");
  } catch (error) {
    console.error("Error al guardar cuotas:", error);
    alert("Hubo un error al guardar los pagos. Revise la conexión.");
  }
}

function editarMailCuotas(tipo) {
  document.getElementById('tipoEmailEditando').value = tipo;
  const inputEmail = document.getElementById('inputModalEmail');
  const titulo = document.getElementById('modalEmailTitulo');
  const label = document.getElementById('lblModalEmail');

  if (tipo === 'comprobante') {
    titulo.innerHTML = '<span class="material-icons-outlined">receipt</span> Modificar Mail de Comprobantes';
    label.textContent = 'Correo Oficial para Recepción de Comprobantes';
    inputEmail.value = institutionalEmails.receiptEmail || '';
  } else {
    titulo.innerHTML = '<span class="material-icons-outlined">mail</span> Modificar Mail de Consultas';
    label.textContent = 'Correo Oficial para Consultas de Aranceles';
    inputEmail.value = institutionalEmails.feeQueryEmail || '';
  }

  document.getElementById('cuotasEmailModal').classList.remove('hidden');
}

function cerrarModalEmailCuotas() {
  document.getElementById('cuotasEmailModal').classList.add('hidden');
}

async function guardarEmailCuotas(e) {
  e.preventDefault();
  const tipo = document.getElementById('tipoEmailEditando').value;
  const nuevoMail = document.getElementById('inputModalEmail').value.trim();

  const payload = {
    receiptEmail: tipo === 'comprobante' ? nuevoMail : institutionalEmails.receiptEmail,
    feeQueryEmail: tipo === 'consulta' ? nuevoMail : institutionalEmails.feeQueryEmail
  };

  try {
    const res = await apiFetch('/institutions/settings/emails', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("¡Correo institucional actualizado!");
      institutionalEmails = payload;
      cerrarModalEmailCuotas();
      if (selectedStudentForCuotas) {
        abrirDetalleCuotas(selectedStudentForCuotas);
      }
    }
  } catch (error) {
    console.error("Error al guardar email:", error);
  }
}

// ========================================================
// CONTROL DE RETIROS DE ALUMNOS (AUTORIZADOS)
// ========================================================

function renderRetirosView() {
  filterRetirosTable();
}

function filterRetirosTable() {
  const container = document.getElementById('retirosAlumnosList');
  if (!container) return;

  const filterClassroom = document.getElementById('filterRetirosClassroom')?.value || 'TODAS';
  const rawQuery = document.getElementById('inputFilterRetiros')?.value || '';

  const terms = normalizarTexto(rawQuery).split(/\s+/).filter(t => t.length > 0);

  const filtrados = activeStudents.filter(s => {
    const matchClass = (filterClassroom === 'TODAS' || s.classroom === filterClassroom);
    if (!matchClass) return false;
    if (terms.length === 0) return true;

    const searchableString = normalizarTexto(`${s.firstName} ${s.lastName} ${s.legajoNumber || ''} ${s.documentNumber}`);
    return terms.every(term => searchableString.includes(term));
  });

  if (filtrados.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 p-4 text-center">No se encontraron alumnos.</p>';
    return;
  }

  container.innerHTML = filtrados.map(s => `
    <div onclick="seleccionarAlumnoRetiros('${s.id}')" class="p-3 hover:bg-emerald-50/60 cursor-pointer flex justify-between items-center transition-colors ${selectedStudentForRetiros === s.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''}">
      <div>
        <h4 class="font-bold text-slate-800 text-xs">${s.lastName || ''}, ${s.firstName || ''}</h4>
        <span class="text-slate-400 text-[11px] block">DNI: ${s.documentNumber || '--'} | ${s.classroom || 'Sin sección'}</span>
      </div>
      <span class="material-icons-outlined text-slate-300 text-sm">chevron_right</span>
    </div>
  `).join('');
}

async function seleccionarAlumnoRetiros(studentId) {
  selectedStudentForRetiros = studentId;
  const alumno = activeStudents.find(s => s.id === studentId);
  if (!alumno) return;

  const legajoVisual = alumno.legajoNumber || alumno.legajo || (alumno.id ? alumno.id.substring(0, 8) : '--');
  document.getElementById('retirosAlumnoNombreHeader').textContent = `${alumno.lastName || ''}, ${alumno.firstName || ''}`;
  document.getElementById('retirosAlumnoInfoSub').textContent = `DNI: ${alumno.documentNumber || '--'} | Sección: ${alumno.classroom || '--'} | Legajo: ${legajoVisual}`;
  document.getElementById('btnAgregarAutorizadoPanel').classList.remove('hidden');

  filterRetirosTable();
  await fetchAndRenderPickupsGeneral(studentId, 'retirosDetalleAutorizados');
}

function calcularEdadDesdeFecha(fechaStr) {
  if (!fechaStr) return null;
  const hoy = new Date();
  const cumple = new Date(fechaStr + 'T00:00:00');
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return edad;
}

function actualizarEdadVisual() {
  const inputDate = document.getElementById('pickupBirthDate');
  const lbl = document.getElementById('labelEdadCalculada');
  if (!inputDate || !lbl) return;

  if (!inputDate.value) {
    lbl.textContent = "Seleccione fecha";
    lbl.className = "font-bold text-slate-400";
    return;
  }

  const edad = calcularEdadDesdeFecha(inputDate.value);
  if (edad < 18) {
    lbl.textContent = `${edad} años (❌ Menor de 18)`;
    lbl.className = "font-bold text-rose-600";
  } else {
    lbl.textContent = `${edad} años (✓ Mayor de edad)`;
    lbl.className = "font-bold text-emerald-700";
  }
}

async function fetchAndRenderPickupsGeneral(studentId, targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  try {
    const res = await apiFetch(`/students/${studentId}/authorized-pickups`);
    currentStudentPickups = res.ok ? await res.json() : [];

    if (currentStudentPickups.length === 0) {
      container.innerHTML = `<div class="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">No hay personas autorizadas registradas.</div>`;
      return;
    }

    container.innerHTML = currentStudentPickups.map(p => `
      <div onclick="verPerfilAmpliadoAutorizado('${p.id}')" class="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs flex justify-between items-center cursor-pointer hover:border-emerald-500 transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            ${getInitials(p.fullName)}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-slate-900 text-xs">${p.fullName}</h4>
              <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">${p.relationship}</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">DNI: ${p.documentNumber} | ${p.age} años | Tel: ${p.phone}</p>
          </div>
        </div>

        <button onclick="event.stopPropagation(); eliminarPersonaAutorizada('${p.id}')" title="Eliminar" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer">
          <span class="material-icons-outlined text-sm">delete</span>
        </button>
      </div>
    `).join('');

  } catch (error) {
    console.error("Error al cargar autorizados:", error);
  }
}

function verPerfilAmpliadoAutorizado(pickupId) {
  const p = currentStudentPickups.find(item => item.id === pickupId);
  if (!p) return;

  document.getElementById('detailPickupAvatar').textContent = getInitials(p.fullName);
  document.getElementById('detailPickupName').textContent = p.fullName || '-';
  document.getElementById('detailPickupRel').textContent = p.relationship || 'Autorizado';
  document.getElementById('detailPickupDni').textContent = p.documentNumber || '-';
  document.getElementById('detailPickupAge').textContent = `${p.age || '-'} años`;
  document.getElementById('detailPickupPhone').textContent = p.phone || '-';

  document.getElementById('pickupDetailModal').classList.remove('hidden');
}

function cerrarModalDetalleAutorizado() {
  document.getElementById('pickupDetailModal').classList.add('hidden');
}

function abrirModalNuevoAutorizado() {
  const form = document.getElementById('formAuthorizedPickup');
  if (form) form.reset();

  document.getElementById('pickupEditId').value = '';
  const label = document.getElementById('labelEdadCalculada');
  if (label) {
    label.textContent = 'Seleccione fecha';
    label.className = 'font-bold text-slate-400';
  }

  document.getElementById('authorizedPickupModal').classList.remove('hidden');
}

function cerrarModalNuevoAutorizado() {
  document.getElementById('authorizedPickupModal').classList.add('hidden');
}

async function guardarPersonaAutorizada(e) {
  e.preventDefault();

  let studentId = selectedStudentForRetiros || currentStudentData?.id;
  if (!studentId) return;

  const birthDateValue = document.getElementById('pickupBirthDate').value;
  const edadCalculada = calcularEdadDesdeFecha(birthDateValue);

  if (edadCalculada === null || isNaN(edadCalculada) || edadCalculada < 18) {
    alert("La persona autorizada debe ser mayor de 18 años según la normativa.");
    return;
  }

  const payload = {
    fullName: document.getElementById('pickupFullName').value.trim(),
    documentNumber: document.getElementById('pickupDni').value.trim(),
    birthDate: birthDateValue,
    age: edadCalculada,
    relationship: document.getElementById('pickupRelationship').value.trim(),
    phone: document.getElementById('pickupPhone').value.trim()
  };

  try {
    const res = await apiFetch(`/students/${studentId}/authorized-pickups`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("¡Persona autorizada guardada!");
      cerrarModalNuevoAutorizado();
      if (currentStudentData) fetchAndRenderPickupsGeneral(studentId, 'autorizados-container');
      if (selectedStudentForRetiros) fetchAndRenderPickupsGeneral(studentId, 'retirosDetalleAutorizados');
    }
  } catch (err) {
    console.error("Error autorizado:", err);
  }
}

async function eliminarPersonaAutorizada(pickupId) {
  let studentId = selectedStudentForRetiros || currentStudentData?.id;
  if (!studentId || !confirm("¿Deseas retirar la autorización de retiro?")) return;

  try {
    const res = await apiFetch(`/students/${studentId}/authorized-pickups/${pickupId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      if (currentStudentData) fetchAndRenderPickupsGeneral(studentId, 'autorizados-container');
      if (selectedStudentForRetiros) fetchAndRenderPickupsGeneral(studentId, 'retirosDetalleAutorizados');
    }
  } catch (err) {
    console.error("Error al eliminar:", err);
  }
}

// ========================================================
// RESTRICCIONES JUDICIALES
// ========================================================

function renderRestriccionesView() {
  filterRestriccionesTable();
}

function filterRestriccionesTable() {
  const container = document.getElementById('restriccionesAlumnosList');
  if (!container) return;

  const filterClassroom = document.getElementById('filterRestriccionesClassroom')?.value || 'TODAS';
  const rawQuery = document.getElementById('inputFilterRestricciones')?.value || '';

  const terms = normalizarTexto(rawQuery).split(/\s+/).filter(t => t.length > 0);

  const filtrados = activeStudents.filter(s => {
    const matchClass = (filterClassroom === 'TODAS' || s.classroom === filterClassroom);
    if (!matchClass) return false;
    if (terms.length === 0) return true;

    const searchableString = normalizarTexto(`${s.firstName} ${s.lastName} ${s.legajoNumber || ''} ${s.documentNumber}`);
    return terms.every(term => searchableString.includes(term));
  });

  if (filtrados.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 p-4 text-center">No se encontraron alumnos.</p>';
    return;
  }

  container.innerHTML = filtrados.map(s => `
    <div onclick="seleccionarAlumnoRestricciones('${s.id}')" class="p-3 hover:bg-rose-50/60 cursor-pointer flex justify-between items-center transition-colors ${selectedStudentForRestricciones === s.id ? 'bg-rose-50 border-l-4 border-rose-600' : ''}">
      <div>
        <h4 class="font-bold text-slate-800 text-xs">${s.lastName || ''}, ${s.firstName || ''}</h4>
        <span class="text-slate-400 text-[11px] block">DNI: ${s.documentNumber || '--'} | ${s.classroom || 'Sin sección'}</span>
      </div>
      <span class="material-icons-outlined text-slate-300 text-sm">chevron_right</span>
    </div>
  `).join('');
}

async function seleccionarAlumnoRestricciones(studentId) {
  selectedStudentForRestricciones = studentId;
  const alumno = activeStudents.find(s => s.id === studentId);
  if (!alumno) return;

  const legajoVisual = alumno.legajoNumber || alumno.legajo || (alumno.id ? alumno.id.substring(0, 8) : '--');
  document.getElementById('restriccionesAlumnoNombreHeader').textContent = `${alumno.lastName || ''}, ${alumno.firstName || ''}`;
  document.getElementById('restriccionesAlumnoInfoSub').textContent = `DNI: ${alumno.documentNumber || '--'} | Sección: ${alumno.classroom || '--'} | Legajo: ${legajoVisual}`;
  document.getElementById('btnAgregarRestriccionPanel').classList.remove('hidden');

  filterRestriccionesTable();
  await fetchAndRenderRestrictionsGeneral(studentId, 'restriccionesDetalleList');
}

async function fetchAndRenderRestrictionsGeneral(studentId, targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  try {
    const res = await apiFetch(`/students/${studentId}/judicial-restrictions`);
    currentStudentRestrictions = res.ok ? await res.json() : [];

    if (currentStudentRestrictions.length === 0) {
      container.innerHTML = `<div class="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">No constan medidas judiciales certificadas.</div>`;
      return;
    }

    container.innerHTML = currentStudentRestrictions.map(r => `
      <div onclick="verPerfilAmpliadoRestriccion('${r.id}')" class="p-3.5 bg-white border border-rose-200 rounded-xl shadow-xs flex justify-between items-center cursor-pointer hover:border-rose-500 transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
            ${getInitials(`${r.firstName || ''} ${r.lastName || ''}`)}
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-xs">${r.lastName}, ${r.firstName} (Prohibición Judicial)</h4>
            <p class="text-[11px] text-slate-500">DNI: ${r.documentNumber} | <strong>Medida:</strong> ${r.description}</p>
          </div>
        </div>
        <button onclick="event.stopPropagation(); eliminarRestriccionJudicial('${r.id}')" class="p-1.5 text-slate-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer">
          <span class="material-icons-outlined text-sm">delete</span>
        </button>
      </div>
    `).join('');

  } catch (error) {
    console.error("Error restricciones:", error);
  }
}

function verPerfilAmpliadoRestriccion(restrictionId) {
  const r = currentStudentRestrictions.find(item => item.id === restrictionId);
  if (!r) return;

  const nombreCompleto = `${r.lastName || ''}, ${r.firstName || ''}`.trim();
  document.getElementById('detailRestrAvatar').textContent = getInitials(nombreCompleto);
  document.getElementById('detailRestrName').textContent = nombreCompleto || '-';
  document.getElementById('detailRestrDoc').textContent = `${r.documentType || 'DNI'}: ${r.documentNumber || '-'}`;
  document.getElementById('detailRestrDesc').textContent = r.description || '-';
  document.getElementById('detailRestrLegajo').textContent = r.legajoNumber || '-';
  document.getElementById('detailRestrMatrix').textContent = r.matrixNumber || '-';
  document.getElementById('detailRestrFolio').textContent = r.folioNumber || '-';
  document.getElementById('detailRestrDate').textContent = r.inscriptionDate || '-';

  document.getElementById('restrictionDetailModal').classList.remove('hidden');
}

function cerrarModalDetalleRestriccion() {
  document.getElementById('restrictionDetailModal').classList.add('hidden');
}

function abrirModalNuevaRestriccion() {
  const form = document.getElementById('formJudicialRestriction');
  if (form) form.reset();

  document.getElementById('restriccionEditId').value = '';
  document.getElementById('restriccionDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('judicialRestrictionModal').classList.remove('hidden');
}

function cerrarModalRestriccion() {
  document.getElementById('judicialRestrictionModal').classList.add('hidden');
}

async function guardarRestriccionJudicial(e) {
  e.preventDefault();

  let studentId = selectedStudentForRestricciones || currentStudentData?.id;
  if (!studentId) return;

  const payload = {
    lastName: document.getElementById('restriccionLastName').value.trim(),
    firstName: document.getElementById('restriccionFirstName').value.trim(),
    documentType: document.getElementById('restriccionDocType').value,
    documentNumber: document.getElementById('restriccionDocNumber').value.trim(),
    description: document.getElementById('restriccionDescription').value.trim(),
    legajoNumber: document.getElementById('restriccionLegajo').value.trim(),
    matrixNumber: document.getElementById('restriccionMatrix').value.trim(),
    folioNumber: document.getElementById('restriccionFolio').value.trim(),
    inscriptionDate: document.getElementById('restriccionDate').value || null
  };

  try {
    const res = await apiFetch(`/students/${studentId}/judicial-restrictions`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("¡Restricción judicial guardada!");
      cerrarModalRestriccion();
      if (currentStudentData) fetchAndRenderRestrictionsGeneral(studentId, 'restricciones-container');
      if (selectedStudentForRestricciones) fetchAndRenderRestrictionsGeneral(studentId, 'restriccionesDetalleList');
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

async function eliminarRestriccionJudicial(restrictionId) {
  let studentId = selectedStudentForRestricciones || currentStudentData?.id;
  if (!studentId || !confirm("¿Está seguro de eliminar esta restricción judicial?")) return;

  try {
    const res = await apiFetch(`/students/${studentId}/judicial-restrictions/${restrictionId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      if (currentStudentData) fetchAndRenderRestrictionsGeneral(studentId, 'restricciones-container');
      if (selectedStudentForRestricciones) fetchAndRenderRestrictionsGeneral(studentId, 'restriccionesDetalleList');
    }
  } catch (err) {
    console.error("Error al eliminar restricción:", err);
  }
}

// ========================================================
// COMUNICADOS
// ========================================================

function renderComunicadosView() {
  filterComunicadosFeed();
  evaluarPermisosComunicados();
}

async function fetchAnnouncements() {
  try {
    const res = await apiFetch('/announcements');
    announcementsList = res.ok ? await res.json() : [];
    renderInicioFeed();
    filterComunicadosFeed();
  } catch (error) {
    console.error("Error comunicados:", error);
  }
}

function getAuthorizedAnnouncements() {
  let list = announcementsList;
  if (currentSession.role === 'TEACHER') {
    const userClass = currentStaffData?.classroom;
    list = list.filter(a => a.scope === 'GLOBAL' || a.targetClassroom === userClass);
  } else if (currentSession.role === 'TUTOR') {
    const tutorKids = activeStudents.filter(s => s.tutors && s.tutors.some(t => t.email === currentSession.email));
    const kidsSalas = tutorKids.map(k => k.classroom);
    const kidsIds = tutorKids.map(k => k.id);

    list = list.filter(a =>
        a.scope === 'GLOBAL' ||
        (a.scope === 'CLASSROOM' && kidsSalas.includes(a.targetClassroom)) ||
        (a.scope === 'PRIVATE_STUDENT' && kidsIds.includes(a.targetStudentId))
    );
  }
  return list;
}

function renderInicioFeed() {
  const container = document.getElementById('inicioComunicadosFeed');
  if (!container) return;

  const list = getAuthorizedAnnouncements().filter(a => a.scope !== 'PRIVATE_STUDENT').slice(0, 3);
  if (list.length === 0) {
    container.innerHTML = `<div class="p-4 bg-white border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">No hay comunicados recientes publicados.</div>`;
    return;
  }

  container.innerHTML = list.map(a => renderCardHtml(a, false)).join('');
}

function filterComunicadosFeed() {
  const container = document.getElementById('comunicadosFeedContainer');
  if (!container) return;

  const targetScope = document.getElementById('filterComunicadosClassroom')?.value || 'TODAS';
  let list = getAuthorizedAnnouncements().filter(a => a.scope !== 'PRIVATE_STUDENT');

  if (targetScope !== 'TODAS') {
    if (targetScope === 'GLOBAL') {
      list = list.filter(a => a.scope === 'GLOBAL');
    } else {
      list = list.filter(a => a.targetClassroom === targetScope);
    }
  }

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">No hay comunicados publicados para este criterio.</div>`;
    return;
  }

  container.innerHTML = list.map(a => renderCardHtml(a, true)).join('');
}

async function renderComunicadosPrivadosAlumno(studentId) {
  const container = document.getElementById('alumno-comunicados-privados');
  if (!container) return;

  const list = announcementsList.filter(a => a.scope === 'PRIVATE_STUDENT' && a.targetStudentId === studentId);
  if (list.length === 0) {
    container.innerHTML = `<div class="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">No hay mensajes privados registrados para este alumno.</div>`;
    return;
  }

  container.innerHTML = list.map(a => renderCardHtml(a, true)).join('');
}

function renderCardHtml(a, canEditIfAuthorized) {
  let badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (a.category === 'ACTIVIDAD') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (a.category === 'URGENTE') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
  if (a.category === 'PRIVADO') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';

  const canManage = canEditIfAuthorized && ['DIRECTOR', 'ADMINISTRATIVE', 'PRECEPTOR', 'TEACHER'].includes(currentSession.role);

  return `
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5">
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-2">
          <span class="border text-[10px] font-bold px-2 py-0.5 rounded uppercase ${badgeClass}">${a.category}</span>
          <span class="text-xs font-semibold text-slate-600">${a.scope === 'GLOBAL' ? 'Toda la Escuela' : (a.scope === 'CLASSROOM' ? `Sección: ${a.targetClassroom}` : 'Mensaje Privado')}</span>
        </div>
        ${canManage ? `
          <div class="flex items-center gap-1">
            <button onclick="eliminarComunicado('${a.id}')" title="Eliminar" class="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer">
              <span class="material-icons-outlined text-sm">delete</span>
            </button>
          </div>
        ` : ''}
      </div>

      <div>
        <h4 class="text-sm font-bold text-slate-900">${a.title}</h4>
        <p class="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">${a.content}</p>
      </div>

      ${a.mediaUrl ? `
        <a href="${a.mediaUrl}" target="_blank" class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
          <span class="material-icons-outlined text-xs">smart_display</span>
          <span>Ver Material / Enlace</span>
        </a>
      ` : ''}

      <div class="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
        <span>Por: <strong class="text-slate-600">${a.authorName} (${a.authorRole})</strong></span>
        <span>${a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-AR') : 'Reciente'}</span>
      </div>
    </div>
  `;
}

function handleComunicadoScopeChange() {
  const scope = document.getElementById('comunicadoScope')?.value;
  const blockSala = document.getElementById('comunicadoClassroomBlock');
  if (blockSala) blockSala.classList.toggle('hidden', scope !== 'CLASSROOM');
}

function evaluarPermisosComunicados() {
  const btnNuevo = document.getElementById('btnNuevoComunicado');
  if (btnNuevo) {
    btnNuevo.classList.toggle('hidden', !['DIRECTOR', 'ADMINISTRATIVE', 'PRECEPTOR', 'TEACHER'].includes(currentSession.role));
  }
}

function abrirModalNuevoComunicado() {
  const form = document.getElementById('formComunicado');
  if (form) form.reset();

  document.getElementById('comunicadoEditId').value = '';
  document.getElementById('comunicadoTargetStudentId').value = '';
  handleComunicadoScopeChange();
  document.getElementById('comunicadoModal').classList.remove('hidden');
}

function abrirModalComunicadoPrivado() {
  if (!currentStudentData) return;

  abrirModalNuevoComunicado();
  document.getElementById('comunicadoTargetStudentId').value = currentStudentData.id;
  document.getElementById('comunicadoCategory').value = 'PRIVADO';
  const scopeSel = document.getElementById('comunicadoScope');
  if (scopeSel) scopeSel.value = 'PRIVATE_STUDENT';
  handleComunicadoScopeChange();
}

function cerrarModalComunicado() {
  document.getElementById('comunicadoModal').classList.add('hidden');
}

async function guardarComunicado(e) {
  e.preventDefault();

  const scope = document.getElementById('comunicadoScope').value;
  const payload = {
    authorId: currentSession.email,
    authorName: currentSession.email.split('@')[0],
    authorRole: currentSession.role,
    title: document.getElementById('comunicadoTitle').value.trim(),
    content: document.getElementById('comunicadoContent').value.trim(),
    category: document.getElementById('comunicadoCategory').value,
    scope,
    targetClassroom: scope === 'CLASSROOM' ? document.getElementById('comunicadoTargetClassroom').value : null,
    targetStudentId: document.getElementById('comunicadoTargetStudentId').value.trim() || null,
    mediaUrl: document.getElementById('comunicadoMediaUrl').value.trim() || null,
    isPinned: false
  };

  try {
    const res = await apiFetch('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("¡Comunicado publicado con éxito!");
      cerrarModalComunicado();
      await fetchAnnouncements();
    }
  } catch (error) {
    console.error("Error comunicado:", error);
  }
}

async function eliminarComunicado(id) {
  if (!confirm("¿Deseas eliminar este comunicado?")) return;

  try {
    const res = await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchAnnouncements();
  } catch (error) {
    console.error("Error al eliminar:", error);
  }
}

document.addEventListener('DOMContentLoaded', async () =>{
  if (currentSession.email && currentSession.institutionId) {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    document.getElementById('userDisplay').innerText = currentSession.email;
    document.getElementById('roleBadge').innerText =
        currentSession.role === 'DIRECTOR' ? 'Directora' :
            (currentSession.role === 'ADMINISTRATIVE' ? 'Administrativo' :
                (currentSession.role === 'PRECEPTOR' ? 'Preceptor/a' :
                    (currentSession.role === 'TUTOR' ? 'Tutor' : 'Docente')));
    refreshAllData();
  } else {
    loadLoginInstitutions();
  }
});

// ========================================================
// MÓDULO: PERFIL INSTITUCIONAL, TICKETS Y PLANILLA
// ========================================================

// Cabeceras exclusivas de Alumnos para la planilla y exportación
const spreadsheetHeaders = [
  "N° Legajo", "Apellido", "Nombre", "DNI", "Fecha Nac.", "Dirección", "Sección / Aula"
];

async function fetchSchoolProfile() {
  try {
    const res = await apiFetch('/institution/profile');
    if (res.ok) {
      const data = await res.json();

      currentSchoolProfile = data.profile;
      currentSchoolProfile.educationLevel = data.educationLevel;
      currentSchoolProfile.levelDisplayName = data.levelDisplayName;

      currentLevelClassrooms = data.classrooms || [];

      renderSchoolProfile();
      actualizarTodosLosSelectoresDeAulas();
    }
  } catch (error) {
    console.error("Error al cargar perfil de escuela:", error);
  }
}

function renderSchoolProfile() {
  if (!currentSchoolProfile) return;

  const schoolName = currentSchoolProfile.name || 'Establecimiento Escolar';
  const nameDisplay = document.getElementById('schoolNameDisplay');
  if (nameDisplay) nameDisplay.textContent = schoolName;

  const headerName = document.getElementById('headerSchoolName');
  if (headerName) headerName.textContent = schoolName;
  const inicioTitle = document.getElementById('inicioSchoolTitle');
  if (inicioTitle) inicioTitle.textContent = schoolName;

  const initialsEl = document.getElementById('schoolInitials');
  if (initialsEl) initialsEl.textContent = getInitials(schoolName);

  const cueBadge = document.getElementById('schoolCueBadge');
  if (cueBadge) cueBadge.textContent = `CUE: ${currentSchoolProfile.cue || '-'}`;

  const sectorBadge = document.getElementById('schoolSectorBadge');
  if (sectorBadge) sectorBadge.textContent = `Sector: ${currentSchoolProfile.sector || '-'}`;

  const levelBadge = document.getElementById('schoolLevelsBadge');
  if (levelBadge) {
    levelBadge.textContent = `Nivel: ${currentSchoolProfile.levelDisplayName || currentSchoolProfile.educationLevel || '-'}`;
  }

  const cutoffEl = document.getElementById('schoolCutoffDateDisplay');
  if (cutoffEl) cutoffEl.textContent = "30 de Junio";

  const cycleVal = currentSchoolProfile.academicYear || 2026;
  const cycleDisplay = document.getElementById('schoolActiveCycleDisplay');
  if (cycleDisplay) {
    cycleDisplay.value = `Ciclo Lectivo ${cycleVal}`;
  }
  const cycleSelect = document.getElementById('schoolActiveCycleSelect');
  if (cycleSelect) {
    cycleSelect.value = cycleVal.toString();
  }

  const legalEl = document.getElementById('schoolLegalName');
  if (legalEl) legalEl.textContent = currentSchoolProfile.legalName || '-';

  const distEl = document.getElementById('schoolDistrict');
  if (distEl) distEl.textContent = currentSchoolProfile.district || '-';

  const dipEl = document.getElementById('schoolDIPREGEP');
  if (dipEl) dipEl.textContent = currentSchoolProfile.dipregep || '-';

  const shiftsEl = document.getElementById('schoolShifts');
  if (shiftsEl) shiftsEl.textContent = currentSchoolProfile.shifts || '-';

  const addrEl = document.getElementById('schoolAddress');
  if (addrEl) addrEl.textContent = currentSchoolProfile.address || '-';

  const cityEl = document.getElementById('schoolCity');
  if (cityEl) cityEl.textContent = currentSchoolProfile.city || '-';

  const phoneEl = document.getElementById('schoolPhone');
  if (phoneEl) phoneEl.textContent = currentSchoolProfile.phone || '-';

  const emailEl = document.getElementById('schoolEmail');
  if (emailEl) emailEl.textContent = currentSchoolProfile.email || '-';

  const roleBadge = document.getElementById('schoolRoleBadge');
  const adminNotice = document.getElementById('schoolAdminNotice');
  const actionContainer = document.getElementById('schoolActionBtnContainer');

  if (roleBadge) roleBadge.textContent = currentSession.role;

  if (actionContainer) {
    if (currentSession.role === 'DIRECTOR') {
      actionContainer.innerHTML = `
        <button onclick="abrirModalEdicionEscuela()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
          <span class="material-icons-outlined text-sm">edit</span> Editar Información
        </button>
      `;
      if (adminNotice) adminNotice.classList.add('hidden');
      fetchAndRenderTickets();
    } else if (currentSession.role === 'ADMINISTRATIVE') {
      actionContainer.innerHTML = `
        <button onclick="abrirModalEdicionEscuela()" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
          <span class="material-icons-outlined text-sm">send</span> Solicitar Modificación (Ticket)
        </button>
      `;
      if (adminNotice) adminNotice.classList.remove('hidden');
      const dirTickets = document.getElementById('directorTicketsContainer');
      if (dirTickets) dirTickets.classList.add('hidden');
    } else {
      actionContainer.innerHTML = '';
      if (adminNotice) adminNotice.classList.add('hidden');
      const dirTickets = document.getElementById('directorTicketsContainer');
      if (dirTickets) dirTickets.classList.add('hidden');
    }
  }
}

function actualizarTodosLosSelectoresDeAulas() {
  if (!Array.isArray(currentLevelClassrooms) || currentLevelClassrooms.length === 0) return;

  const optionsHtml = currentLevelClassrooms.map(c => `<option value="${c}">${c}</option>`).join('');

  const filtroAlumnos = document.getElementById('filterStudentClassroom');
  if (filtroAlumnos) filtroAlumnos.innerHTML = '<option value="TODAS">Todas las Secciones</option>' + optionsHtml;

  const selectModalAlumno = document.getElementById('student-classroom');
  if (selectModalAlumno) selectModalAlumno.innerHTML = '<option value="">Seleccione sala/año...</option>' + optionsHtml;

  const filtroCuotas = document.getElementById('filterCuotasClassroom');
  if (filtroCuotas) filtroCuotas.innerHTML = '<option value="TODAS">Todas las Secciones</option>' + optionsHtml;

  const filtroRetiros = document.getElementById('filterRetirosClassroom');
  if (filtroRetiros) filtroRetiros.innerHTML = '<option value="TODAS">Todas las Secciones</option>' + optionsHtml;

  const filtroExcel = document.getElementById('excelCourseFilter');
  if (filtroExcel) filtroExcel.innerHTML = '<option value="ALL">📋 Todas las Secciones</option>' + optionsHtml;

  const selComunicados = document.getElementById('comunicadoTargetClassroom');
  if (selComunicados) selComunicados.innerHTML = optionsHtml;
}

// Tickets para Dirección
async function fetchAndRenderTickets() {
  if (currentSession.role !== 'DIRECTOR') return;
  try {
    const res = await apiFetch('/institution/profile/tickets');
    const tickets = res.ok ? await res.json() : [];
    const container = document.getElementById('directorTicketsContainer');
    const list = document.getElementById('ticketsList');
    const countBadge = document.getElementById('labelTicketsCount');

    if (tickets.length === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    countBadge.textContent = `${tickets.length} pendientes`;

    list.innerHTML = tickets.map(t => {
      let data = {};
      try { data = JSON.parse(t.proposedDataJson); } catch (e) {}

      return `
        <div class="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-800">Solicitado por: ${t.requestedByEmail}</span>
              <span class="text-[10px] text-slate-400">${t.createdAt ? new Date(t.createdAt).toLocaleDateString('es-AR') : ''}</span>
            </div>
            <p class="text-slate-600 mt-1"><strong>Motivo:</strong> ${t.reason}</p>
            <p class="text-amber-900 font-semibold text-[11px] mt-0.5">Propuesta: Ciclo ${data.academicYear || '-'} | Sede: ${data.name || '-'}</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="resolverTicketEscuela('${t.id}', true)" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer">Aprobar</button>
            <button onclick="resolverTicketEscuela('${t.id}', false)" class="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer">Rechazar</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error("Error tickets:", e);
  }
}

async function resolverTicketEscuela(ticketId, approve) {
  try {
    const res = await apiFetch(`/institution/profile/tickets/${ticketId}/resolve?approve=${approve}`, {
      method: 'POST'
    });
    if (res.ok) {
      alert(approve ? "✅ Solicitud aprobada y aplicada a la escuela." : "❌ Solicitud rechazada.");
      await fetchSchoolProfile();
    }
  } catch (error) {
    console.error("Error al resolver ticket:", error);
  }
}

function abrirModalEdicionEscuela() {
  if (!currentSchoolProfile) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('edit-school-name', currentSchoolProfile.name);
  setVal('edit-school-legalname', currentSchoolProfile.legalName);
  setVal('edit-school-district', currentSchoolProfile.district);
  setVal('edit-school-sector', currentSchoolProfile.sector || 'Privado');
  setVal('edit-school-levels', currentSchoolProfile.levels || 'Inicial');
  setVal('edit-school-shifts', currentSchoolProfile.shifts);
  setVal('edit-school-city', currentSchoolProfile.city);
  setVal('edit-school-cycle', currentSchoolProfile.academicYear || 2026);
  setVal('edit-school-cue', currentSchoolProfile.cue);
  setVal('edit-school-dipregep', currentSchoolProfile.dipregep);
  setVal('edit-school-phone', currentSchoolProfile.phone);
  setVal('edit-school-email', currentSchoolProfile.email);
  setVal('edit-school-address', currentSchoolProfile.address);

  const reasonContainer = document.getElementById('schoolTicketReasonContainer');
  const submitBtn = document.getElementById('btnSchoolSubmitModal');

  if (currentSession.role === 'ADMINISTRATIVE') {
    if (reasonContainer) reasonContainer.classList.remove('hidden');
    const reasonInput = document.getElementById('edit-school-ticket-reason');
    if (reasonInput) reasonInput.required = true;
    if (submitBtn) submitBtn.textContent = 'Enviar Solicitud a Dirección';
  } else {
    if (reasonContainer) reasonContainer.classList.add('hidden');
    const reasonInput = document.getElementById('edit-school-ticket-reason');
    if (reasonInput) reasonInput.required = false;
    if (submitBtn) submitBtn.textContent = 'Guardar Cambios';
  }

  document.getElementById('schoolEditModal')?.classList.remove('hidden');
}

function cerrarModalEdicionEscuela() {
  document.getElementById('schoolEditModal').classList.add('hidden');
}

async function guardarDatosEscuela(e) {
  e.preventDefault();

  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

  const proposedData = {
    ...currentSchoolProfile,
    name: getVal('edit-school-name'),
    legalName: getVal('edit-school-legalname'),
    district: getVal('edit-school-district'),
    sector: document.getElementById('edit-school-sector')?.value || 'Privado',
    levels: document.getElementById('edit-school-levels')?.value || 'Inicial',
    shifts: getVal('edit-school-shifts'),
    city: getVal('edit-school-city'),
    academicYear: parseInt(document.getElementById('edit-school-cycle')?.value) || 2026,
    cue: getVal('edit-school-cue'),
    dipregep: getVal('edit-school-dipregep'),
    phone: getVal('edit-school-phone'),
    email: getVal('edit-school-email'),
    address: getVal('edit-school-address')
  };

  if (currentSession.role === 'ADMINISTRATIVE') {
    const reason = getVal('edit-school-ticket-reason');
    try {
      const res = await apiFetch('/institution/profile/tickets', {
        method: 'POST',
        body: JSON.stringify({ reason, proposedData })
      });
      if (res.ok) {
        alert("✅ Solicitud enviada exitosamente a Dirección.");
        cerrarModalEdicionEscuela();
      }
    } catch (err) {
      alert("Error al enviar ticket.");
    }
    return;
  }

  try {
    const res = await apiFetch('/institution/profile', {
      method: 'PUT',
      body: JSON.stringify(proposedData)
    });
    if (res.ok) {
      currentSchoolProfile = await res.json();
      renderSchoolProfile();
      cerrarModalEdicionEscuela();
      alert("✅ Datos institucionales actualizados.");
      await fetchSchoolProfile();
    }
  } catch (err) {
    alert("Error al guardar cambios de la escuela.");
  }
}

// Convertir alumnos a matriz exclusivamente de estudiantes
function convertStudentsToMatrix(studentsList) {
  const matrix = [spreadsheetHeaders];

  studentsList.forEach(s => {
    matrix.push([
      s.legajoNumber || s.legajo || (s.id ? s.id.substring(0, 8) : '-'),
      s.lastName || '-',
      s.firstName || '-',
      s.documentNumber || '-',
      s.birthDate || '-',
      s.address || '-',
      s.classroom || 'Sin sección'
    ]);
  });

  return matrix;
}

function renderSpreadsheetTable() {
  const container = document.getElementById('handsontableSpreadsheetContainer');
  if (!container) return;

  const courseFilter = document.getElementById('excelCourseFilter')?.value || 'ALL';
  const rawQuery = document.getElementById('excelSearchInput')?.value || '';
  const searchKeyword = normalizarTexto(rawQuery);

  let filtered = activeStudents;

  if (courseFilter !== 'ALL') {
    filtered = filtered.filter(s => s.classroom === courseFilter);
  }

  if (searchKeyword) {
    filtered = filtered.filter(s => {
      const full = normalizarTexto(`${s.lastName} ${s.firstName} ${s.documentNumber} ${s.legajoNumber || ''}`);
      return full.includes(searchKeyword);
    });
  }

  const matrix = convertStudentsToMatrix(filtered);

  if (hotSpreadsheetInstance) {
    hotSpreadsheetInstance.destroy();
  }

  hotSpreadsheetInstance = new Handsontable(container, {
    data: matrix,
    rowHeaders: true,
    colHeaders: false,
    height: 480,
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: true,
    columnSorting: true,
    dropdownMenu: true,
    filters: true
  });
}

function exportarExcelMultiHojas() {
  if (activeStudents.length === 0) {
    alert("No hay alumnos matriculados para exportar.");
    return;
  }

  const wb = XLSX.utils.book_new();

  // 1. Hoja Consolidada General (Solo Alumnos)
  const generalMatrix = convertStudentsToMatrix(activeStudents);
  const generalSheet = XLSX.utils.aoa_to_sheet(generalMatrix);
  XLSX.utils.book_append_sheet(wb, generalSheet, "General_Todos");

  // 2. Hojas filtradas según el catálogo de aulas del nivel activo
  currentLevelClassrooms.forEach(seccionValida => {
    const listaCurso = activeStudents.filter(s => s.classroom === seccionValida);
    if (listaCurso.length > 0) {
      const cursoMatrix = convertStudentsToMatrix(listaCurso);
      const cursoSheet = XLSX.utils.aoa_to_sheet(cursoMatrix);
      const safeName = seccionValida.replace(/[/\\?*:[\]]/g, "").substring(0, 30);
      XLSX.utils.book_append_sheet(wb, cursoSheet, safeName);
    }
  });

  const anio = currentSchoolProfile ? currentSchoolProfile.academicYear : '2026';
  XLSX.writeFile(wb, `Matricula_Alumnos_${anio}.xlsx`);
}

function exportarAGoogleDriveModal() {
  alert("☁️ Exportación a Google Drive:\nSe sincronizarán las planillas consolidadas con la carpeta compartida institucional.");
}

function ocultarYLimpiarFormulariosAlta() {
  // Alumnos
  const studentContainer = document.getElementById('studentFormContainer');
  if (studentContainer) {
    studentContainer.classList.add('hidden');
    // Limpiar inputs del formulario de alumnos si contiene un form o elementos de texto
    studentContainer.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
      else el.value = '';
    });
    const labelSala = document.getElementById('labelSalaCalculada');
    if (labelSala) labelSala.textContent = "Seleccione fecha de nacimiento";
  }

  // Personal / Docentes
  const staffContainer = document.getElementById('staffFormContainer');
  if (staffContainer) {
    staffContainer.classList.add('hidden');
    staffContainer.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
      else el.value = '';
    });
    const assignmentsList = document.getElementById('altaAssignmentsListContainer');
    if (assignmentsList) assignmentsList.innerHTML = '';
  }

  // Tutores
  const tutorContainer = document.getElementById('tutorFormContainer');
  if (tutorContainer) {
    tutorContainer.classList.add('hidden');
    tutorContainer.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
      else el.value = '';
    });
  }
}
// ========================================================
// BUSCADOR EN VIVO Y ALTA RÁPIDA DE TUTORES (MATRICULACIÓN)
// ========================================================

function populateTutorSelects() {

}

function mostrarTodosLosTutores(hiddenInputId) {
  filtrarTutoresInput(hiddenInputId, '');
}

function filtrarTutoresInput(hiddenInputId, query) {
  const num = hiddenInputId.replace('studentTutor', '');
  const dropdown = document.getElementById(`resultadosTutor${num}`);
  if (!dropdown) return;

  const textoNormalizado = normalizarTexto(query);

  const filtrados = textToFilter => {
    if (!textoNormalizado) return activeTutors;
    return activeTutors.filter(t => {
      const cadena = normalizarTexto(`${t.firstName} ${t.lastName} ${t.documentNumber}`);
      return cadena.includes(textoNormalizado);
    });
  };

  const lista = filtrados(textoNormalizado);
  let htmlResultados = '';

  if (lista.length > 0) {
    htmlResultados = lista.map(t => `
      <div onclick="seleccionarTutorDesplegado('${hiddenInputId}', '${t.id}', '${t.lastName}, ${t.firstName} (DNI: ${t.documentNumber || '-'})')" 
           class="p-2.5 hover:bg-emerald-50 cursor-pointer font-medium text-slate-700 transition-colors border-b border-slate-50">
        <strong>${t.lastName}, ${t.firstName}</strong> — DNI: ${t.documentNumber || '-'} (${t.relationship || 'Tutor'})
      </div>
    `).join('');
  } else {
    htmlResultados = `<div class="p-2.5 text-slate-400 text-center">No se encontraron tutores.</div>`;
  }

  htmlResultados += `
    <div onclick="abrirModalRapidoTutor('${hiddenInputId}'); document.getElementById('resultadosTutor${num}').classList.add('hidden');" 
         class="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer font-bold flex items-center gap-1.5 transition-colors">
      <span class="material-icons-outlined text-sm">add_circle</span> Crear nuevo tutor ${query ? `"${query}"` : ''}
    </div>
  `;

  dropdown.innerHTML = htmlResultados;
  dropdown.classList.remove('hidden');
}

function seleccionarTutorDesplegado(hiddenInputId, tutorId, textoLegible) {
  document.getElementById(hiddenInputId).value = tutorId;
  const num = hiddenInputId.replace('studentTutor', '');
  const buscadorEl = document.getElementById(`buscadorTutor${num}`);
  if (buscadorEl) buscadorEl.value = textoLegible;

  document.getElementById(`resultadosTutor${num}`)?.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.relative')) {
    document.querySelectorAll('[id^="resultadosTutor"]').forEach(el => el.classList.add('hidden'));
  }
});


async function guardarDatosEscuela(e) {
  e.preventDefault();

  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

  const proposedData = {
    ...currentSchoolProfile,
    name: getVal('edit-school-name'),
    legalName: getVal('edit-school-legalname'),
    district: getVal('edit-school-district'),
    sector: document.getElementById('edit-school-sector')?.value || 'Privado',
    levels: document.getElementById('edit-school-levels')?.value || 'Inicial',
    shifts: getVal('edit-school-shifts'),
    city: getVal('edit-school-city'),
    academicYear: parseInt(document.getElementById('edit-school-cycle')?.value) || 2026,
    cue: getVal('edit-school-cue'),
    dipregep: getVal('edit-school-dipregep'),
    phone: getVal('edit-school-phone'),
    email: getVal('edit-school-email'),
    address: getVal('edit-school-address')
  };

  if (currentSession.role === 'ADMINISTRATIVE') {
    const reason = getVal('edit-school-ticket-reason');
    try {
      const res = await apiFetch('/institution/profile/tickets', {
        method: 'POST',
        body: JSON.stringify({ reason, proposedData })
      });
      if (res.ok) {
        alert("✅ Solicitud enviada exitosamente a Dirección.");
        cerrarModalEdicionEscuela();
      }
    } catch (err) {
      alert("Error al enviar ticket.");
    }
    return;
  }

  try {
    const res = await apiFetch('/institution/profile', {
      method: 'PUT',
      body: JSON.stringify(proposedData)
    });
    if (res.ok) {
      currentSchoolProfile = await res.json();
      renderSchoolProfile();
      cerrarModalEdicionEscuela();
      alert("✅ Datos institucionales actualizados.");
      await fetchSchoolProfile();
    }
  } catch (err) {
    alert("Error al guardar cambios de la escuela.");
  }
}


// ========================================================
// CONTROL DE MENÚ LATERAL: EXPANDIR / OCULTAR FIJO
// ========================================================
function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const mainArea = document.getElementById('mainContentArea');
  if (!sidebar || !mainArea) return;

  // Alternamos si el menú está contraído o expandido
  sidebar.classList.toggle('-translate-x-full');
  sidebar.classList.toggle('w-0');
  sidebar.classList.toggle('p-0');
  
  // Hacemos que el contenido principal ocupe todo el ancho (pl-0) o deje el espacio del menú (pl-64)
  mainArea.classList.toggle('pl-64');
  mainArea.classList.toggle('pl-0');
}
// ========================================================
// MÓDULO: GESTIÓN DE FICHA MÉDICA EN APARTADO Y PERFIL
// ========================================================

let selectedStudentForFicha = null;

function renderFichaMedicaView() {
  actualizarFiltrosFichaMedica();
  filterFichasTable();
}

function actualizarFiltrosFichaMedica() {
  const select = document.getElementById('filterFichaClassroom');
  if (!select || !Array.isArray(currentLevelClassrooms)) return;
  select.innerHTML = '<option value="TODAS">Todas las Secciones</option>' + 
    currentLevelClassrooms.map(c => `<option value="${c}">${c}</option>`).join('');
}

function filterFichasTable() {
  const container = document.getElementById('fichasAlumnosList');
  if (!container) return;

  const filterClass = document.getElementById('filterFichaClassroom')?.value || 'TODAS';
  const rawQuery = document.getElementById('inputFilterFichas')?.value || '';
  const terms = normalizarTexto(rawQuery).split(/\s+/).filter(t => t.length > 0);

  const filtrados = activeStudents.filter(s => {
    if (filterClass !== 'TODAS' && s.classroom !== filterClass) return false;
    if (terms.length === 0) return true;
    const fullStr = normalizarTexto(`${s.firstName} ${s.lastName} ${s.documentNumber}`);
    return terms.every(t => fullStr.includes(t));
  });

  if (filtrados.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 p-4 text-center">No se encontraron alumnos.</p>';
    return;
  }

  container.innerHTML = filtrados.map(s => `
    <div onclick="seleccionarAlumnoFicha('${s.id}')" class="p-3 hover:bg-cyan-50/60 cursor-pointer flex justify-between items-center transition-colors ${selectedStudentForFicha === s.id ? 'bg-cyan-50 border-l-4 border-cyan-600' : ''}">
      <div>
        <h4 class="font-bold text-slate-800 text-xs">${s.lastName || ''}, ${s.firstName || ''}</h4>
        <span class="text-slate-400 text-[11px] block">DNI: ${s.documentNumber || '--'} | ${s.classroom || 'Sin sección'}</span>
      </div>
      <span class="material-icons-outlined text-slate-300 text-sm">chevron_right</span>
    </div>
  `).join('');
}

async function seleccionarAlumnoFicha(studentId) {
  selectedStudentForFicha = studentId;
  const alumno = activeStudents.find(s => s.id === studentId);
  if (!alumno) return;

  document.getElementById('fichaAlumnoNombreHeader').textContent = `${alumno.lastName}, ${alumno.firstName}`;
  document.getElementById('fichaAlumnoInfoSub').textContent = `DNI: ${alumno.documentNumber || '--'} | Sección: ${alumno.classroom || '--'}`;
  document.getElementById('btnGestionarFichaPanel').classList.remove('hidden');

  filterFichasTable();
  await cargarDetalleFichaMedicaPanel(studentId, 'fichaDetallePanelContainer');
}

async function cargarDetalleFichaMedicaPanel(studentId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const res = await apiFetch(`/students/${studentId}/medical-record`);
    if (res.ok) {
      const med = await res.json();
      
      // Botón para crear si no existe
      const btnCrear = document.getElementById('btnPerfilCrearFicha');

      if (!med || !med.id) {
        if (btnCrear) btnCrear.classList.remove('hidden');
        container.innerHTML = `
          <div class="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
            No hay ficha médica registrada para este alumno.
          </div>
        `;
        return;
      }

      if (btnCrear) btnCrear.classList.add('hidden');

      // Recopilamos patologías marcadas para mostrarlas tipo etiqueta
      let patologias = [];
      if (med.asma) patologias.push('Asma');
      if (med.convulsiones) patologias.push('Convulsiones');
      if (med.diabetes) patologias.push('Diabetes');
      if (med.problemasCardiacos) patologias.push('Cardíacos');
      if (med.alergiaGeneral) patologias.push('Alergias');

      const patologiasTexto = patologias.length > 0 ? patologias.join(' • ') : 'Ninguna patología grave declarada';

      // Renderizado idéntico a las tarjetas de tutores/restricciones
      container.innerHTML = `
        <div onclick="abrirCuestionarioMedicoSeleccionado()" class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-cyan-500 transition-all cursor-pointer flex justify-between items-center group">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm">
              <span class="material-icons-outlined text-base">medical_services</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-900 group-hover:text-cyan-700 text-xs uppercase">Declaración Jurada de Salud Vigente</h4>
                <span class="bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Obra Social: ${med.obraSocial}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1">N° Afiliado: ${med.nroAfiliado || 'Sin especificar'} | <strong>Patologías:</strong> ${patologiasTexto}</p>
            </div>
          </div>
          <span class="material-icons-outlined text-slate-400 group-hover:text-cyan-600">chevron_right</span>
        </div>
      `;
    }
  } catch (e) {
    console.error("Error al cargar ficha en perfil:", e);
    container.innerHTML = `<p class="text-xs text-slate-400 p-3">Error al cargar la información médica.</p>`;
  }
}

function abrirCuestionarioMedicoSeleccionado() {
  const studentId = selectedStudentForFicha || currentStudentData?.id;
  if (!studentId) {
    alert("Seleccione un alumno primero.");
    return;
  }
  cargarDatosEnCuestionario(studentId);
}

function abrirCuestionarioMedicoDesdePerfil() {
  if (!currentStudentData?.id) return;
  selectedStudentForFicha = currentStudentData.id;
  cargarDatosEnCuestionario(currentStudentData.id);
}

/// Variable global para controlar el modo del modal médico (declarada arriba de todo)
let isEditingMedicalRecord = false;

async function cargarDatosEnCuestionario(studentId, readOnly = true) {
  isEditingMedicalRecord = !readOnly; 
  const form = document.getElementById('formCuestionarioMedico');
  if (form) form.reset();

  try {
    const res = await apiFetch(`/students/${studentId}/medical-record`);
    if (res.ok) {
      const med = await res.json();
      if (med && med.id) {
        document.getElementById('medObraSocial').value = med.obraSocial || 'NO';
        document.getElementById('medDetalleObra').value = med.detalleObraSocial || '';
        document.getElementById('medNroAfiliado').value = med.nroAfiliado || '';

        // Checkboxes
        const setChk = (id, val) => { const el = document.getElementById(id); if(el) el.checked = !!val; };
        setChk('chkAsma', med.asma);
        setChk('chkAlergiaGeneral', med.alergiaGeneral);
        setChk('chkCardiacos', med.problemasCardiacos);
        setChk('chkDiabetes', med.diabetes);
        setChk('chkPresion', med.presionArterialElevada);
        setChk('chkConvulsiones', med.convulsiones);
        setChk('chkAlteracionesSangre', med.alteracionesSanguineas);
        setChk('chkQuemaduras', med.quemadurasSeveras);
        setChk('chkFaltaOrgano', med.faltaOrgano);
        setChk('chkOnco', med.enfermedadOncohematologica);
        setChk('chkInmuno', med.inmunodeficiencias);
        setChk('chkFracturas', med.fracturasLesiones);
        setChk('chkProblemasHuesos', med.otroProblemaHuesos);
        setChk('chkTrauma', med.traumatismoCraneo);
        setChk('chkPiel', med.problemasPiel);

        setChk('chkDesmayos', med.desmayos);
        setChk('chkDolorPecho', med.dolorPecho);
        setChk('chkMareos', med.mareos);
        setChk('chkCansancio', med.mayorCansancio);
        setChk('chkPalpitaciones', med.palpitaciones);
        setChk('chkDificultadRespirar', med.dificultadRespirar);

        setChk('chkDisminucionAuditiva', med.disminucionAuditiva);
        setChk('chkDisminucionVisual', med.disminucionVisual);
        setChk('chkMedicacionHabitual', med.medicacionHabitual);
        document.getElementById('txtCualMedicacion').value = med.cualMedicacion || '';
      }
    }
  } catch (e) {
    console.error("Error al cargar datos en cuestionario:", e);
  }

  actualizarEstadoFormularioMedico();
  document.getElementById('cuestionarioMedicoModal')?.classList.remove('hidden');
}

async function guardarCuestionarioMedico(e) {
  // 🛑 Prevenimos estrictamente cualquier recarga o redirección por defecto del navegador
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const studentId = selectedStudentForFicha || currentStudentData?.id;
  if (!studentId) {
    alert("No se ha seleccionado ningún alumno.");
    return;
  }

  const payload = {
    obraSocial: document.getElementById('medObraSocial').value,
    detalleObraSocial: document.getElementById('medDetalleObra').value.trim(),
    nroAfiliado: document.getElementById('medNroAfiliado').value.trim(),

    asma: document.getElementById('chkAsma').checked,
    alergiaGeneral: document.getElementById('chkAlergiaGeneral').checked,
    problemasCardiacos: document.getElementById('chkCardiacos').checked,
    diabetes: document.getElementById('chkDiabetes').checked,
    presionArterialElevada: document.getElementById('chkPresion').checked,
    convulsiones: document.getElementById('chkConvulsiones').checked,
    alteracionesSanguineas: document.getElementById('chkAlteracionesSangre').checked,
    quemadurasSeveras: document.getElementById('chkQuemaduras').checked,
    faltaOrgano: document.getElementById('chkFaltaOrgano').checked,
    enfermedadOncohematologica: document.getElementById('chkOnco').checked,
    inmunodeficiencias: document.getElementById('chkInmuno').checked,
    fracturasLesiones: document.getElementById('chkFracturas').checked,
    otroProblemaHuesos: document.getElementById('chkProblemasHuesos').checked,
    traumatismoCraneo: document.getElementById('chkTrauma').checked,
    problemasPiel: document.getElementById('chkPiel').checked,

    desmayos: document.getElementById('chkDesmayos').checked,
    dolorPecho: document.getElementById('chkDolorPecho').checked,
    mareos: document.getElementById('chkMareos').checked,
    mayorCansancio: document.getElementById('chkCansancio').checked,
    palpitaciones: document.getElementById('chkPalpitaciones').checked,
    dificultadRespirar: document.getElementById('chkDificultadRespirar')?.checked || false,

    disminucionAuditiva: document.getElementById('chkDisminucionAuditiva').checked,
    disminucionVisual: document.getElementById('chkDisminucionVisual').checked,
    medicacionHabitual: document.getElementById('chkMedicacionHabitual').checked,
    cualMedicacion: document.getElementById('txtCualMedicacion').value.trim()
  };

  try {
    const res = await apiFetch(`/students/${studentId}/medical-record`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("✅ ¡Ficha médica guardada con éxito!");
      
      // 1. Cerramos el cuestionario y volvemos a poner el flag en modo lectura
      cerrarCuestionarioMedico();
      isEditingMedicalRecord = false;

      // 2. Refrescamos el panel o tarjeta en el lugar exacto donde estás (sin navegar al home)
      if (selectedStudentForFicha) {
        await cargarDetalleFichaMedicaPanel(studentId, 'fichaDetallePanelContainer');
      }
      if (currentStudentData && currentStudentData.id === studentId) {
        await cargarDetalleFichaMedicaPanel(studentId, 'perfilFichaMedicaContainer');
      }
    } else {
      const errText = await res.text();
      alert(`Error al guardar: ${errText}`);
    }
  } catch (error) {
    console.error("Error al guardar ficha:", error);
    alert("Error de conexión al intentar guardar la ficha médica.");
  }

  return false; // Asegura que el evento de submit no propague acciones no deseadas
}

function actualizarEstadoFormularioMedico() {
  const form = document.getElementById('formCuestionarioMedico');
  if (!form) return;

  // Bloquea o desbloquea los inputs según el modo lectura o edición
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.disabled = !isEditingMedicalRecord;
  });

  const footerContainer = form.querySelector('.flex.justify-end');
  if (footerContainer) {
    if (isEditingMedicalRecord) {
      footerContainer.innerHTML = `
        <button type="button" onclick="cancelarEdicionMedica()" class="px-4 py-2 border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
        <button type="submit" class="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-semibold cursor-pointer">Guardar Cambios</button>
      `;
    } else {
      footerContainer.innerHTML = `
        <button type="button" onclick="cerrarCuestionarioMedico()" class="px-4 py-2 border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 cursor-pointer">Cerrar</button>
        <button type="button" onclick="habilitarEdicionMedica()" class="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-semibold cursor-pointer">Editar Ficha</button>
      `;
    }
  }
}

function habilitarEdicionMedica() {
  isEditingMedicalRecord = true;
  actualizarEstadoFormularioMedico();
}

function cancelarEdicionMedica() {
  const studentId = selectedStudentForFicha || currentStudentData?.id;
  if (studentId) {
    cargarDatosEnCuestionario(studentId, true);
  }
}

function cerrarCuestionarioMedico() {
  document.getElementById('cuestionarioMedicoModal')?.classList.add('hidden');
}