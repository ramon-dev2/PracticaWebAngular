import { Injectable } from '@angular/core';
import { Orden } from '../models/orden';

export interface FacturaEmail {
  ordenId: string;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  enviadaEn: string;
}

const STORAGE_KEY = 'techstore-sent-invoices';

@Injectable({ providedIn: 'root' })
export class FacturaEmailService {
  enviarFactura(orden: Orden): FacturaEmail {
    const email: FacturaEmail = {
      ordenId: orden.id,
      destinatario: orden.cliente.email,
      asunto: `Factura TechStore ${orden.id}`,
      cuerpo: this.crearCuerpoFactura(orden),
      enviadaEn: new Date().toISOString()
    };

    const enviados = this.cargarEnviados();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([email, ...enviados]));

    return email;
  }

  private crearCuerpoFactura(orden: Orden): string {
    const productos = orden.items
      .map(
        (item) =>
          `- ${item.producto.nombre} x${item.cantidad}: ${this.formatearMoneda(item.subtotal)}`
      )
      .join('\n');

    return [
      `Factura: ${orden.id}`,
      `Fecha: ${new Date(orden.fecha).toLocaleString('es-CO')}`,
      `Cliente: ${orden.cliente.nombre}`,
      `Direccion: ${orden.cliente.direccion}`,
      '',
      'Productos:',
      productos,
      '',
      `Subtotal: ${this.formatearMoneda(orden.subtotal)}`,
      `Impuestos: ${this.formatearMoneda(orden.impuestos)}`,
      `Total: ${this.formatearMoneda(orden.total)}`
    ].join('\n');
  }

  private cargarEnviados(): FacturaEmail[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as FacturaEmail[];
    } catch {
      return [];
    }
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valor);
  }
}
