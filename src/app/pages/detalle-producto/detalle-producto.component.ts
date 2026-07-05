import { AsyncPipe, CurrencyPipe, DatePipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { Producto } from '../../models/producto';
import { CarritoService } from '../../services/carrito.service';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-detalle-producto',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, NgIf, RouterLink],
  template: `
    <main>
      <section class="product-detail" *ngIf="producto$ | async as producto; else noEncontrado">
        <img [src]="producto.imagen" [alt]="producto.nombre">
        <article>
          <p class="white">{{ producto.categoria }}</p>
          <h1>{{ producto.nombre }}</h1>
          <p>{{ producto.descripcion }}</p>
          <p class="price">{{ producto.precio | currency:'COP':'symbol-narrow':'1.0-0':'es-CO' }}</p>
          <p>Stock disponible: {{ producto.stock }}</p>
          <p>Actualizado: {{ hoy | date:'mediumDate' }}</p>
          <button type="button" (click)="agregar(producto)">Agregar al carrito</button>
          <a class="btn button-secondary" routerLink="/productos">Volver al catalogo</a>
        </article>
      </section>
      <ng-template #noEncontrado>
        <section class="empty-state">
          <h1>Producto no encontrado</h1>
          <a routerLink="/productos">Ver catalogo</a>
        </section>
      </ng-template>
    </main>
  `
})
export class DetalleProductoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productos = inject(ProductoService);
  private readonly carrito = inject(CarritoService);
  protected readonly hoy = new Date();
  protected readonly producto$ = this.route.paramMap.pipe(switchMap((params) => this.productos.obtenerProducto(params.get('id') ?? '')));

  agregar(producto: Producto): void {
    this.carrito.agregar(producto);
  }
}
