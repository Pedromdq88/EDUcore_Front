import { NgForm } from '@angular/forms';
export function canDiscardForm(form?: NgForm | null): boolean {
  return !form?.dirty;
}
