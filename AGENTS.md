# KINÉTICO — memoria del proyecto (léeme primero)

Este archivo resume **todo** lo necesario para retomar el trabajo sin leer los ~1.600 líneas del código.
Ruta: `/Users/edwardvasquez/Desktop/gpt/terapia-deportiva/`

---

## 1. Qué es

Aplicación web **demo local** de terapia deportiva para clientes en República Dominicana (español, `es-DO`).
Dos roles: **terapeuta/admin** (gestiona clientes y asigna rutinas) y **cliente** (ve su plan, marca días y ejercicios).
Todo corre en el navegador con `file://`, sin servidor ni backend. El estado se guarda en `localStorage`.

**Abrir:** `open -a "Google Chrome" /Users/edwardvasquez/Desktop/gpt/terapia-deportiva/index.html`

**Accesos demo:** terapeuta `admin@kinetico.do` · cliente `cliente@kinetico.do` · contraseña `demo1234`.
También hay botones de acceso rápido en el login.

> ⚠️ No es autenticación real: contraseñas y datos viven en `localStorage`. Para producción hace falta backend, BD y auth real.

---

## 2. Mapa de archivos

| Archivo | Líneas | Contenido |
|---|---|---|
| `index.html` | 213 | Shell: pantalla de login, `#appShell` (sidebar + topbar + `#viewRoot`), 3 `<dialog>` (`routineDialog`, `exerciseDialog`, `messageDialog`), `#toast`. CSS/JS con `?v=3` para evadir caché. |
| `styles.css` | 320 | Tokens, reset, login, shell, campos, anillo SVG, diálogos, responsive general. |
| `views.css` | 271 | Vistas admin/cliente, tarjetas, tablas, gráficas, calendario, constructor de rutinas, motion. |
| `data.js` | 107 | `EXERCISES` (12), `STORAGE_KEY`, helpers de fecha (`ymd`, `addDays`, `todayYMD`), `seedState()`, `loadState()`. |
| `app.js` | 668 | Estado, auth, navegación, render de vistas, constructor de rutinas, eventos, acciones. |
| `assets/gifs/` | 12 GIF | Demostraciones 180×180; fuente `mohamedatef90/exercise-library` (MIT), descargadas localmente. |

---

## 3. Arquitectura y flujo

1. `data.js` define datos semilla; `app.js` hace `let S = loadState()`.
2. Si `S.session` existe, entra directo con `showApp()`; si no, muestra login.
3. `attemptLogin()` busca por `email`/`loginEmail` + `password`, guarda `S.session` y llama `showApp()`.
4. `navigate(id)` usa el mapa `NAV[role]` → `VIEWS[id]()` para inyectar HTML en `#viewRoot`. Envuelve el cambio en `document.startViewTransition` si existe.
5. Toda interacción va por **delegación global** en `document`: `data-action` → `handleAction()`, `data-nav`, `data-close-dialog`, inputs `#login*`, `#clientSearch`, `#librarySearchView`, `#librarySearch`, `#routine*`.
6. `saveState()` persiste en `localStorage` tras cada cambio.

### Vistas
- Admin: `dashboard` (métricas, graficas, asignaciones), `clients` (buscador + tarjetas), `routines` (tabla + CRUD), `library` (grid de GIFs).
- Cliente: `today` (plan del día), `progress` (calendario/mensual + racha), `therapist` (contacto + mensaje).

### Acciones `data-action` existentes
`nav`, `new-routine`, `assign`, `edit-routine`, `delete-routine`, `preview-exercise`, `zoom-exercise`,
`add-exercise`, `remove-exercise`, `move-up`, `move-down`, `toggle-day`, `toggle-exercise`, `open-message`.

---

## 4. Modelo de datos (`localStorage['kinetico.state.v1']`)

```js
{
  users: [{ id, role:'admin'|'client', name, email, loginEmail?, password,
            phone, avatar, title?, clinic?, diagnosis?, sport?, since? }],
  routines: [{
    id, clientId, title, startDate:'YYYY-MM-DD', days:1..90, status:'activa'|'programada',
    createdAt, notes,
    items: [{ exerciseId, sets, reps, note, order }],   // order define la secuencia
    completedDays: ['YYYY-MM-DD', ...],
    dayChecks: { 'YYYY-MM-DD': [exerciseId, ...] }
  }],
  messages: [{ from, to, text, date }],
  session: userId | null
}
```

**Usuarios semilla:** `u-admin` (Dr. Andrés Reyes), `u-maria` (demo cliente, tendinopatía rotuliana),
`u-carlos`, `u-lucia`, `u-jose`. Todos usan `demo1234`.

**Rutinas semilla** (fechas relativas al día de creación):
- `r-maria`: "Vuelta al running · Fase 1", inicio hoy−5, 21 días, 5 días completados, 6 ejercicios.
- `r-carlos`: 14 días desde hoy−2 · `r-lucia`: 28 días desde hoy−8 · `r-jose`: 30 días desde hoy+2 (`programada`).

**Ejercicios (`EXERCISES`):** ids `wall-push`, `push-up`, `glute-bridge`, `pelvic-tilt`, `hip-abduct`,
`walk-lunge`, `calf-raise`, `calf-stretch`, `chest-stretch`, `knee-mobility`, `plank`, `piriformis`.
Cada uno tiene `{ id, name (es), group, equipment, gif, tip }`. La ruta del GIF se arma con `gifSrc(ex)`.

### Lógica importante
- `activeRoutineFor(clientId)`: prioriza activa vigente hoy; si no, última activa.
- `routineProgress(r)`: `done = completedDays.length`, `percent = done/days`, `streak` cuenta hacia atrás desde hoy (o ayer si hoy no está marcado).
- `toggle-day`: marca/desmarca un día y rellena/vacía `dayChecks[fecha]` con todos los ejercicios.
- `toggle-exercise`: marca el ejercicio en `dayChecks[hoy]`; si todos quedan marcados, agrega hoy a `completedDays`.
- Días futuros: botón deshabilitado. Días pasados sin marcar: `day-chip--missed`.
- `saveRoutine()`: valida cliente/título/fecha/≥1 ejercicio; normaliza `order` según el orden actual de `builderItems`; `status='programada'` si `startDate > hoy`.

---

## 5. Diseño y decisiones técnicas

- Paleta: fondo `#090e13`, superficies `#131d26`, acento **lima** `#c7fb56`, menta `#4ce3b2`, coral `#ff8a66`, violeta `#a994ff`.
- Fuentes: `Plus Jakarta Sans` (cuerpo) + `Space Grotesk` (display), vía Google Fonts con fallback del sistema.
- Layout: grid/flex con `minmax()`, `aspect-ratio`, propiedades lógicas, `clamp()`. Mobile: sidebar deslizable con `#navScrim`.
- **Anillo de progreso**: `<progress>` nativo visualmente oculto pero accesible (`aria-label` + `aria-valuetext`), y dibujo real en SVG (`r=66`, circunferencia `414.69`):
  `stroke-dashoffset = 414.69 * (1 - pct/100)` calculado por `ringOffset(pct)`. El número es `<text>` SVG (sin cajas ni fondos).
- **Zoom de GIFs**: las miniaturas de la rutina son `<button data-action="zoom-exercise">` con `data-id/order/sets/reps/note`; abren `#exerciseDialog` con el GIF a 340px. La biblioteca usa `preview-exercise`.
- Diálogos nativos con `showModal()` y `closedby="any"`; `dialog:modal` y `::backdrop` con `overscroll-behavior: contain`.
- Login: `autocomplete="username"/"current-password"`, `type="email"`, `spellcheck="false"`, validación diferida con `:user-invalid` + `data-touched` y mensajes de error vinculados vía `aria-describedby`.
- Imágenes below-fold con `loading="lazy"`, `decoding="async"`, `width/height` y `aspect-ratio` para evitar CLS.
- Animaciones solo `opacity`/`transform` dentro de `@media (prefers-reduced-motion: no-preference)`; reveal con `animation-timeline: view()` bajo `@supports`.

---

## 6. Historial de correcciones recientes

1. El porcentaje del anillo parecía un recuadro: el shorthand `background` sobrescribía `background-clip: border-area`. Se intentó con `mask-image` y finalmente se sustituyó el centro por texto SVG (no existe tal recuadro).
2. Las imágenes de la rutina no ampliaban: se convirtieron en botones y se reutilizó `#exerciseDialog` con GIF grande y metadatos.
3. Búsquedas de clientes/biblioteca: se actualiza solo el contenedor (`#clientsGrid`, `#libraryGrid`) para no perder el foco del input.

---

## 7. Recetas rápidas

- **Agregar ejercicio**: añadir objeto a `EXERCISES` en `data.js` y poner el GIF en `assets/gifs/<gif>`.
- **Cambiar colores**: editar tokens en `:root` de `styles.css` (`--lime`, `--mint`, `--coral`, etc.).
- **Cambiar duración máxima**: `max="90"` en `#routineDays` (index.html) y `Math.min(90, ...)` en `saveRoutine()` (app.js).
- **Resetear demo**: en consola `localStorage.removeItem('kinetico.state.v1'); location.reload();`.
- **Verificar sintaxis**: `node --check app.js && node --check data.js`.
- **Probar render sin login**: copiar `index.html` a `_test.html`, inyectar un script que haga clic en `[data-demo=client]` y usar Chrome headless con `--dump-dom`; borrar `_test.html` después.

---

## 8. Limitaciones conocidas

- Sin backend: los datos son por navegador, no se comparten entre dispositivos.
- Contraseñas en texto plano dentro de `localStorage` (solo demo).
- Los GIFs son de 180×180; ampliados a 340px se ven algo suaves.
- `clientQuery` se comparte entre la vista de clientes y la tabla de rutinas (limpiar al nav si molesta).
- Los archivos llevan `?v=3`; si se editan, subir el número para forzar recarga en `file://`.
