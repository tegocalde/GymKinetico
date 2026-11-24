/* KINÉTICO — datos de demostración (se guardan en localStorage) */
const STORAGE_KEY = 'kinetico.state.v1';

const EXERCISES = [
  { id: 'wall-push',    name: 'Flexiones de pared',          group: 'Pecho y hombros', equipment: 'Peso corporal', gif: 'LEH9jxP.gif', tip: 'Torso recto, sin arquear la zona lumbar.' },
  { id: 'push-up',      name: 'Flexiones de pecho',          group: 'Pecho y hombros', equipment: 'Peso corporal', gif: 'I4hDWkc.gif', tip: 'Baja hasta cerca del suelo y empuja sin bloquear los codos.' },
  { id: 'glute-bridge', name: 'Puente de glúteos',           group: 'Glúteos',        equipment: 'Peso corporal', gif: 'u0cNiij.gif', tip: 'Eleva la cadera apretando glúteos, sin arquear la lumbar.' },
  { id: 'pelvic-tilt',  name: 'Inclinación pélvica',         group: 'Core y lumbar',  equipment: 'Peso corporal', gif: 'D9qe7CM.gif', tip: 'Apoya la lumbar en el suelo antes de subir.' },
  { id: 'hip-abduct',   name: 'Abducción lateral de cadera', group: 'Glúteos',        equipment: 'Peso corporal', gif: 'WL4EmxJ.gif', tip: 'Controla el movimiento; no dejes caer la pierna.' },
  { id: 'walk-lunge',   name: 'Zancadas caminando',          group: 'Piernas',        equipment: 'Peso corporal', gif: 'IZVHb27.gif', tip: 'Rodilla alineada con el tobillo, sin girar el torso.' },
  { id: 'calf-raise',   name: 'Elevación de gemelos',        group: 'Piernas',        equipment: 'Peso corporal', gif: 'bJYHBIN.gif', tip: 'Sube sobre la punta de los pies y baja despacio.' },
  { id: 'calf-stretch', name: 'Estiramiento de gemelos',     group: 'Movilidad',      equipment: 'Pared',          gif: 'm0tCHqc.gif', tip: 'Talón apoyado; inclina el torso sin doblar la rodilla.' },
  { id: 'chest-stretch',name: 'Estiramiento pectoral',       group: 'Movilidad',      equipment: 'Peso corporal', gif: 'Uto7l43.gif', tip: 'Abre el pecho sin elevar los hombros.' },
  { id: 'knee-mobility',name: 'Movilidad de rodilla',        group: 'Movilidad',      equipment: 'Peso corporal', gif: 'X7jbxra.gif', tip: 'Movimiento lento y controlado, sin dolor.' },
  { id: 'plank',        name: 'Plancha isométrica',          group: 'Core',           equipment: 'Peso corporal', gif: 'hCjGsRQ.gif', tip: 'Codos bajo los hombros y glúteos apretados.' },
  { id: 'piriformis',   name: 'Estiramiento del piriforme',  group: 'Movilidad',      equipment: 'Peso corporal', gif: 'QY39eBr.gif', tip: 'Cruza la pierna y acércala al pecho suavemente.' }
];

function ymd(date) {
  const d = date instanceof Date ? date : new Date(date + 'T12:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(dateInput, n) {
  const d = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function todayYMD() { return ymd(new Date()); }

function seedState() {
  const t = todayYMD();
  return {
    users: [
      { id: 'u-admin', role: 'admin', name: 'Dr. Andrés Reyes', email: 'admin@kinetico.do', password: 'demo1234', phone: '+1 809 555 0142', avatar: 'AR', title: 'Terapeuta deportivo', clinic: 'KINÉTICO · Santo Domingo' },
      { id: 'u-maria', role: 'client', name: 'María Fernández', email: 'cliente@kinetico.do', loginEmail: 'cliente@kinetico.do', password: 'demo1234', phone: '+1 829 555 0188', avatar: 'MF', diagnosis: 'Tendinopatía rotuliana', sport: 'Running', since: addDays(t, -46) },
      { id: 'u-carlos', role: 'client', name: 'Carlos Sánchez', email: 'carlos@example.do', password: 'demo1234', phone: '+1 809 555 0134', avatar: 'CS', diagnosis: 'Esguince de tobillo grado II', sport: 'Fútbol', since: addDays(t, -20) },
      { id: 'u-lucia', role: 'client', name: 'Lucía Heredia', email: 'lucia@example.do', password: 'demo1234', phone: '+1 829 555 0176', avatar: 'LH', diagnosis: 'Dolor lumbar mecánico', sport: 'CrossFit', since: addDays(t, -61) },
      { id: 'u-jose', role: 'client', name: 'José Castillo', email: 'jose@example.do', password: 'demo1234', phone: '+1 809 555 0191', avatar: 'JC', diagnosis: 'Recuperación post-op de hombro', sport: 'Natación', since: addDays(t, -12) }
    ],
    routines: [
      {
        id: 'r-maria', clientId: 'u-maria', title: 'Vuelta al running · Fase 1',
        startDate: addDays(t, -5), days: 21, status: 'activa', createdAt: addDays(t, -5),
        notes: 'Movilidad antes de correr. Si aparece dolor por encima de 3/10, detén el ejercicio y avísame.',
        completedDays: [addDays(t, -5), addDays(t, -4), addDays(t, -3), addDays(t, -2), addDays(t, -1)],
        items: [
          { exerciseId: 'knee-mobility', sets: 2, reps: 12, note: 'Lento, sin salto.' },
          { exerciseId: 'glute-bridge', sets: 3, reps: 15, note: 'Pausa 1 s arriba.' },
          { exerciseId: 'hip-abduct', sets: 3, reps: 12, note: 'Cadera estable.' },
          { exerciseId: 'walk-lunge', sets: 3, reps: 10, note: 'Passo corto al inicio.' },
          { exerciseId: 'calf-raise', sets: 3, reps: 15, note: '' },
          { exerciseId: 'chest-stretch', sets: 2, reps: 30, note: '30 segundos por lado.' }
        ]
      },
      {
        id: 'r-carlos', clientId: 'u-carlos', title: 'Estabilización de tobillo',
        startDate: addDays(t, -2), days: 14, status: 'activa', createdAt: addDays(t, -2),
        notes: 'Trabaja descalzo. Alterna con hielo 10 min después de la sesión.',
        completedDays: [addDays(t, -2)],
        items: [
          { exerciseId: 'calf-raise', sets: 3, reps: 20, note: '' },
          { exerciseId: 'hip-abduct', sets: 3, reps: 12, note: '' },
          { exerciseId: 'plank', sets: 3, reps: 30, note: '30 segundos.' },
          { exerciseId: 'calf-stretch', sets: 2, reps: 30, note: '30 segundos por pierna.' }
        ]
      },
      {
        id: 'r-lucia', clientId: 'u-lucia', title: 'Core y lumbar sin dolor',
        startDate: addDays(t, -8), days: 28, status: 'activa', createdAt: addDays(t, -8),
        notes: 'Respira durante el esfuerzo. Nunca fuerces el rango de movimiento.',
        completedDays: [addDays(t, -8), addDays(t, -7), addDays(t, -6), addDays(t, -5), addDays(t, -4), addDays(t, -3)],
        items: [
          { exerciseId: 'pelvic-tilt', sets: 3, reps: 12, note: '' },
          { exerciseId: 'glute-bridge', sets: 3, reps: 12, note: '' },
          { exerciseId: 'plank', sets: 3, reps: 25, note: '25 segundos.' },
          { exerciseId: 'piriformis', sets: 2, reps: 30, note: '30 segundos por lado.' }
        ]
      },
      {
        id: 'r-jose', clientId: 'u-jose', title: 'Movilidad de hombro',
        startDate: addDays(t, 2), days: 30, status: 'programada', createdAt: t,
        notes: 'Comienza el lunes. Movimientos por debajo del hombro, sin dolor.',
        completedDays: [],
        items: [
          { exerciseId: 'chest-stretch', sets: 2, reps: 30, note: '' },
          { exerciseId: 'wall-push', sets: 3, reps: 10, note: '' },
          { exerciseId: 'pelvic-tilt', sets: 2, reps: 12, note: '' }
        ]
      }
    ],
    messages: [],
    session: null
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (!parsed.users || !parsed.routines) return seedState();
    return parsed;
  } catch (err) {
    console.warn('No se pudo leer el estado guardado, se reinicia la demo.', err);
    return seedState();
  }
}
