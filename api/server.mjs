import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function jsonResponse(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        req.destroy();
        reject(new Error('Payload demasiado grande.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });
    req.on('error', reject);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildInvoiceHtml(order) {
  const items = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.producto.nombre)}</td>
          <td align="center">${item.cantidad}</td>
          <td align="right">${formatCurrency(item.producto.precio)}</td>
          <td align="right">${formatCurrency(item.subtotal)}</td>
        </tr>`
    )
    .join('');

  return `
    <h1>Factura TechStore ${escapeHtml(order.id)}</h1>
    <p>Hola ${escapeHtml(order.cliente.nombre)}, gracias por tu compra.</p>
    <p><strong>Fecha:</strong> ${new Date(order.fecha).toLocaleString('es-CO')}</p>
    <p><strong>Direccion de entrega:</strong> ${escapeHtml(order.cliente.direccion)}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px">
      <thead>
        <tr>
          <th align="left">Producto</th>
          <th>Cantidad</th>
          <th align="right">Precio</th>
          <th align="right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
      <tfoot>
        <tr><th colspan="3" align="right">Subtotal</th><td align="right">${formatCurrency(order.subtotal)}</td></tr>
        <tr><th colspan="3" align="right">Impuestos</th><td align="right">${formatCurrency(order.impuestos)}</td></tr>
        <tr><th colspan="3" align="right">Total</th><td align="right"><strong>${formatCurrency(order.total)}</strong></td></tr>
      </tfoot>
    </table>
  `;
}

function validateOrder(order) {
  return Boolean(
    order?.id &&
      order?.fecha &&
      order?.cliente?.nombre &&
      order?.cliente?.email &&
      order?.cliente?.direccion &&
      Array.isArray(order?.items)
  );
}

async function sendBrevoInvoice(order) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? 'TechStore';

  if (!apiKey || !senderEmail) {
    throw new Error('Configura BREVO_API_KEY y BREVO_SENDER_EMAIL antes de enviar correos.');
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName
      },
      to: [
        {
          email: order.cliente.email,
          name: order.cliente.nombre
        }
      ],
      subject: `Factura TechStore ${order.id}`,
      htmlContent: buildInvoiceHtml(order)
    })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message ?? `Brevo respondio con estado ${response.status}.`);
  }

  return body;
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    jsonResponse(res, 204, {});
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/enviar-factura') {
    jsonResponse(res, 404, { message: 'Ruta no encontrada.' });
    return;
  }

  try {
    const { orden } = await readJson(req);

    if (!validateOrder(orden)) {
      jsonResponse(res, 400, { message: 'La orden no tiene los datos requeridos.' });
      return;
    }

    const brevo = await sendBrevoInvoice(orden);
    jsonResponse(res, 201, {
      ordenId: orden.id,
      destinatario: orden.cliente.email,
      messageId: brevo.messageId,
      enviadaEn: new Date().toISOString()
    });
  } catch (error) {
    jsonResponse(res, 500, {
      message: error instanceof Error ? error.message : 'No fue posible enviar la factura.'
    });
  }
});

server.listen(PORT, () => {
  console.log(`API TechStore escuchando en http://localhost:${PORT}`);
});
