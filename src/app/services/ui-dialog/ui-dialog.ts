import { Injectable, signal } from '@angular/core';

export interface DialogRequest {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  critical: boolean;
  onlyInfo: boolean;
}

/** Diálogo institucional único; no cierra haciendo clic fuera. */
@Injectable({ providedIn: 'root' })
export class UiDialogService {
  readonly current = signal<DialogRequest | null>(null);
  private settle: ((accepted: boolean) => void) | null = null;

  confirm(message: string, title = 'Confirmar acción', critical = true, confirmText = 'Confirmar'): Promise<boolean> {
    if (this.settle) return Promise.resolve(false); // Evita abrir dos diálogos simultáneos.
    return new Promise(resolve => {
      this.settle = resolve;
      this.current.set({ title, message, confirmText, cancelText: 'Cancelar', critical, onlyInfo: false });
    });
  }

  notify(message: string, title = 'Aviso de EduCore'): Promise<void> {
    if (this.settle) return Promise.resolve();
    return new Promise(resolve => {
      this.settle = () => resolve();
      this.current.set({ title, message, confirmText: 'Entendido', cancelText: '', critical: false, onlyInfo: true });
    });
  }

  answer(value: boolean): void {
    const done = this.settle;
    this.settle = null;
    this.current.set(null);
    done?.(value);
  }
}
