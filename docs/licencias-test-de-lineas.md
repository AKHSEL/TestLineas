# Licencias del Test de Líneas

El propietario administra las licencias en `/owner` con una cuenta de Supabase Auth incluida en `public.license_owners`. Los profesionales usan `/doctor`; su cuenta no puede leer ni modificar las licencias de otros usuarios.

## Activación inicial

Después de aplicar `supabase/migrations/20261025000000_test_licenses.sql`, habilitar una cuenta existente del propietario desde una sesión administrativa de Supabase:

```sql
insert into public.license_owners (user_id)
select id from auth.users where email = 'CORREO_DEL_PROPIETARIO'
on conflict (user_id) do nothing;
```

No agregar ese permiso desde el cliente web. La migración conserva activas, sin fecha de vencimiento, las cuentas que ya existían. Las cuentas nuevas requieren que el propietario guarde una licencia desde `/owner`.

## Comportamiento

- `valid_until` es el último día de uso, en horario de Perú. En blanco significa sin vencimiento.
- Una licencia suspendida, vencida o ausente activa el modo solo lectura: impide crear enlaces, registrar o editar pacientes, importar escaneos y crear o modificar evaluaciones. Los enlaces disponibles dejan de abrir el test.
- Los pacientes, evaluaciones e informes anteriores permanecen disponibles para consulta. La exportación de historiales e informes continúa habilitada.
- Los cambios de estado y fecha quedan registrados en `license_events`.
- El vencimiento de cada enlace (24 horas) sigue siendo independiente de la licencia.

La validación de escritura se realiza mediante triggers y políticas de almacenamiento en la base de datos. Los controles de edición también desaparecen de la interfaz al vencer la licencia.

## Reversión

Si hay que desactivar temporalmente el bloqueo sin borrar licencias ni historial, deshabilitar los triggers `license_required_for_links`, `license_required_for_evaluations`, `license_required_for_patient_writes`, `license_required_for_link_updates` y `license_required_for_evaluation_updates`; retirar las dos políticas restrictivas de `storage.objects`; y restaurar la definición anterior de `get_evaluation_session` de la migración previa. Volver a habilitar las protecciones después de resolver el incidente. No borrar las tablas para una reversión operativa.
