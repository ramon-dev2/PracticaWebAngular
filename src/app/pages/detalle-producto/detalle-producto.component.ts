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
  templateUrl: './detalle-producto.component.html',
  styleUrl: './detalle-producto.component.css'
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
