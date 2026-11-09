# EDUcore V5 — ajustes de cuotas, ficha médica, perfiles y selector de tutores

Esta entrega se construyó sobre **EDUcore Angular V4 Fix TeacherForm** y **EDUcore Backend V4**. El archivo ZIP completo incluye ambos proyectos con su estructura original.

## Cambios aplicados

1. **Cuotas:** el componente espera a tener tanto el ciclo lectivo activo como los alumnos antes de permitir entrar al estado de cuenta. El estudiante seleccionado y el indicador de carga ahora dependen de señales Angular. Al abrir un alumno se consulta su cronograma inmediatamente, y se muestran 11 casilleros de carga mientras llega la respuesta; luego se muestran los estados pagado (verde), pendiente/vencido (rojo) o inactivo (gris), **sin usar Editar pagos**. Las peticiones antiguas no pisan la selección actual.
2. **Ficha médica:** al seleccionar un alumno sin ficha registrada se muestra «Crear ficha médica». Abre una ventana emergente con todos los campos y casillas del formulario anterior. Si ya tiene ficha, se ve una consulta organizada por categorías con «Editar ficha» para abrir el mismo modal. Cancelar no modifica los datos ya guardados.
3. **Tutores en matrícula:** los dos desplegables nativos se reemplazaron por selectores con un buscador **dentro del panel** que filtra por nombre, apellido y DNI. Se evita elegir el mismo tutor dos veces. Se conserva el alta de tutor mediante modal.
4. **Perfiles:** estilos más claros con encabezado destacado, tarjetas por secciones, enlaces de perfiles vinculados y botones «Ver perfil» visibles en listas de alumnos, tutores y personal.
5. **Alumnos de un tutor:** el backend añade `GET /api/v1/tutors/{id}/students` para recuperar sus alumnos directamente desde la relación existente `student_tutors`, sin recorrer todos los legajos desde el navegador. Una cuenta `TUTOR` solo puede consultar su propio vínculo.
6. **Autorizados:** se eliminó la pantalla independiente «Usuarios autorizados» y su enlace de navegación. Se **conserva** `Control de Retiros`, que se refiere a las autorizaciones de retirar alumnos. No se elimina la tabla `auth_users` ni la autenticación.
7. **Alta de usuarios:** en el backend V4 ya existía la creación transaccional de cuentas al registrar tutores (`tutors` + `auth_users`) y personal (`institution_staff` + `auth_users`). Esta V5 **conserva** ese comportamiento y la desactivación de cuentas y sesiones cuando alguien es dado de baja. Para nuevas cuentas con correo y DNI válidos, la clave temporal es el DNI normalizado, se almacena con BCrypt y se exige cambiarla en el primer acceso.

## Base de datos

**No hay una migración nueva para esta entrega.** El endpoint nuevo usa la tabla original `student_tutors` y el método existente `StudentJpaRepository.findByTenantIdAndTutor`. Mantené tu esquema V4 y las migraciones previas; **no ejecutes un schema desde cero** y no borres datos.

## Instalación

1. Hacé copia de seguridad de la base y de las carpetas actuales de Angular/Spring Boot.
2. Extraé los proyectos del ZIP completo en una **carpeta nueva**. No mezcles archivos de V3 con los de V5.
3. Usá el backend y frontend del mismo paquete (V5). Conservá tu propia configuración `application-local.yml` de conexión a MySQL si la modificaste en tu computadora.
4. Iniciá Spring Boot y Angular como los venías iniciando.
5. Ingresá con una cuenta activa y probá en orden: Cuotas → un alumno, Ficha médica → alumno sin ficha, Matrícula → selector de tutores, Tutores → Ver perfil.

## Verificación y limitaciones

- Se comprobó la sintaxis de 89 archivos TypeScript, la estructura de apertura/cierre HTML de 32 plantillas y la integridad de los ZIP.
- **No** se pudo ejecutar `ng build` porque el registro de npm no estaba accesible para instalar dependencias Angular, ni levantar el backend contra tu MySQL (Maven/dependencias no disponibles). La compilación y las pruebas integradas deben realizarse en tu equipo.
- Si una petición devuelve 401, 403, 400 o 500, mirá el cuerpo de la respuesta en Network y el `Caused by:` de Spring Boot; un cambio visual no sustituye el diagnóstico de la API.
- Por seguridad, las autorizaciones para **retirar a un menor** siguen separadas de los **permisos para iniciar sesión**.
