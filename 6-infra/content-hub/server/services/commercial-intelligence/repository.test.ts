import assert from 'node:assert/strict';
import test from 'node:test';
import type { HotmartEventRecord, HotmartTransactionRecord } from './contracts.js';
import { InMemoryCommercialIntelligenceRepository, mergeHotmartTransaction } from './repository.js';

function transaction(overrides: Partial<HotmartTransactionRecord> = {}): HotmartTransactionRecord {
  return {
    transaction_id: 'TX-001',
    buyer_key: 'buyer-key',
    product_id: '6966825',
    product_name: 'MAPA-7P',
    status: 'approved',
    order_date: '2026-07-15T11:03:18.000Z',
    approved_date: '2026-07-15T11:03:23.000Z',
    gross_value: 154.72,
    gross_currency: 'BRL',
    fee_value: 15.07,
    fee_currency: 'BRL',
    producer_net_value: 127.03,
    producer_net_currency: 'BRL',
    payment_type: 'CREDIT_CARD',
    offer_code: 'vyqym0gx',
    subscription_id: null,
    is_renewal: false,
    tracking_src: 'yt|WrWsJ4MjP04|d|e17e',
    tracking_sck: null,
    tracking_xcod: null,
    last_event_at: '2026-07-15T11:03:23.000Z',
    last_reconciled_at: '2026-07-15T12:00:00.000Z',
    ...overrides,
  };
}

test('webhook posterior não apaga campos ricos já reconciliados', () => {
  const reconciled = transaction();
  const incompleteWebhook = transaction({
    buyer_key: null,
    gross_value: 142.1,
    gross_currency: null,
    fee_value: null,
    fee_currency: null,
    last_event_at: '2026-07-15T12:25:16.000Z',
    last_reconciled_at: null,
  });

  const merged = mergeHotmartTransaction(reconciled, incompleteWebhook);

  assert.equal(merged.gross_value, 154.72);
  assert.equal(merged.gross_currency, 'BRL');
  assert.equal(merged.fee_value, 15.07);
  assert.equal(merged.fee_currency, 'BRL');
  assert.equal(merged.buyer_key, 'buyer-key');
  assert.equal(merged.tracking_src, 'yt|WrWsJ4MjP04|d|e17e');
  assert.equal(merged.last_event_at, '2026-07-15T12:25:16.000Z');
  assert.equal(merged.last_reconciled_at, '2026-07-15T12:00:00.000Z');
});

test('reconciliação mais antiga enriquece campos sem regredir evento e status', () => {
  const webhook = transaction({
    status: 'refunded',
    gross_currency: null,
    fee_value: null,
    fee_currency: null,
    tracking_src: null,
    last_event_at: '2026-07-16T12:00:00.000Z',
    last_reconciled_at: null,
  });
  const reconciliation = transaction({
    status: 'approved',
    last_event_at: '2026-07-15T11:03:23.000Z',
    last_reconciled_at: '2026-07-16T13:00:00.000Z',
  });

  const merged = mergeHotmartTransaction(webhook, reconciliation);

  assert.equal(merged.status, 'refunded');
  assert.equal(merged.gross_currency, 'BRL');
  assert.equal(merged.fee_value, 15.07);
  assert.equal(merged.fee_currency, 'BRL');
  assert.equal(merged.tracking_src, 'yt|WrWsJ4MjP04|d|e17e');
  assert.equal(merged.last_event_at, '2026-07-16T12:00:00.000Z');
  assert.equal(merged.last_reconciled_at, '2026-07-16T13:00:00.000Z');
});

test('reconciliação duplicada ainda repara snapshot incompleto de forma idempotente', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const event: HotmartEventRecord = {
    event_key: 'hotmart:reconciliation:TX-001',
    transaction_id: 'TX-001',
    event_type: 'RECONCILIATION_APPROVED',
    raw_status: 'APPROVED',
    normalized_status: 'approved',
    occurred_at: '2026-07-15T11:03:23.000Z',
    source: 'reconciliation',
    sanitized_payload: {},
  };
  repository.hotmartEvents.set(event.event_key, event);
  repository.hotmartTransactions.set('TX-001', transaction({
    gross_currency: null,
    fee_value: null,
    fee_currency: null,
    tracking_src: null,
    last_event_at: '2026-07-16T12:00:00.000Z',
    last_reconciled_at: null,
  }));

  const repaired = await repository.applyHotmartEvent(event, transaction({
    last_reconciled_at: '2026-07-16T13:00:00.000Z',
  }));
  const repeated = await repository.applyHotmartEvent(event, transaction({
    last_reconciled_at: '2026-07-16T13:00:00.000Z',
  }));

  assert.deepEqual(repaired, {
    insertedEvent: false,
    updatedTransaction: true,
    repairedTransaction: true,
  });
  assert.deepEqual(repeated, {
    insertedEvent: false,
    updatedTransaction: false,
    repairedTransaction: false,
  });
  assert.equal(repository.hotmartEvents.size, 1);
  assert.equal(repository.hotmartTransactions.get('TX-001')?.gross_currency, 'BRL');
  assert.equal(repository.hotmartTransactions.get('TX-001')?.tracking_src, 'yt|WrWsJ4MjP04|d|e17e');
});

test('reconciliação antiga corrige venda aprovada para reembolsada', () => {
  const approvedWebhook = transaction({
    status: 'approved',
    last_event_at: '2026-07-16T12:00:00.000Z',
    last_reconciled_at: null,
  });
  const olderRefundReconciliation = transaction({
    status: 'refunded',
    last_event_at: '2026-07-15T11:03:23.000Z',
    last_reconciled_at: '2026-07-16T13:00:00.000Z',
  });

  const merged = mergeHotmartTransaction(approvedWebhook, olderRefundReconciliation);

  assert.equal(merged.status, 'refunded');
  assert.equal(merged.last_event_at, '2026-07-16T12:00:00.000Z');
});

test('webhook aprovado tardio não regride reembolso ou chargeback', () => {
  for (const terminalStatus of ['refunded', 'chargeback'] as const) {
    const terminal = transaction({
      status: terminalStatus,
      last_event_at: '2026-07-16T12:00:00.000Z',
      last_reconciled_at: null,
    });
    const laterApprovedWebhook = transaction({
      status: 'approved',
      last_event_at: '2026-07-16T14:00:00.000Z',
      last_reconciled_at: null,
    });

    assert.equal(mergeHotmartTransaction(terminal, laterApprovedWebhook).status, terminalStatus);
  }
});

test('webhook de reembolso antigo não troca chargeback terminal mais novo', () => {
  const currentChargeback = transaction({
    status: 'chargeback',
    last_event_at: '2026-07-16T12:00:00.000Z',
    last_reconciled_at: null,
  });
  const olderRefundWebhook = transaction({
    status: 'refunded',
    last_event_at: '2026-07-15T12:00:00.000Z',
    last_reconciled_at: null,
  });

  assert.equal(mergeHotmartTransaction(currentChargeback, olderRefundWebhook).status, 'chargeback');
});

test('status desconhecido tardio nunca apaga status conhecido', () => {
  const approved = transaction({
    status: 'approved',
    last_event_at: '2026-07-16T12:00:00.000Z',
    last_reconciled_at: null,
  });
  const laterUnknownWebhook = transaction({
    status: 'unknown',
    last_event_at: '2026-07-16T14:00:00.000Z',
    last_reconciled_at: null,
  });

  assert.equal(mergeHotmartTransaction(approved, laterUnknownWebhook).status, 'approved');
});

test('tracking preserva campanha atual e promove campanha recebida sobre valor genérico', () => {
  const trackingCode = 'yt|WrWsJ4MjP04|d|e17e';
  const campaignTrackingCodes = new Set([trackingCode.toLowerCase()]);
  const laterGenericWebhook = transaction({
    tracking_src: 'HOTMART_PRODUCT_PAGE',
    last_event_at: '2026-07-16T14:00:00.000Z',
    last_reconciled_at: null,
  });
  const preserved = mergeHotmartTransaction(
    transaction({ tracking_src: trackingCode }),
    laterGenericWebhook,
    campaignTrackingCodes,
  );
  const promoted = mergeHotmartTransaction(
    transaction({ tracking_src: 'HOTMART_PRODUCT_PAGE' }),
    transaction({
      tracking_src: trackingCode,
      last_event_at: '2026-07-15T10:00:00.000Z',
      last_reconciled_at: '2026-07-16T15:00:00.000Z',
    }),
    campaignTrackingCodes,
  );

  assert.equal(preserved.tracking_src, trackingCode);
  assert.equal(promoted.tracking_src, trackingCode);
});

test('reconciliação sem mudança substantiva não infla contador de reparos', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const current = transaction({ last_reconciled_at: null });
  repository.hotmartTransactions.set(current.transaction_id, current);
  const event: HotmartEventRecord = {
    event_key: 'hotmart:reconciliation:unchanged:TX-001',
    transaction_id: current.transaction_id,
    event_type: 'RECONCILIATION_APPROVED',
    raw_status: 'APPROVED',
    normalized_status: 'approved',
    occurred_at: current.last_event_at,
    source: 'reconciliation',
    sanitized_payload: {},
  };

  const result = await repository.applyHotmartEvent(event, transaction({
    last_reconciled_at: '2026-07-16T15:00:00.000Z',
  }));

  assert.deepEqual(result, {
    insertedEvent: true,
    updatedTransaction: true,
    repairedTransaction: false,
  });
  assert.equal(
    repository.hotmartTransactions.get(current.transaction_id)?.last_reconciled_at,
    '2026-07-16T15:00:00.000Z',
  );
});
