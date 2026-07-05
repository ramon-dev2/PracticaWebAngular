import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.css'
})
export class ContactoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  mensaje = '';
  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mensaje: ['', [Validators.required, Validators.minLength(10)]],
    satisfaccion: [7]
  });

  enviar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const saved = JSON.parse(localStorage.getItem('techstore-contact-requests') ?? '[]') as unknown[];
    localStorage.setItem('techstore-contact-requests', JSON.stringify([...saved, { ...this.form.getRawValue(), createdAt: new Date().toISOString() }]));
    this.form.reset({ nombre: '', email: '', mensaje: '', satisfaccion: 7 });
    this.mensaje = 'Solicitud guardada localmente.';
  }

  loginDemo(): void {
    this.auth.login('demo@techstore.com');
    this.mensaje = 'Sesion demo iniciada.';
  }
}
