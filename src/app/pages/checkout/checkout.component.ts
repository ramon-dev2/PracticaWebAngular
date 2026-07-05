import { AsyncPipe, CurrencyPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, map, take } from 'rxjs';
import { Orden } from '../../models/orden';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { FacturaEmailService } from '../../services/factura-email.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly carrito = inject(CarritoService);
  private readonly auth = inject(AuthService);
  private readonly facturaEmail = inject(FacturaEmailService);
  mensaje = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    direccion: ['', [Validators.required, Validators.minLength(8)]],
    tarjeta: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]]
  });

  protected readonly resumen$ = this.carrito.total$.pipe(
    map((subtotal) => ({ subtotal, impuestos: subtotal * 0.19, total: subtotal * 1.19 }))
  );

  campoInvalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  generarOrden(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.auth.login(this.form.controls.email.value);
    combineLatest([this.carrito.items$, this.resumen$])
      .pipe(take(1))
      .subscribe(([items, resumen]) => {
        const orden: Orden = {
          id: `TS-${Date.now()}`,
          fecha: new Date().toISOString(),
          cliente: {
            nombre: this.form.controls.nombre.value,
            email: this.form.controls.email.value,
            direccion: this.form.controls.direccion.value
          },
          items,
          ...resumen
        };
        const factura = this.facturaEmail.enviarFactura(orden);
        localStorage.setItem('techstore-last-order', JSON.stringify(orden));
        localStorage.setItem('techstore-order-history', JSON.stringify([orden]));
        this.carrito.vaciar();
        this.mensaje = `Orden ${orden.id} generada correctamente. Factura enviada a ${factura.destinatario}.`;
      });
  }
}
