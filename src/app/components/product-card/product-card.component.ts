import { CurrencyPipe, NgClass, NgStyle, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../models/producto';
import { DescuentoPipe } from '../../pipes/descuento.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe, DescuentoPipe, NgClass, NgStyle, RouterLink, UpperCasePipe],
  templateUrl: './product-card.component.html'
})
export class ProductCardComponent {
  @Input({ required: true }) producto!: Producto;
  @Output() readonly agregado = new EventEmitter<Producto>();

  get estrellas(): string {
    return '*'.repeat(Math.round(this.producto.rating));
  }
}
