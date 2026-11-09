# EduCore — integración funcional Angular / Calendario Update

## Contenido

- `EDUcore_Front-main`: proyecto Angular 21 completo, actualizado sobre el ZIP original.
- `EDUcore_Final-Calendario_branch`: backend Spring Boot original con ajustes de integración.
- Se conserva el código original de módulos que ya funcionaban. No se copia `app.js` del frontend tradicional; los flujos se integran como componentes y servicios Angular.

## Funcionalidades incorporadas

1. **Matrícula**: formulario extendido de identidad, documentación, domicilio, salud básica, escolaridad; creación y edición; alta rápida de tutores; uno o dos tutores enlazados mediante `POST /api/v1/students/{id}/tutors`. La edición reutiliza el mismo formulario y muestra los tutores existentes. En caso de fallo en la segunda petición conserva el ID creado para permitir reintentar sin duplicar el estudiante.
2. **Tutores y personal**: edición y baja de tutores, alumnos vinculados, edición de docentes, asignaciones por materia/aula/turno, portfolio (crear, editar y eliminar), navegación de detalle a edición.
3. **Legajos**: ficha médica oficial con sus campos y casillas, personas autorizadas para retiro con validación de mayoría de edad, edición/baja de autorizados, restricciones judiciales con alta/baja y datos judiciales. Desde la ficha del alumno hay enlaces al registro correspondiente.
4. **Gestión institucional**: solicitudes de cambio del perfil, consulta de tickets pendientes, comparación de datos actual/sugerido para Dirección, aprobación/rechazo.
5. **Aulas y cuotas**: alta/edición/baja de aulas; filtro de alumnos por sala y ciclo para cuotas; consulta y edición de correos institucionales para comprobantes y consultas.
6. **Calendario y comunicados**: alta desde un día específico, detalle de evento, comunicados generales/por aula/privados, editar, eliminar y destacar comunicados, URL adjunta.
7. **Planillas**: exportación a `.xlsx` con hoja general y una por sala, más exportación CSV. El generador Excel OOXML se incluye en TypeScript, sin bibliotecas adicionales.

## Acceso local de prueba — IMPORTANTE

Este backend **NO contiene la API de autenticación real** (`/api/v1/auth/login`, `/auth/my-students`, recuperación, logout, etc.). La siguiente etapa acordada será que al dar de alta un perfil pueda iniciar sesión y acceder a lo permitido por su rol.

Para probar **localmente** los módulos antes de esa etapa, la pantalla de acceso en Angular **solo al usar `ng serve` en modo desarrollo** ofrece un botón *Acceder al entorno de pruebas*. Seleccioná primero una institución existente y elegí un rol de prueba (Dirección, Administración, Preceptoría o Docente).

**Este acceso no valida identidad, no emite JWT y no debe exponerse en producción ni utilizarse con datos reales.** La protección de endpoints del backend actual es insuficiente: tiene `anyRequest().permitAll()` y un filtro de roles simulados a partir de cabeceras. Los controles visuales por rol no sustituyen controles en el servidor. Antes de un despliegue real es obligatorio implementar login, roles, validación de tenant, hashing de contraseñas y protección de los datos personales. En compilación de producción Angular no expone el botón local, pero **esto por sí solo no securiza el backend**.

`/my-students` queda pendiente hasta disponer de autenticación real y vínculos de cuentas de tutores; no se debe simular acceso a datos de menores por correo no verificado. También quedan para esa fase los flujos reales de cambio y recuperación de contraseña.

El alta de personal **no crea todavía una cuenta de acceso**. Se reemplazó la contraseña predecible que contenía la rama del backend por una cadena aleatoria deshabilitada, pero esto **no constituye un mecanismo de autenticación**.

## Requisitos y ejecución

1. Tener Java 21, MySQL y Node.js compatible con Angular 21.
2. Configurar la conexión MySQL del backend en `backend/src/main/resources/application-local.yml`. Verificar la base `educore_sge`, el esquema/tables y contar con **al menos una institución** ya cargada para seleccionar en el acceso.
3. Iniciar backend (requiere Maven / dependencias descargables):

   ```bash
   cd EDUcore_Final-Calendario_branch/backend
   ./mvnw spring-boot:run
   ```

   En Windows: `mvnw.cmd spring-boot:run`.

4. En otra terminal instalar dependencias e iniciar Angular:

   ```bash
   cd EDUcore_Front-main
   npm ci
   npm start
   ```

5. Abrir `http://localhost:4200/`, seleccionar institución y usar el modo de prueba indicado. La API está configurada en los servicios de Angular para `http://localhost:8080`.
6. Para compilar en local: `npm run build`.

Las salas deben configurarse antes de matricular alumnos. La edad se evalúa al 30 de junio del ciclo lectivo; el backend actualizado ahora tiene en cuenta el turno al asignar aula. Para editar un aula ya existente no se permite cambiar de turno, según contrato actual del controlador.

## Verificaciones realizadas

- Se analizaron los **86 archivos TypeScript** del frontend y no se encontraron errores sintácticos.
- Se hizo una verificación de tipos mediante `tsc` y declaraciones de prueba de dependencias Angular/RxJS (sin errores). **No sustituye la compilación real de Angular**.
- Se generó un Excel OOXML de prueba y se comprobó que es un ZIP válido y sus partes XML son legibles.
- No se pudo ejecutar `npm ci` en este entorno porque el registro de npm no estaba accesible (`EAI_AGAIN`), por lo que **no se pudo correr `ng build` ni las pruebas Angular reales**.
- No fue posible levantar la aplicación Spring Boot conectada a una base de datos MySQL durante la preparación del ZIP. No se puede afirmar que las operaciones hayan pasado pruebas de integración ni de extremo a extremo.

## Próxima fase: perfiles y permisos de acceso

Implementar `UserAccount`/credenciales ligadas a perfiles existentes (tutor, staff, dirección), habilitación de cuenta y recuperación segura, roles verificados del lado servidor, autorización de consulta para tutores basada en vínculos reales, aislamiento por institución y flujo de login con JWT/cookies seguros. Solo después de esto habilitar el uso real de perfiles y datos personales.
