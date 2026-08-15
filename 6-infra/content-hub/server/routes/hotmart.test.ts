import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHotmartSale } from './hotmart.js';

test('DTO financeiro não envia PII do comprador', () => {
  const result = sanitizeHotmartSale({
    transactionId: 'fixture',
    productName: 'Produto',
    productId: 1,
    buyerName: 'Pessoa Teste',
    buyerEmail: 'buyer@example.test',
    price: 100,
    priceBRL: 100,
    netPrice: 90,
    hotmartFee: 10,
    currency: 'BRL',
    status: 'APPROVED',
    paymentMethod: 'PIX',
    purchaseDate: '2026-07-10T12:00:00.000Z',
  });
  assert.equal('buyerName' in result, false);
  assert.equal('buyerEmail' in result, false);
});
