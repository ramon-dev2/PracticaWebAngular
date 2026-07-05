import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ItemCarrito } from '../../models/carrito';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, FormsModule, NgFor, NgIf, RouterLink],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.css'
})
export class CarritoComponent {
  protected readonly carrito = inject(CarritoService);
  protected readonly items$ = this.carrito.items$;
  protected readonly total$ = this.carrito.total$;

  cantidad(item: ItemCarrito, value: number): void {
    this.carrito.cambiarCantidad(item.producto.id, Number(value));
  }
}
