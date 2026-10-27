# EduCore Angular — Diseño del frontend original adaptado

Proyecto adaptado a partir de los dos archivos que se compartieron:
`EDUcore_Front.zip` (frontend clásico) y `EduCore_Angular_CORREGIDO_COMPLETO (1).zip` (Angular 21).

## Instalación

1. Hacé una copia del Angular que tenías.
2. Descomprimí el ZIP completo y abrí **la carpeta `EducoreFront`**, que contiene `package.json`, en VS Code.
3. Abrí una terminal en esa carpeta y ejecutá:
   ```powershell
   npm install
   npm start
   ```
4. Abrí `http://localhost:4200`.
5. Para obtener datos y utilizar el login, iniciá también el backend Spring Boot en `http://localhost:8080`.

## Cambios visuales

- Interfaz del EduCore antiguo: Roboto, iconos Material Outlined, verdes esmeralda y grises pizarra, encabezado fijo, menú lateral fijo y móvil, tarjetas, tablas, formularios, fichas, alertas y diseño adaptable.
- Login rediseñado visualmente como el original, sin contraseña precargada.
- Dashboard de métricas con banner y accesos rápidos.
- Menú lateral con las secciones del frontend original.
- Nuevas páginas Angular: catálogo de materias, comunicados, planilla general exportable en CSV, calendario escolar mensual, calendario de aulas semanal/mensual, consultas de ficha médica/retiros/restricciones, y espacio de tutor.
- Conservados y estandarizados los componentes Angular anteriores: alumnos, tutores, personal, escuela, cuotas y aulas.
- No se incluyó el `app.js` antiguo en Angular: se usan Angular components, Router y services.

## Importante: funcionalidad y límites

- La versión Angular proporcionada originalmente **no tenía** todas las funciones ni campos avanzados del frontend clásico. Esta migración recupera el estilo y crea vistas para los módulos principales, pero **no es una traducción 1:1 de los 4.000+ renglones de JavaScript original**.
- Las pantallas de ficha médica, retiros y restricciones se implementaron como **consulta** enlazada al legajo del alumno. Las operaciones de alta/edición complejas del viejo frontend no están migradas aún.
- La planilla general implementa filtros y exportación **CSV compatible con Excel**, no todas las características de Handsontable/SheetJS del original.
- Calendarios: funcionan sobre los endpoints existentes (`/api/v1/calendar/events`, `/api/v1/class-schedules` y `/api/v1/classrooms-config`) si el backend los implementa. Incluyen cambio de vista, filtros y CRUD básico. No todas las excepciones escolares están implementadas.
- El nuevo login intenta `POST /api/v1/auth/login`, que devuelve `{token,email,role,institutionId}`. Recuperación/cambio de contraseña utilizan las rutas `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password` y `/api/v1/auth/change-password`. Necesitás el backend JWT compatible, una base de datos configurada y Gmail para enviar correos. Si el backend no está levantado, las consultas fallarán.
- JWT y rol se comprueban en el **backend** para seguridad; ocultar botones no implementa autorización. Revisá la protección de todos los endpoints antes de publicar.
- El guard frontend comprueba la presencia del token (sin validar criptográficamente), y cada petición protegida envía `Authorization: Bearer` y `X-Institution-Id`.
- Algunas páginas existentes de Angular tenían poca funcionalidad o contenido provisional; esto no reemplaza la integración completa con el backend.

## Comprobaciones efectuadas

- Se verificaron todos los archivos `.ts` mediante el parser de TypeScript: sin errores de sintaxis.
- Se verificó la existencia de plantillas, estilos y las rutas nuevas; no se detectaron IDs HTML duplicados.
- **No se logró ejecutar `ng build` aquí** porque no se pudieron terminar de instalar las dependencias de npm. Comprobá `npm install` y `npm start` en tu máquina antes de usar la aplicación; si la compilación muestra un error, corregilo antes de publicar.

## Qué archivos reemplazar

La opción más simple es abrir el **ZIP completo** como proyecto nuevo, en lugar de copiar archivos sueltos. Si querés conservar tu proyecto Angular actual, utilizá el ZIP `SOLO_CAMBIOS` y reemplazá los archivos en las mismas rutas; ese ZIP incluye nuevos componentes en `src/app/pages` y el logo de `public`.
