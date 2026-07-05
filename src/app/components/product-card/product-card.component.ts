import { CurrencyPipe, NgClass, NgStyle, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../models/producto';
import { DescuentoPipe } from '../../pipes/descuento.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe, DescuentoPipe, NgClass, NgStyle, RouterLink, UpperCasePipe],
  template: `
    <article [ngClass]="{ 'low-stock': producto.stock <= 5 }" [ngStyle]="{ borderColor: producto.destacado ? '#d7e7ff' : '#e3e8ef' }">
      <a [routerLink]="['/producto', producto.id]">
        <img [src]="producto.imagen" [alt]="producto.nombre" width="320" height="220">
      </a>
      <p class="white">{{ producto.marca | uppercase }}</p>
      <h3><a [routerLink]="['/producto', producto.id]">{{ producto.nombre }}</a></h3>
      <p>{{ producto.descripcion }}</p>
      <p class="price">{{ producto.precio | descuento:10 | currency:'COP':'symbol-narrow':'1.0-0':'es-CO' }}</p>
      <p class="rating" [attr.aria-label]="'Calificacion ' + producto.rating + ' de 5'">
        {{ estrellas }} <span>({{ producto.reviews }})</span>
      </p>
      <button type="button" (click)="agregado.emit(producto)">Agregar al carrito</button>
    </article>
  `
})
export class ProductCardComponent {
  @Input({ required: true }) producto!: Producto;
  @Output() readonly agregado = new EventEmitter<Producto>();

  get estrellas(): string {
    return '*'.repeat(Math.round(this.producto.rating));
  }
}
