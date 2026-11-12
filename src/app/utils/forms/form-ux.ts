import { NgForm } from '@angular/forms';

/**
 * Compatibilidad con formularios anteriores. No muestra diálogos nativos del
 * navegador: los componentes usan UiDialogService.confirm() para preguntar.
 * Si algún consumidor legado no ha migrado, NO descarta cambios silenciosamente.
 */
export function canDiscardForm(form?: NgForm | null): boolean {
  return !form?.dirty;
}
