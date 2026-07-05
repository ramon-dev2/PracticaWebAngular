import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { ApiProducto, Producto } from '../../models/producto';
import { CarritoService } from '../../services/carrito.service';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, NgFor, NgIf, ProductCardComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  private readonly productos = inject(ProductoService);
  private readonly carrito = inject(CarritoService);
  protected readonly destacados$ = this.productos.obtenerProductos().pipe(map((items) => items.filter((producto) => producto.destacado)));
  protected readonly recomendaciones$ = this.productos.recomendacionesApi();

  agregar(producto: Producto): void {
    this.carrito.agregar(producto);
  }
}
