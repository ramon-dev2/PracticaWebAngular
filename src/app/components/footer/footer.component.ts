import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  email = '';
  mensaje = '';

  suscribir(): void {
    const saved = JSON.parse(localStorage.getItem('techstore-newsletter') ?? '[]') as string[];
    if (this.email && !saved.includes(this.email)) {
      localStorage.setItem('techstore-newsletter', JSON.stringify([...saved, this.email]));
    }
    this.email = '';
    this.mensaje = 'Correo registrado en newsletter.';
  }
}
