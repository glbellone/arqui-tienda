import express from 'express';
import { randomUUID } from 'node:crypto';

interface Charge {
  id: string;
  status: 'approved' | 'declined';
  amount: number;
  currency: string;
  reference: string;
}

// Cobros ya procesados, por Idempotency-Key. En memoria: alcanza para simular.
const procesados = new Map<string, { firma: string; charge: Charge }>();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/v1/charges', (req, res) => {
  const key = req.header('Idempotency-Key');
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header is required' });

  const { amount, currency, reference } = req.body ?? {};
  if (typeof amount !== 'number' || amount <= 0 || typeof currency !== 'string' || typeof reference !== 'string') {
    return res.status(400).json({ error: 'amount, currency and reference are required' });
  }

  const firma = JSON.stringify({ amount, currency, reference });
  const previo = procesados.get(key);
  if (previo) {
    // Mismo pedido reintentado: se devuelve el mismo cobro, no se cobra de nuevo.
    if (previo.firma === firma) return res.status(200).json(previo.charge);
    return res.status(409).json({ error: 'Idempotency-Key already used with a different request' });
  }

  // Regla de la simulación: montos mayores a 1.000.000 se rechazan, para poder probar ese caso.
  const charge: Charge = {
    id: `ch_${randomUUID()}`,
    status: amount > 1_000_000 ? 'declined' : 'approved',
    amount,
    currency,
    reference,
  };
  procesados.set(key, { firma, charge });
  res.status(201).json(charge);
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Pasarela mock escuchando en el puerto ${port}`));
