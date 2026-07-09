import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';

loadEnvFile();

const PORT = Number(process.env.PORT ?? 3000);

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

function escapeHeader(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function loadEnvFile() {
  if (!existsSync('.env')) {
    return;
  }

  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [rawKey, ...valueParts] = trimmed.split('=');
    const key = rawKey.trim();
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
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

function buildEmailMessage(order, senderEmail, senderName) {
  const from = `"${escapeHeader(senderName)}" <${escapeHeader(senderEmail)}>`;
  const to = `"${escapeHeader(order.cliente.nombre)}" <${escapeHeader(order.cliente.email)}>`;
  const subject = `Factura TechStore ${escapeHeader(order.id)}`;
  const html = buildInvoiceHtml(order);

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html
  ]
    .join('\r\n')
    .replace(/\r?\n\./g, '\r\n..');
}

function waitForSocket(socket, event) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off(event, onEvent);
      socket.off('error', onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    socket.once(event, onEvent);
    socket.once('error', onError);
  });
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines.at(-1);

      if (lastLine && /^\d{3} /.test(lastLine)) {
        cleanup();
        resolve({
          code: Number(lastLine.slice(0, 3)),
          message: buffer.trim()
        });
      }
    };

    socket.on('data', onData);
    socket.once('error', onError);
  });
}

function setSmtpTimeout(socket) {
  socket.setTimeout(15_000, () => {
    socket.destroy(new Error('Tiempo de espera agotado conectando con el servidor SMTP.'));
  });
}

async function smtpCommand(socket, command, expectedCodes) {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  const expected = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];

  if (!expected.includes(response.code)) {
    throw new Error(`SMTP respondio ${response.code}: ${response.message}`);
  }

  return response;
}

async function sendSmtpEmail({ host, port, user, pass, fromEmail, fromName, toEmail, message }) {
  let socket = net.connect(port, host);
  socket.setEncoding('utf8');
  setSmtpTimeout(socket);

  const greeting = readSmtpResponse(socket);
  await waitForSocket(socket, 'connect');
  await greeting;
  await smtpCommand(socket, 'EHLO techstore.local', 250);
  await smtpCommand(socket, 'STARTTLS', 220);

  socket = tls.connect({ socket, servername: host });
  socket.setEncoding('utf8');
  setSmtpTimeout(socket);

  await waitForSocket(socket, 'secureConnect');
  await smtpCommand(socket, 'EHLO techstore.local', 250);
  await smtpCommand(socket, `AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString('base64')}`, 235);
  await smtpCommand(socket, `MAIL FROM:<${fromEmail}>`, 250);
  await smtpCommand(socket, `RCPT TO:<${toEmail}>`, [250, 251]);
  await smtpCommand(socket, 'DATA', 354);

  socket.write(`${message}\r\n.\r\n`);
  const response = await readSmtpResponse(socket);

  if (response.code !== 250) {
    throw new Error(`SMTP respondio ${response.code}: ${response.message}`);
  }

  await smtpCommand(socket, 'QUIT', 221).catch(() => undefined);
  socket.end();

  return response;
}

function buildBrevoPayload(order, senderEmail, senderName) {
  return {
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
  };
}

function buildItemsText(order) {
  return order.items
    .map((item) => {
      const name = item.producto.nombre;
      const quantity = item.cantidad;
      const subtotal = formatCurrency(item.subtotal);

      return `${name} x${quantity} - ${subtotal}`;
    })
    .join('\n');
}

function buildEmailJsTemplateParams(order, senderName) {
  return {
    to_email: order.cliente.email,
    to_name: order.cliente.nombre,
    from_name: senderName,
    order_id: order.id,
    order_date: new Date(order.fecha).toLocaleString('es-CO'),
    delivery_address: order.cliente.direccion,
    items_text: buildItemsText(order),
    subtotal: formatCurrency(order.subtotal),
    taxes: formatCurrency(order.impuestos),
    total: formatCurrency(order.total),
    invoice_html: buildInvoiceHtml(order)
  };
}

async function sendEmailJsInvoice(order) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  const senderName = process.env.EMAILJS_SENDER_NAME ?? 'TechStore';

  if (!serviceId && !templateId && !publicKey) {
    return undefined;
  }

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Configura EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID y EMAILJS_PUBLIC_KEY para enviar con EmailJS.');
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: buildEmailJsTemplateParams(order, senderName)
  };

  if (privateKey) {
    payload.accessToken = privateKey;
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`EmailJS respondio ${response.status}${responseText ? `: ${responseText}` : ''}`);
  }

  return { messageId: responseText || 'OK' };
}

async function sendBrevoApiEmail({ apiKey, senderEmail, senderName, order }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(buildBrevoPayload(order, senderEmail, senderName))
  });

  const responseText = await response.text();
  let body = {};

  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = { message: responseText };
    }
  }

  if (!response.ok) {
    const detail = body.message ? `: ${body.message}` : '';
    throw new Error(`Brevo respondio ${response.status}${detail}`);
  }

  return body;
}

async function sendInvoiceEmail(order) {
  const provider = (process.env.EMAIL_PROVIDER ?? 'emailjs').toLowerCase();

  if (provider === 'emailjs') {
    const emailJs = await sendEmailJsInvoice(order);

    if (!emailJs) {
      throw new Error('Configura EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID y EMAILJS_PUBLIC_KEY para enviar con EmailJS.');
    }

    return emailJs;
  }

  const emailJs = await sendEmailJsInvoice(order);

  if (emailJs) {
    return emailJs;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const host = process.env.SMTP_HOST ?? 'smtp-relay.brevo.com';
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? process.env.SMTP_SENDER_EMAIL ?? user;
  const senderName = process.env.BREVO_SENDER_NAME ?? process.env.SMTP_SENDER_NAME ?? 'TechStore';

  if (!senderEmail) {
    throw new Error('Configura BREVO_SENDER_EMAIL antes de enviar correos.');
  }

  if (apiKey) {
    const response = await sendBrevoApiEmail({
      apiKey,
      senderEmail,
      senderName,
      order
    });

    return { messageId: response.messageId };
  }

  if (!user || !pass) {
    throw new Error('Configura BREVO_API_KEY y BREVO_SENDER_EMAIL, o SMTP_USER, SMTP_PASS y SMTP_SENDER_EMAIL.');
  }

  const response = await sendSmtpEmail({
    host,
    port,
    user,
    pass,
    fromEmail: senderEmail,
    fromName: senderName,
    toEmail: order.cliente.email,
    message: buildEmailMessage(order, senderEmail, senderName)
  });

  return { messageId: response.message };
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

  if (req.method === 'OPTIONS') {
    jsonResponse(res, 204, {});
    return;
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'POST' || pathname.replace(/\/$/, '') !== '/api/enviar-factura') {
    jsonResponse(res, 404, { message: 'Ruta no encontrada.' });
    return;
  }

  try {
    const { orden } = await readJson(req);

    if (!validateOrder(orden)) {
      jsonResponse(res, 400, { message: 'La orden no tiene los datos requeridos.' });
      return;
    }

    const email = await sendInvoiceEmail(orden);
    jsonResponse(res, 201, {
      ordenId: orden.id,
      destinatario: orden.cliente.email,
      messageId: email.messageId,
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
