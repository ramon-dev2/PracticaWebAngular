import { AsyncPipe, CurrencyPipe, NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Producto } from '../../models/producto';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, NgFor, ReactiveFormsModule],
  templateUrl: './admin.component.html'
})
export class AdminComponent {
  protected readonly productoService = inject(ProductoService);
  private readonly fb = inject(FormBuilder);
  protected readonly productos$ = this.productoService.obtenerProductos();
  private editandoId = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(1)]],
    stock: [1, [Validators.required, Validators.min(0)]],
    categoria: ['accesorios' as Producto['categoria'], Validators.required]
  });

  editar(producto: Producto): void {
    this.editandoId = producto.id;
    this.form.patchValue({
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock,
      categoria: producto.categoria
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    this.productoService.guardar({
      id: this.editandoId || value.nombre.toLowerCase().replaceAll(' ', '-'),
      nombre: value.nombre,
      categoria: value.categoria,
      marca: 'TechStore',
      precio: value.precio,
      stock: value.stock,
      rating: 4.5,
      reviews: 0,
      imagen: 'assets/img/prod-accesorio-2.jpg',
      descripcion: 'Producto gestionado desde el panel administrativo.',
      destacado: false
    });
    this.editandoId = '';
    this.form.reset({ nombre: '', precio: 0, stock: 1, categoria: 'accesorios' });
  }
}
