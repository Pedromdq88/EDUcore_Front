import { Directive, ElementRef, HostListener, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { NgForm, NgModel } from '@angular/forms';
import { Subscription } from 'rxjs';
@Directive({
  selector: 'input[ngModel], select[ngModel], textarea[ngModel]',
  standalone: true
})
export class FieldValidationDirective implements OnInit, OnDestroy {
  private readonly model = inject(NgModel, {
    self: true
  });
  private readonly form = inject(NgForm, {
    optional: true
  });
  private readonly field = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly subs = new Subscription();
  private errorElement: HTMLElement | null = null;
  private triedSubmit = false;
  private blurred = false;
  ngOnInit(): void {
    if (this.form) {
      this.subs.add(this.form.ngSubmit.subscribe(() => {
        this.triedSubmit = true;
        this.renderError();
      }));
    }
    if (this.model.statusChanges) {
      this.subs.add(this.model.statusChanges.subscribe(() => this.renderError()));
    }
    if (this.model.valueChanges) {
      this.subs.add(this.model.valueChanges.subscribe(() => this.renderError()));
    }
  }
  @HostListener('blur')
  onBlur(): void {
    this.blurred = true;
    this.renderError();
  }
  private renderError(): void {
    const control = this.model.control;
    const show = !!control?.invalid && (this.triedSubmit || (this.blurred && !!control?.dirty));
    if (!show) {
      if (this.errorElement) {
        this.renderer.removeChild(this.errorElement.parentNode, this.errorElement);
        this.errorElement = null;
      }
      this.renderer.removeAttribute(this.field.nativeElement, 'aria-invalid');
      return;
    }
    const errors = control.errors ?? {};
    let message = 'Revisá este dato.';
    if (errors['required'])
      message = 'Este campo es obligatorio.';
    else if (errors['email'])
      message = 'Ingresá un correo electrónico válido.';
    else if (errors['pattern']) {
      const name = this.field.nativeElement.getAttribute('name') || '';
      if (['firstName', 'lastName', 'resFirst', 'resLast', 'pickupName'].includes(name))
        message = 'Ingresá solo letras (se admiten tildes, ñ, espacios y guiones).';
      else if (['documentNumber', 'pickupDni', 'resDni'].includes(name))
        message = 'El DNI debe tener entre 6 y 8 números.';
      else if (name === 'cuil')
        message = 'El CUIL debe tener 11 números.';
      else if (name.toLowerCase().includes('phone') || name === 'phone')
        message = 'El teléfono debe tener entre 6 y 20 números.';
      else
        message = 'El formato ingresado no es válido.';
    }
    else if (errors['minlength'])
      message = `Ingresá al menos ${errors['minlength'].requiredLength} caracteres.`;
    else if (errors['maxlength'])
      message = `No ingreses más de ${errors['maxlength'].requiredLength} caracteres.`;
    else if (errors['min'])
      message = `El valor mínimo es ${errors['min'].min}.`;
    else if (errors['max'])
      message = `El valor máximo es ${errors['max'].max}.`;
    if (!this.errorElement) {
      const span = this.renderer.createElement('small') as HTMLElement;
      this.renderer.addClass(span, 'eco-field-error');
      this.renderer.setAttribute(span, 'role', 'alert');
      const input = this.field.nativeElement;
      const parent = input.parentNode;
      if (!parent)
        return;
      this.renderer.insertBefore(parent, span, input.nextSibling);
      this.errorElement = span;
    }
    this.renderer.setProperty(this.errorElement, 'textContent', message);
    this.renderer.setAttribute(this.field.nativeElement, 'aria-invalid', 'true');
  }
  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.errorElement?.parentNode)
      this.renderer.removeChild(this.errorElement.parentNode, this.errorElement);
  }
}
