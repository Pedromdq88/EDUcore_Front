import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';

/** Revela errores en el primer intento y lleva el foco al primer campo inválido. */
@Directive({ selector: 'form[appValidateSubmit]', standalone: true })
export class ValidateSubmitDirective implements OnInit, OnDestroy {
  private readonly form = inject(NgForm, { self: true });
  private readonly host = inject<ElementRef<HTMLFormElement>>(ElementRef);
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.form.ngSubmit.subscribe(() => {
      if (!this.form.invalid) return;
      this.form.control.markAllAsTouched();
      // Aguardar el refresco del estado antes de enfocar el control afectado.
      setTimeout(() => {
        const first = this.host.nativeElement.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          'input.ng-invalid:not([disabled]), select.ng-invalid:not([disabled]), textarea.ng-invalid:not([disabled])'
        );
        first?.focus();
      }, 0);
    });
  }

  ngOnDestroy(): void { this.subscription?.unsubscribe(); }
}
