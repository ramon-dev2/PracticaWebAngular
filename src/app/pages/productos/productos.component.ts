import { AsyncPipe, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { CategoryMenuComponent } from '../../components/category-menu/category-menu.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { Producto } from '../../models/producto';
import { CarritoService } from '../../services/carrito.service';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [AsyncPipe, CategoryMenuComponent, FormsModule, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, ProductCardComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly carrito = inject(CarritoService);
  private readonly route = inject(ActivatedRoute);

  busqueda = '';
  categoria = '';
  marca = '';
  precioMax?: number;
  productos$!: Observable<Producto[]>;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.busqueda = params.get('q') ?? '';
      this.categoria = params.get('categoria') ?? '';
      this.filtrar();
    });
  }

  filtrar(): void {
    this.productos$ = this.productoService.buscarProducto(this.busqueda, this.categoria, this.marca, this.precioMax);
  }

  agregar(producto: Producto): void {
    this.carrito.agregar(producto);
  }
}
