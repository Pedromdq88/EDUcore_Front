# EDUcore — Entrega actualizada: Director real + matrícula + salas + edición

## Qué cambió respecto del paquete anterior

- **Sin modo prueba**: se quitó de Angular el acceso simulado y se eliminó el filtro `MockAuthFilter` del backend. Ya no se aceptan roles enviados mediante `X-User-Role` para identificarse.
- **Usuario Director real**, persistido en MySQL (`auth_users`), con contraseña BCrypt y rol `DIRECTOR`. El endpoint `POST /api/v1/auth/login` emite un token de sesión opaco, aleatorio y revocable. Las sesiones se guardan como hash SHA-256 (`auth_sessions`), caducan a las 8 horas, admiten `logout` y `change-password`.
- **Permisos del lado del servidor**: rutas privadas autenticadas y validación de `@PreAuthorize`; la cabecera `X-Institution-Id` de las solicitudes debe corresponder con la institución del token. Solo se aprovisiona el rol DIRECTOR ahora; las cuentas del resto de perfiles son trabajo futuro.
- **Agregar tutor desde matrícula** en **ventana modal emergente**. Después de crearlo queda seleccionado como responsable.
- **Calculadora de aula**: el navegador solicita al backend las aulas guardadas para institución + edad al **30 de junio** + ciclo lectivo + turno. La vista presenta edad y mensaje, y permite elegir **cualquiera de las alternativas compatibles** desde un desplegable.
- **Backend valida la elección de aula** también al dar de alta o editar. No permite matricular si no hay un aula configurada que corresponda. El HTTP 400 devuelve un mensaje legible.
- **Editar alumno, tutor y docente**: los formularios esperan la respuesta de la base de datos y llenan los campos actuales. Si no se puede recuperar la ficha, no permiten guardar un formulario vacío.
- **Backend Maven Wrapper**: se agregó `.mvn/wrapper/maven-wrapper.properties`, faltante en los ZIP anteriores.

## Requisitos

- Java 21; MySQL disponible (ajustar `backend/src/main/resources/application-local.yml` para el usuario/clave de **tu base**, si difiere).
- Node.js compatible con Angular 21, npm e internet para instalar paquetes la primera vez.
- Maven 3.9 o el `mvnw.cmd` incluido. **Extraé el ZIP en una carpeta nueva** y no mezcles `target/` ni `dist/` de builds anteriores.

## 1. Crear el Director — Windows PowerShell (solo la primera vez)

Abrí PowerShell en la carpeta `EDUcore_Final-Calendario_branch/backend` y ejecutá:

```powershell
powershell -ExecutionPolicy Bypass -File .\CREAR_DIRECTOR_E_INICIAR.ps1
```

El asistente solicita: correo del Director, **contraseña nueva de 12 caracteres o más**, nombre de escuela (solo si la base aún no tiene instituciones) y, opcionalmente, UUID de la institución (si existe más de una). La contraseña se introduce de forma oculta y **no se graba en el ZIP ni en un archivo de configuración**. El proceso inicia Spring Boot y, si no hay ya una cuenta con ese correo para esa institución, la crea en MySQL.

**Importante:** Si la cuenta ya existe, el asistente no reemplaza su contraseña. Usá la que estableciste al crearla. Podés cambiarla luego desde el icono de candado dentro del sistema.

En futuros arranques podés iniciar normalmente el backend, sin variables de director:

```powershell
.\mvnw.cmd clean spring-boot:run
```

Si hay varias instituciones, hay que definir `EDUCORE_DIRECTOR_TENANT_ID` en el asistente; debe corresponder al ID de la escuela a la que tendrá acceso el Director.

### Alternativa usando variables de entorno

```powershell
$env:EDUCORE_DIRECTOR_EMAIL = "direccion@tuinstitucion.edu.ar"
$env:EDUCORE_DIRECTOR_PASSWORD = Read-Host "Contraseña (12+ caracteres)" -AsSecureString | ForEach-Object { [System.Net.NetworkCredential]::new('', $_).Password }
$env:EDUCORE_BOOTSTRAP_SCHOOL_NAME = "Mi Escuela"
.\mvnw.cmd clean spring-boot:run
```

En entornos compartidos, borrá esas variables después de inicializar; no dejes la contraseña en scripts, capturas ni archivos versionados. El asistente recomendado de arriba realiza la limpieza al terminar.

## 2. Iniciar Angular

En otra terminal, dentro de `EDUcore_Front-main`:

```powershell
npm ci
npm start
```

Abrí **http://localhost:4200**, seleccioná la institución y escribí el **mismo correo y contraseña** que ingresaste al crear el Director. No hay acceso sin contraseña ni roles de prueba.

## 3. Probar el flujo completo

1. En **Gestor de Aulas y Turnos**, verificá que existan salas guardadas en la BD con edad mínima correspondiente y turno `MANANA`/`TARDE`. Si faltan, cargalas primero.
2. En **Alumnos → Nueva matrícula**, elegí fecha de nacimiento, ciclo y turno; el recuadro de la calculadora muestra la edad y las aulas disponibles desde MySQL.
3. Si hay varias aulas para la misma edad y turno, elegí otra en el desplegable.
4. Pulsá **Agregar tutor**: aparecerá el modal. Guardalo para dejarlo seleccionado.
5. Matriculá al alumno. Se guarda y después se vinculan los tutores mediante `POST /api/v1/students/{studentId}/tutors`.
6. Desde su ficha pulsá **Editar**: los datos existentes se cargan antes de habilitar el formulario.
7. Usá el candado del encabezado para cambiar la contraseña. Cerrará las sesiones del usuario.

## Diagnóstico de los errores que aparecían

- **HTTP 404**: asegurate de ejecutar este **backend actualizado**, no uno anterior. Verificá `http://localhost:8080/actuator/health` y `http://localhost:8080/api/v1/public/institutions`. El nuevo backend incorpora `POST /api/v1/auth/login` y `GET /api/v1/students/classroom-options`.
- **HTTP 401**: el login requiere usuario, contraseña, institución y token de sesión vigente para las APIs privadas.
- **HTTP 400 al guardar alumno**: ahora indica si faltan aulas, si la edad/turno no coincide o si la selección ya no es válida. Una sala de edad 3 no es apta para un alumno que tiene edad 4 al corte; la calculadora y el backend aplican la misma regla.
- **HTTP 404 en edición de alumno**: el registro no existe o no pertenece a la institución de la sesión. El formulario no permite sobreescribir datos en blanco.
- **Error conectando a MySQL**: comprobá que el servicio de MySQL está encendido y que `application-local.yml` coincide con tu instalación.

## Contratos de la API nueva

- `POST /api/v1/auth/login` — JSON `{"institutionId":"...","email":"...","password":"..."}`. Retorna `{token,email,role,institutionId,expiresAt}`.
- `GET /api/v1/auth/me` — Bearer + `X-Institution-Id`.
- `POST /api/v1/auth/logout` y `POST /api/v1/auth/change-password` — Bearer + `X-Institution-Id`.
- `GET /api/v1/students/classroom-options?birthDate=2023-05-12&academicYear=2026&shift=MANANA` — Bearer + `X-Institution-Id`, retorna `{ageAtCutoff,cutoffDate,options,message}`.
- `POST /api/v1/students` y `PUT /api/v1/students/{id}` — reciben `classroom` como nombre de una opción habilitada; el servidor valida.

## Base de datos y migraciones

En perfil `local`, `spring.jpa.hibernate.ddl-auto=update` crea automáticamente `auth_users` y `auth_sessions` si el usuario de MySQL tiene permisos de DDL. La migración SQL `V2__auth_users_and_sessions.sql` está incluida para instalaciones que administran el esquema con Flyway. **Hacé copia de seguridad antes de probar sobre datos reales.**

## Estado de validación

- Verificación estática de sintaxis/tipos TypeScript realizada con declaraciones Angular/RxJS de comprobación; **sin errores**.
- Revisión de correspondencia de endpoints y fuentes, prueba unitaria Java añadida para la calculadora (se ejecuta al correr tests con Maven).
- **No se pudo compilar Angular con sus paquetes reales ni levantar Spring Boot junto con MySQL en este entorno**: aquí no se dispone de los paquetes npm/Maven necesarios ni de tu BD. La ejecución real en tu PC y las pruebas E2E quedan pendientes; no se afirma funcionamiento total verificado.

## Próxima etapa

Alta de cuentas para **tutores, docentes, preceptores y administrativos**, vinculadas a cada perfil y con permisos de menú y servidor verificados. Ahora solo se aprovisiona un Director real.
