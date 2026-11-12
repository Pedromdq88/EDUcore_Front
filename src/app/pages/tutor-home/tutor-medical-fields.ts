export interface MedicalDisplayField {
  key: string;
  label: string;
  value: string;
}

export interface MedicalDisplaySection {
  title: string;
  fields: MedicalDisplayField[];
}

const textFields = [
  {key: 'obraSocial', label: 'Obra social'},
  {key: 'detalleObraSocial', label: 'Detalle de obra social'},
  {key: 'nroAfiliado', label: 'Número de afiliado'},
  {key: 'detalleInternacion', label: 'Detalle de internación'},
  {key: 'motivoOperacion', label: 'Motivo de operación'},
  {key: 'anioOperacion', label: 'Año de operación'},
  {key: 'cualMedicacion', label: 'Medicación habitual y dosis'}
];

const medicalGroups = [
  {title: 'Antecedentes médicos', fields: [
    ['asma', 'Asma'], ['alergiaGeneral', 'Alergias'],
    ['problemasCardiacos', 'Problemas cardíacos'], ['diabetes', 'Diabetes'],
    ['presionArterialElevada', 'Presión arterial elevada'], ['convulsiones', 'Convulsiones'],
    ['alteracionesSanguineas', 'Alteraciones sanguíneas'], ['quemadurasSeveras', 'Quemaduras severas'],
    ['faltaOrgano', 'Falta de órgano'], ['enfermedadOncohematologica', 'Enfermedad oncohematológica'],
    ['inmunodeficiencias', 'Inmunodeficiencias'], ['fracturasLesiones', 'Fracturas o lesiones'],
    ['otroProblemaHuesos', 'Otros problemas óseos'], ['traumatismoCraneo', 'Traumatismo craneal'],
    ['problemasPiel', 'Problemas de piel']
  ]},
  {title: 'Síntomas', fields: [
    ['desmayos', 'Desmayos'], ['dolorPecho', 'Dolor en el pecho'],
    ['mareos', 'Mareos'], ['mayorCansancio', 'Cansancio excesivo'],
    ['palpitaciones', 'Palpitaciones'], ['dificultadRespirar', 'Dificultad al respirar']
  ]},
  {title: 'Internaciones y operaciones', fields: [
    ['internacionSalaComun', 'Internación en sala común'],
    ['internacionTerapia', 'Internación en terapia'], ['operacion', 'Operación']
  ]},
  {title: 'Alergias e internaciones asociadas', fields: [
    ['alergiaMedicamentos', 'Alergia a medicamentos'], ['internacionMed', 'Internación por medicamentos'],
    ['alergiaVacunas', 'Alergia a vacunas'], ['internacionVac', 'Internación por vacunas'],
    ['alergiaAlimentos', 'Alergia a alimentos'], ['internacionAlim', 'Internación por alimentos'],
    ['alergiaInsectos', 'Alergia a insectos'], ['internacionIns', 'Internación por insectos'],
    ['alergiaEstacionales', 'Alergia estacional'], ['internacionEst', 'Internación por alergia estacional'],
    ['alergiaOtras', 'Otras alergias'], ['internacionOtr', 'Internación por otras alergias']
  ]},
  {title: 'Salud sensorial y medicación', fields: [
    ['disminucionAuditiva', 'Disminución auditiva'], ['usaAudifonos', 'Usa audífonos'],
    ['disminucionVisual', 'Disminución visual'], ['usaLentes', 'Usa lentes'],
    ['medicacionHabitual', 'Medicación habitual']
  ]},
  {title: 'Antecedentes familiares', fields: [
    ['muerteSubitaFamiliar', 'Muerte súbita familiar'], ['diabetesFamiliar', 'Diabetes familiar'],
    ['problemasCardiacosFamiliar', 'Problemas cardíacos familiares'],
    ['tosCronicaFamiliar', 'Tos crónica familiar'], ['celiaquiaFamiliar', 'Celiaquía familiar']
  ]}
];

const excludedFields = new Set(['id', 'studentId', 'tenantId', 'createdAt', 'updatedAt']);

function displayValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value === null || value === undefined || String(value).trim() === '') return 'Sin especificar';
  const text = String(value).trim();
  if (text.toUpperCase() === 'SI' || text.toUpperCase() === 'SÍ') return 'Sí';
  if (text.toUpperCase() === 'NO') return 'No';
  return text;
}

function isRelevant(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const text = String(value).trim().toUpperCase();
  return !['', 'NO', 'FALSE', '0', 'N/A', 'NINGUNO', 'NINGUNA', 'SIN ESPECIFICAR'].includes(text);
}

export function getMedicalSections(data: Record<string, unknown> | null): MedicalDisplaySection[] {
  if (!data?.['id']) return [];

  const known = new Set<string>([...excludedFields]);
  const sections: MedicalDisplaySection[] = [{
    title: 'Cobertura y datos complementarios',
    fields: textFields.map(field => {
      known.add(field.key);
      return {...field, value: displayValue(data[field.key])};
    })
  }];

  for (const group of medicalGroups) {
    sections.push({
      title: group.title,
      fields: group.fields.map(([key, label]) => {
        known.add(key);
        return {key, label, value: displayValue(data[key])};
      })
    });
  }

  const extra = Object.entries(data)
    .filter(([key]) => !known.has(key))
    .map(([key, value]) => ({
      key,
      label: key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()),
      value: displayValue(value)
    }));

  if (extra.length) sections.push({title: 'Otros datos registrados', fields: extra});
  return sections;
}

export function getMedicalHighlights(data: Record<string, unknown> | null): MedicalDisplayField[] {
  if (!data?.['id']) return [];
  return getMedicalSections(data)
    .flatMap(section => section.fields)
    .filter(field => isRelevant(data[field.key]));
}
