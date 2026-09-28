-- MODELO ILUSTRATIVO AUTÔNOMO — PostgreSQL. NÃO É MIGRATION do banco atual.
-- Complementa admin-santander-nfe.md; não substitui schema.prisma.
-- Os IDs textuais são gerados pela aplicação. MVP: emitente brasileiro.
-- Não executado. Tabelas de apoio/produção/CRM do dicionário ficam para a migration real.
-- Dinheiro final = centavos BIGINT; preço/custo unitário = BRL NUMERIC(20,6).
-- Checks de soma entre registros, DV de documentos e políticas fiscais ficam nos serviços
-- transacionais, ou em constraints/triggers deliberadamente implementadas na migration.

CREATE TABLE fiscal_issuer (
  id text PRIMARY KEY,
  tax_id varchar(14) NOT NULL UNIQUE CHECK (tax_id ~ '^[0-9A-Z]{12}[0-9]{2}$'),
  legal_name text NOT NULL,
  state_registration text NOT NULL,
  tax_regime text NOT NULL CHECK (tax_regime IN ('SIMPLES_NACIONAL','LUCRO_PRESUMIDO','LUCRO_REAL')),
  crt smallint NOT NULL CHECK (crt IN (1,2,3,4)), -- confirmar enquadramento efetivo
  address_snapshot jsonb NOT NULL,
  fiscal_certificate_secret_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE municipality (
  ibge_code char(7) PRIMARY KEY CHECK (ibge_code ~ '^[0-9]{7}$'),
  name text NOT NULL,
  state char(2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  source_version text NOT NULL
);

CREATE TABLE customer (
  id text PRIMARY KEY,
  person_type text NOT NULL CHECK (person_type IN ('PF','PJ')),
  tax_id varchar(14) UNIQUE,
  legal_name text NOT NULL,
  trade_name text,
  ie_indicator smallint CHECK (ie_indicator IN (1,2,9)),
  state_registration text,
  email text,
  phone text,
  contact_name text,
  fiscal_validated_at timestamptz,
  validation_issues jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (tax_id IS NULL OR
    (person_type='PF' AND tax_id ~ '^[0-9]{11}$') OR
    (person_type='PJ' AND tax_id ~ '^[0-9A-Z]{12}[0-9]{2}$'))
  -- Rascunho comercial admite dados incompletos; fiscal-validation impõe requisitos.
);

CREATE TABLE customer_address (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (purpose IN ('FISCAL','BILLING','SHIPPING')),
  postal_code char(8) NOT NULL CHECK (postal_code ~ '^[0-9]{8}$'),
  street text NOT NULL,
  number text NOT NULL, -- permite S/N; não usar integer
  complement text,
  district text NOT NULL,
  municipality_ibge_code char(7) NOT NULL REFERENCES municipality(ibge_code),
  country_code char(4) NOT NULL DEFAULT '1058', -- código fiscal Brasil no MVP
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX customer_address_owner ON customer_address(customer_id);

CREATE TABLE supplier (
  id text PRIMARY KEY,
  person_type text NOT NULL CHECK (person_type IN ('PF','PJ')),
  tax_id varchar(14) NOT NULL UNIQUE,
  legal_name text NOT NULL,
  state_registration text,
  address_snapshot jsonb NOT NULL,
  email text,
  phone text,
  active boolean NOT NULL DEFAULT true,
  CHECK ((person_type='PF' AND tax_id ~ '^[0-9]{11}$') OR
         (person_type='PJ' AND tax_id ~ '^[0-9A-Z]{12}[0-9]{2}$'))
);

CREATE TABLE product (
  id text PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  unit text NOT NULL,
  supply_type text NOT NULL CHECK (supply_type IN ('PURCHASED','MANUFACTURED')),
  sale_price_cents bigint NOT NULL CHECK (sale_price_cents >= 0),
  max_discount_bps integer NOT NULL DEFAULT 0 CHECK (max_discount_bps BETWEEN 0 AND 10000),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE product_cost_revision (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES product(id),
  unit_cost_brl numeric(20,6) NOT NULL CHECK (unit_cost_brl >= 0),
  costing_method text NOT NULL,
  effective_at timestamptz NOT NULL,
  source_reference text NOT NULL,
  actor_id text NOT NULL,
  UNIQUE(product_id, effective_at, source_reference)
);

CREATE TABLE tax_profile_version (
  id text PRIMARY KEY,
  issuer_id text NOT NULL REFERENCES fiscal_issuer(id),
  name text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  valid_from date NOT NULL,
  valid_to date,
  scenario jsonb NOT NULL, -- UF, destinatário, finalidade, regime etc.; schema validado
  ncm char(8) NOT NULL CHECK (ncm ~ '^[0-9]{8}$'),
  cest char(7),
  fiscal_origin smallint NOT NULL,
  commercial_unit text NOT NULL,
  taxable_unit text NOT NULL,
  conversion_factor numeric(20,8) NOT NULL CHECK (conversion_factor > 0),
  tax_rules jsonb NOT NULL, -- CFOP/CSOSN/CST e RTC conforme cenário e vigência
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL,
  UNIQUE(issuer_id, name, version),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE sales_order (
  id text PRIMARY KEY,
  issuer_id text NOT NULL REFERENCES fiscal_issuer(id),
  customer_id text NOT NULL REFERENCES customer(id),
  number text NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  commercial_status text NOT NULL,
  fulfillment_status text NOT NULL,
  financial_status text NOT NULL, -- projeção das obrigações/alocações
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  customer_snapshot jsonb NOT NULL,
  payment_policy_snapshot jsonb NOT NULL,
  fiscal_policy_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_order_customer ON sales_order(customer_id, created_at);

CREATE TABLE sales_order_item (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES sales_order(id) ON DELETE RESTRICT,
  product_id text REFERENCES product(id),
  sku_snapshot text NOT NULL,
  description_snapshot text NOT NULL,
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  unit_price_brl numeric(20,6) NOT NULL CHECK (unit_price_brl >= 0),
  unit_cost_brl numeric(20,6) NOT NULL CHECK (unit_cost_brl >= 0),
  base_cents bigint NOT NULL CHECK (base_cents >= 0),
  discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents bigint NOT NULL,
  discount_approved_by text,
  tax_profile_version_id text REFERENCES tax_profile_version(id),
  CHECK (discount_cents <= base_cents),
  CHECK (total_cents = base_cents - discount_cents)
);
CREATE INDEX sales_order_item_order ON sales_order_item(order_id);

CREATE TABLE receivable (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES sales_order(id),
  obligation_key text NOT NULL UNIQUE, -- plano + parcela; estável entre tentativas de cobrança
  installment_label text NOT NULL,
  principal_cents bigint NOT NULL CHECK (principal_cents > 0),
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'BRL' CHECK (currency='BRL'),
  canceled_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX receivable_order_due ON receivable(order_id, due_date);

CREATE TABLE gateway_account (
  id text PRIMARY KEY,
  issuer_id text NOT NULL REFERENCES fiscal_issuer(id),
  provider text NOT NULL CHECK (provider IN ('SANTANDER','ASAAS','MANUAL')),
  environment text NOT NULL CHECK (environment IN ('SANDBOX','PRODUCTION')),
  account_reference text NOT NULL,
  covenant_code text,
  workspace_id text,
  pix_key text,
  credentials_secret_ref text NOT NULL,
  certificate_secret_ref text,
  certificate_expires_at timestamptz,
  capabilities jsonb NOT NULL DEFAULT '{}',
  UNIQUE(issuer_id, provider, environment, account_reference)
);

CREATE TABLE payment_charge (
  id text PRIMARY KEY,
  receivable_id text NOT NULL REFERENCES receivable(id),
  account_id text NOT NULL REFERENCES gateway_account(id),
  method text NOT NULL CHECK (method IN ('PIX','BOLETO','BOLETO_PIX','LEGACY')),
  status text NOT NULL CHECK (status IN ('CREATING','UNKNOWN','ACTIVE','SETTLED','CANCELED','EXPIRED','FAILED')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  request_reference text NOT NULL,
  request_hash text NOT NULL,
  external_id text,
  pix_txid text,
  bank_number text,
  digitable_line text,
  pix_payload text,
  due_date date,
  expires_at timestamptz,
  last_reconciled_at timestamptz,
  legacy_payment_id text UNIQUE, -- FK para Payment existente na migration real
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, request_reference),
  UNIQUE(account_id, external_id)
);
CREATE UNIQUE INDEX charge_pix_txid ON payment_charge(account_id, pix_txid) WHERE pix_txid IS NOT NULL;
CREATE INDEX charge_reconciliation ON payment_charge(account_id, status, last_reconciled_at);

CREATE TABLE settlement (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES gateway_account(id),
  charge_id text REFERENCES payment_charge(id), -- nullable: pagamento não identificado
  external_id text NOT NULL,
  end_to_end_id text,
  gross_cents bigint NOT NULL CHECK (gross_cents > 0),
  fee_cents bigint CHECK (fee_cents >= 0),
  net_cents bigint CHECK (net_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'BRL' CHECK (currency='BRL'),
  settled_at timestamptz NOT NULL,
  evidence_ref text NOT NULL,
  UNIQUE(account_id, external_id),
  CHECK (fee_cents IS NULL OR net_cents IS NULL OR net_cents = gross_cents - fee_cents)
);
CREATE UNIQUE INDEX settlement_pix_identity ON settlement(account_id, end_to_end_id) WHERE end_to_end_id IS NOT NULL;

CREATE TABLE payment_allocation (
  id text PRIMARY KEY,
  settlement_id text NOT NULL REFERENCES settlement(id),
  receivable_id text NOT NULL REFERENCES receivable(id),
  operation_key text NOT NULL UNIQUE,
  direction smallint NOT NULL CHECK (direction IN (1,-1)),
  principal_cents bigint NOT NULL CHECK (principal_cents > 0),
  financial_discount_cents bigint NOT NULL DEFAULT 0 CHECK (financial_discount_cents >= 0),
  charges_cents bigint NOT NULL DEFAULT 0 CHECK (charges_cents >= 0), -- multa/juros
  reversal_of_id text REFERENCES payment_allocation(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (financial_discount_cents <= principal_cents),
  CHECK ((direction=1 AND reversal_of_id IS NULL) OR (direction=-1 AND reversal_of_id IS NOT NULL))
  -- Por liquidação: soma(direction*(principal-desconto+encargos)) <= disponível.
  -- Por obrigação: baixar principal apenas pelas alocações confirmadas.
);
CREATE INDEX allocation_obligation ON payment_allocation(receivable_id);

CREATE TABLE refund (
  id text PRIMARY KEY,
  settlement_id text NOT NULL REFERENCES settlement(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  request_reference text NOT NULL UNIQUE,
  external_id text,
  status text NOT NULL CHECK (status IN ('REQUESTED','PROCESSING','CONFIRMED','FAILED','UNKNOWN')),
  approved_by text NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
  -- Soma de devoluções confirmadas/iniciadas bloqueadas não pode exceder disponível.
);

CREATE TABLE fiscal_operation (
  id text PRIMARY KEY,
  issuer_id text NOT NULL REFERENCES fiscal_issuer(id),
  order_id text NOT NULL REFERENCES sales_order(id),
  order_version integer NOT NULL,
  business_key text NOT NULL,
  purpose text NOT NULL,
  status text NOT NULL,
  eligibility_snapshot jsonb NOT NULL,
  immutable_payload jsonb NOT NULL,
  rules_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(issuer_id, business_key)
);

CREATE TABLE fiscal_document (
  id text PRIMARY KEY,
  operation_id text NOT NULL UNIQUE REFERENCES fiscal_operation(id),
  issuer_id text NOT NULL REFERENCES fiscal_issuer(id),
  provider text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('HOMOLOGATION','PRODUCTION')),
  provider_reference text NOT NULL,
  model char(2) NOT NULL DEFAULT '55',
  series integer,
  number bigint,
  access_key text,
  protocol text,
  status text NOT NULL CHECK (status IN ('DRAFT','PENDING_DATA','QUEUED','PROCESSING','AUTHORIZED','REJECTED','CANCEL_REQUESTED','CANCELED','UNKNOWN','DENIED_LEGACY')),
  rejection_code text,
  rejection_message text,
  xml_object_key text,
  xml_sha256 char(64),
  danfe_object_key text,
  authorized_at timestamptz,
  UNIQUE(issuer_id, provider, environment, provider_reference),
  UNIQUE(issuer_id, environment, model, series, number),
  UNIQUE(environment, access_key)
);

CREATE TABLE fiscal_document_item (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES fiscal_document(id),
  order_item_id text NOT NULL REFERENCES sales_order_item(id),
  line_no integer NOT NULL CHECK (line_no > 0),
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  item_tax_snapshot jsonb NOT NULL,
  UNIQUE(document_id, line_no)
);
CREATE INDEX fiscal_item_order_item ON fiscal_document_item(order_item_id);

CREATE TABLE fiscal_attempt (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES fiscal_document(id),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  payload_hash text NOT NULL,
  response_evidence_ref text,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, attempt_number)
);

CREATE TABLE purchase_order (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES supplier(id),
  status text NOT NULL,
  approved_by text,
  expected_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE purchase_order_item (
  id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES purchase_order(id),
  product_id text NOT NULL REFERENCES product(id),
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  unit_cost_brl numeric(20,6) NOT NULL CHECK (unit_cost_brl >= 0)
);
CREATE TABLE goods_receipt (
  id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES purchase_order(id),
  supplier_document_key text,
  operation_key text NOT NULL UNIQUE,
  received_at timestamptz NOT NULL,
  actor_id text NOT NULL
);
CREATE TABLE goods_receipt_item (
  id text PRIMARY KEY,
  receipt_id text NOT NULL REFERENCES goods_receipt(id),
  purchase_item_id text NOT NULL REFERENCES purchase_order_item(id),
  quantity_accepted numeric(14,4) NOT NULL CHECK (quantity_accepted >= 0),
  quantity_rejected numeric(14,4) NOT NULL DEFAULT 0 CHECK (quantity_rejected >= 0),
  landed_unit_cost_brl numeric(20,6) NOT NULL CHECK (landed_unit_cost_brl >= 0),
  CHECK (quantity_accepted + quantity_rejected > 0)
);

CREATE TABLE supplier_payable (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES supplier(id),
  purchase_order_id text REFERENCES purchase_order(id),
  obligation_key text NOT NULL UNIQUE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  due_date date NOT NULL,
  finance_entry_id text UNIQUE -- FK para FinanceEntry existente na migration real
);

CREATE TABLE warehouse (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE
);
CREATE TABLE stock_lot (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES product(id),
  lot_code text NOT NULL,
  receipt_item_id text REFERENCES goods_receipt_item(id),
  origin_type text NOT NULL CHECK (origin_type IN ('PURCHASE','PRODUCTION','OPENING')),
  production_reference text, -- FK para ProductionOrder na migration real
  manufacture_date date,
  expiry_date date,
  unit_cost_brl numeric(20,6) NOT NULL CHECK (unit_cost_brl >= 0),
  UNIQUE(product_id, lot_code),
  CHECK ((origin_type='PURCHASE' AND receipt_item_id IS NOT NULL AND production_reference IS NULL)
      OR (origin_type='PRODUCTION' AND receipt_item_id IS NULL AND production_reference IS NOT NULL)
      OR (origin_type='OPENING' AND receipt_item_id IS NULL AND production_reference IS NULL))
);
CREATE TABLE inventory_movement (
  id text PRIMARY KEY,
  lot_id text NOT NULL REFERENCES stock_lot(id),
  warehouse_id text NOT NULL REFERENCES warehouse(id),
  operation_key text NOT NULL,
  line_no integer NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('RECEIPT','SHIPMENT','CONSUMPTION','PRODUCTION','TRANSFER','RETURN','ADJUSTMENT','REVERSAL','OPENING')),
  quantity_delta numeric(14,4) NOT NULL CHECK (quantity_delta <> 0),
  order_item_id text REFERENCES sales_order_item(id),
  reversal_of_id text REFERENCES inventory_movement(id),
  reason text NOT NULL,
  actor_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  UNIQUE(operation_key, line_no)
  -- Não editar/excluir; corrigir por movimento de reversão.
  -- Serviço valida produto do lote x item e duas pernas de transferência.
);
CREATE INDEX inventory_lot_history ON inventory_movement(lot_id, occurred_at);
CREATE TABLE inventory_balance (
  lot_id text NOT NULL REFERENCES stock_lot(id),
  warehouse_id text NOT NULL REFERENCES warehouse(id),
  on_hand numeric(14,4) NOT NULL CHECK (on_hand >= 0),
  reserved numeric(14,4) NOT NULL CHECK (reserved >= 0),
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY(lot_id, warehouse_id),
  CHECK (reserved <= on_hand)
  -- Projeção mantida com movimentos/reservas na mesma transação e reconciliada.
);
CREATE TABLE stock_reservation (
  id text PRIMARY KEY,
  order_item_id text NOT NULL REFERENCES sales_order_item(id),
  lot_id text NOT NULL,
  warehouse_id text NOT NULL,
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  operation_key text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('ACTIVE','CONSUMED','RELEASED','EXPIRED')),
  expires_at timestamptz,
  FOREIGN KEY(lot_id, warehouse_id) REFERENCES inventory_balance(lot_id, warehouse_id)
);

CREATE TABLE webhook_inbox (
  id text PRIMARY KEY,
  integration_scope text NOT NULL, -- inclui provedor, empresa/conta e ambiente
  dedupe_key text NOT NULL,
  event_type text NOT NULL,
  payload_object_key text NOT NULL, -- payload bruto em storage protegido, ou JSONB cifrado
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_until timestamptz,
  last_error text,
  UNIQUE(integration_scope, dedupe_key)
);
CREATE INDEX inbox_ready ON webhook_inbox(status, available_at);

CREATE TABLE outbox_event (
  id text PRIMARY KEY,
  event_key text NOT NULL UNIQUE,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  aggregate_version integer NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  lease_owner text,
  lease_until timestamptz,
  last_error text
);
CREATE INDEX outbox_ready ON outbox_event(available_at) WHERE published_at IS NULL;

-- Contrato de serviço: ordem fixa de locks, transações curtas e retry de deadlock.
-- Nenhuma chamada HTTP a Santander/SEFAZ dentro de transação SQL.
-- Lease expirado permite retomar job. UNIQUE evita efeito repetido, não a entrega.
-- Publicação da outbox pode repetir: consumidores também precisam de idempotência.
-- Adicionar índices de FK e filtros medidos na migration; aqui estão os principais.
-- O modelo ampliado no documento inclui usuário/permissões, auditoria, produção,
-- serialização, expedição, eventos fiscais e conciliação, não expandidos neste DDL.
