import { NgFor } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-category-menu',
  standalone: true,
  imports: [NgFor],
  templateUrl: './category-menu.component.html',
  styleUrl: './category-menu.component.css'
})
export class CategoryMenuComponent {
  @Output() readonly seleccion = new EventEmitter<string>();
  readonly categorias = [
    { value: '', label: 'Todas' },
    { value: 'smartphones', label: 'Smartphones' },
    { value: 'laptops', label: 'Laptops' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'hogar', label: 'Hogar inteligente' }
  ];
}
