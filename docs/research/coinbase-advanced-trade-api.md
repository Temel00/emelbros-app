# Coinbase Advanced Trade API: Read-Only Access to Orders, Fills and Fee Tiers

Research for GitHub issue #92 (child of wayfinder map #91). Scope: what the Coinbase Advanced Trade API exposes for *reading* an account's orders, fills, fee tiers and balances, and how a server-side app authenticates to it read-only. All claims are sourced from Coinbase primary documentation (`docs.cdp.coinbase.com`) or Coinbase's own GitHub repositories, linked inline on the sentence making the claim. Where a page could not be reached or a fact could not be confirmed, that is stated explicitly rather than filled in. Researched 2026-08-05.

---

## 1. Auth model

### 1.1 The current key type: CDP API keys

Advanced Trade uses **CDP API Keys, obtained from the Coinbase Developer Platform** — Coinbase's own FAQ states this directly and contrasts it with Coinbase Exchange's key type ([Advanced Trade API FAQ](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/faq)). CDP's key documentation distinguishes a **Secret API Key** ("for all server-to-server communication (i.e., REST APIs)") from a **Client API Key** ("for all client-side communication… safe to include in client-side code"); a read-only Advanced Trade integration wants a **Secret API Key** ([CDP API Keys](https://docs.cdp.coinbase.com/get-started/authentication/cdp-api-keys)).

### 1.2 Signing scheme: per-request JWT, not HMAC headers

Authentication is a **JWT bearer token signed with the API key secret, regenerated for every request** — not the legacy `CB-ACCESS-KEY` / `CB-ACCESS-SIGN` / `CB-ACCESS-TIMESTAMP` HMAC header scheme. The Coinbase App key-authentication page states the JWT "expires after 2 minutes, after which all requests are unauthenticated" and that "you must generate a different JWT for each unique API request" ([Coinbase App API Key Authentication](https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication)).

JWT **payload claims**, per [JWT Authentication](https://docs.cdp.coinbase.com/get-started/authentication/jwt-authentication):

| Claim | Value |
|---|---|
| `iss` | `"cdp"` |
| `sub` | the API key name/ID, format `organizations/{org_id}/apiKeys/{key_id}` |
| `nbf` | current Unix time |
| `exp` | current Unix time + 120 |
| `uri` | `"{METHOD} {HOST}{PATH}"`, e.g. `"GET api.coinbase.com/api/v3/brokerage/accounts"` |

JWT **header fields**: `alg` (`ES256` or `EdDSA`), `kid` (same value as `sub`), `nonce` (random 16-byte hex, for replay protection), `typ: "JWT"`. The `uri` claim binds each token to one method+path, which is why a new JWT is needed per request.

The [JWT Authentication](https://docs.cdp.coinbase.com/get-started/authentication/jwt-authentication) page also lists an `aud: ["cdp_service"]` claim. Coinbase's own Advanced Trade SDKs do **not** emit `aud` — the TypeScript SDK's payload is exactly `{iss, nbf, exp, sub, uri}` ([`src/rest/credentials/index.ts`](https://github.com/coinbase-samples/advanced-sdk-ts/blob/main/src/rest/credentials/index.ts)) — so `aud` appears to be optional for the brokerage endpoints. That reconciliation is inference from the SDK source, not a documented statement.

The exact SDK implementation, verbatim from [`advanced-sdk-ts/src/rest/credentials/index.ts`](https://github.com/coinbase-samples/advanced-sdk-ts/blob/main/src/rest/credentials/index.ts):

```ts
const payload = { iss: JWT_ISSUER, nbf: now, exp: now + 120, sub: accessKey, uri };
const header  = { alg: loaded.algorithm, kid: accessKey,
                  nonce: crypto.randomBytes(16).toString('hex') };
// …
const jwtUri = `${requestMethod} ${uri.replace('https://','').replace('http://','').split('?')[0]}`;
return { Authorization: `Bearer ${buildJwt(loaded, this.accessKey, jwtUri)}` };
```

Note the last line's behaviour: **query parameters are stripped from the `uri` claim** — sign `GET api.coinbase.com/api/v3/brokerage/orders/historical/fills`, not the version with `?limit=100`. This is a load-bearing detail that the prose docs do not spell out; it comes from Coinbase's own SDK.

### 1.3 ES256 vs Ed25519 — a genuine contradiction between two current Coinbase pages

- [JWT Authentication](https://docs.cdp.coinbase.com/get-started/authentication/jwt-authentication) says **"ECDSA is a legacy key algorithm. You should use Ed25519 instead."**
- [Coinbase App API Key Authentication](https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication) says the opposite for this product family: **"When using Coinbase App SDKs, Ed25519 (EdDSA) keys are NOT supported. You must use ES256 key format,"** and instructs you to select **ECDSA** when creating the key.
- Coinbase's official Python SDK README says **"Ed25519 is the recommended key type,"** that ECDSA is supported for existing keys, and that "the key type is auto-detected and the correct JWT signing algorithm (`EdDSA` or `ES256`) is selected automatically" ([coinbase/coinbase-advanced-py README](https://github.com/coinbase/coinbase-advanced-py/blob/master/README.md)).
- The TypeScript SDK likewise accepts both and maps `ec → ES256`, `ed25519 → EdDSA` (source above).

**Reading:** both algorithms appear to work against `api.coinbase.com/api/v3/brokerage/*` today — both first-party SDKs implement both — but the Coinbase App page's "Ed25519 NOT supported" warning is current and unretracted. **Safest choice for this module: create an ECDSA (ES256) key**, which every page and SDK agrees works. This is a judgement call reconciling contradictory primary sources, not a quoted fact.

Key file formats accepted, per the [Python SDK README](https://github.com/coinbase/coinbase-advanced-py/blob/master/README.md) and confirmed in the TS SDK source:

- **ECDSA** — SEC1 PEM, `-----BEGIN EC PRIVATE KEY-----` (the TS SDK also accepts PKCS8 PEM).
- **Ed25519** — PKCS8 PEM (`-----BEGIN PRIVATE KEY-----`) or raw base64 (32-byte seed, or 64-byte seed‖pubkey as downloaded from the CDP portal).

[CDP API Keys](https://docs.cdp.coinbase.com/get-started/authentication/cdp-api-keys) notes that **"for enhanced security, API key files are no longer automatically downloaded"** — you copy the key material from the creation modal into environment variables. Practical consequence: the PEM arrives as a multi-line string with `\n`, which must survive being stored in a Vercel env var (store with literal `\n` and `.replace(/\\n/g, '\n')` at read time, or base64 the whole PEM).

### 1.4 What a read-only key looks like

Permissions are set per key at creation time: **View** (read-only, "grants access to APIs that do not move funds"), **Trade** (place buy/sell orders), **Transfer** (send funds out) and **Receive**. For this module: **View only, Trade off, Transfer off.**

The key's own permissions are readable at runtime — `GET /api/v3/brokerage/key_permissions` returns ([Get API Key Permissions](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/data-api/get-api-key-permissions)):

```json
{
  "can_view": true,
  "can_trade": false,
  "can_transfer": false,
  "portfolio_uuid": "…",
  "portfolio_type": "UNDEFINED | DEFAULT | CONSUMER | INTX"
}
```

That endpoint is a cheap startup self-check: assert `can_trade === false && can_transfer === false` and refuse to boot otherwise.

**IP allowlisting** is available and optional at key creation: the CDP portal's Advanced Settings has an IP allowlist accepting IPs or CIDRs, "ensuring API requests are only honored from your defined origins," with a documented cap of **30 IPs per API key** ([Coinbase App API Key Authentication](https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication), [Best Practices: API Security](https://docs.cdp.coinbase.com/get-started/authentication/security-best-practices)). See §7 for why this is not usable on Vercel's free tier.

### 1.5 Deprecated / sunset

- **Coinbase Pro**: "Coinbase Pro has been disabled for use and all customers have been migrated as of December 1, 2023," and "No, you cannot use existing Pro API keys to trade with Advanced Trade" ([Advanced Trade API FAQ](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/faq)).
- **Legacy HMAC `CB-ACCESS-*` keys**: several Advanced Trade endpoints still carry a `retail_portfolio_id` query parameter marked **"Deprecated — for legacy keys only"** (visible on [List Orders](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/list-orders), [List Fills](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/list-fills) and [List Accounts](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/accounts/list-accounts)). So legacy keys are still tolerated on some paths but are documented as legacy. **I could not find a current CDP page giving a hard sunset date for legacy retail/Cloud API Trading Keys** — the old `docs.cloud.coinbase.com` pages now 307-redirect into `docs.cdp.coinbase.com` and the specific legacy-key pages appear to have been folded away. Treat "legacy HMAC keys are on borrowed time" as inference.
- **FIX**: "Due to low use among retail users, the FIX API is not supported on Coinbase Advanced Trade" ([FAQ](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/faq)).
- **Forward-dated change**: "On September 9, 2026, Coinbase Advanced moves international derivatives from INTX onto a Deribit-powered gateway" with a JSON-RPC 2.0 protocol — **spot and US futures are unaffected** ([Advanced Trade API overview](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/overview)). Irrelevant to a spot-only read module, but worth knowing the date exists.

---

## 2. Orders

### 2.1 Endpoints

| Purpose | Method + path |
|---|---|
| List historical **and** open orders | `GET /api/v3/brokerage/orders/historical/batch` |
| Get one order | `GET /api/v3/brokerage/orders/historical/{order_id}` |

There is **no separate "open orders" endpoint** — you filter the same batch endpoint by `order_status`. Sources: [List Orders](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/list-orders), [Get Order](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/get-order).

### 2.2 Query parameters that matter

From [List Orders](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/list-orders): `order_ids[]`, `product_ids[]`, `product_type` (`SPOT | FUTURE | EQUITY | OPTION_GROUP | FUTURE_GROUP`), `order_status[]` (`PENDING | OPEN | FILLED | CANCELLED | EXPIRED | FAILED | QUEUED | CANCEL_QUEUED | EDIT_QUEUED`), `order_types[]` (`MARKET | LIMIT | STOP | STOP_LIMIT | BRACKET | TWAP | ROLL_OPEN | ROLL_CLOSE | LIQUIDATION | SCALED`), `order_side` (`BUY | SELL`), `time_in_forces[]`, `start_date` (RFC3339, inclusive) / `end_date` (RFC3339, exclusive), `asset_filters[]`, `sort_by` (`LIMIT_PRICE | LAST_FILL_TIME | LAST_UPDATE_TIME`), plus `limit` and `cursor`.

`order_placement_source` defaults to **`RETAIL_ADVANCED`**. This is a trap for a personal-finance module: orders placed through the ordinary Coinbase consumer app are `RETAIL_SIMPLE`, so a default-parameter call will silently omit them. Pass the source you actually want.

### 2.3 Order object shape

Response body from [List Orders](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/list-orders) (fields relevant to a read-only cost-basis module; the doc lists more, including futures/equities/prediction-market fields):

```json
{
  "orders": [
    {
      "order_id": "0000-000000-000000",
      "product_id": "BTC-USD",
      "user_id": "2222-000000-000000",
      "order_configuration": {},
      "side": "BUY",
      "client_order_id": "11111-000000-000000",
      "status": "FILLED",
      "time_in_force": "GOOD_UNTIL_CANCELLED",
      "created_time": "2021-05-31T09:59:59Z",
      "completion_percentage": "50",
      "filled_size": "0.001",
      "average_filled_price": "50",
      "fee": "string",
      "number_of_fills": "2",
      "filled_value": "10000",
      "pending_cancel": true,
      "size_in_quote": false,
      "total_fees": "5.00",
      "size_inclusive_of_fees": false,
      "total_value_after_fees": "string",
      "trigger_status": "STOP_PENDING",
      "order_type": "LIMIT",
      "reject_reason": "HOLD_FAILURE",
      "settled": true,
      "product_type": "SPOT",
      "outstanding_hold_amount": "string",
      "last_fill_time": "2021-05-31T09:59:59Z",
      "last_update_time": "2021-05-31T09:59:59Z",
      "total_fees_native": { "value": "5.00", "currency": "USD" },
      "total_value_after_fees_native": { "value": "1.23", "currency": "BTC" }
    }
  ],
  "sequence": "string",
  "has_next": true,
  "cursor": "789100",
  "proof_token_required": true
}
```

All monetary/size values are **strings**, not numbers — decimal arithmetic must be done with a decimal library, never JS floats.

`order_configuration` is a discriminated union keyed by the order variant; documented variants are `market_market_ioc`, `market_market_fok` (perps only), `limit_limit_gtc`, `limit_limit_gtd`, `limit_limit_fok`, `sor_limit_ioc`, `stop_limit_stop_limit_gtc`, `stop_limit_stop_limit_gtd`, `trigger_bracket_gtc`, `trigger_bracket_gtd`. Market orders carry `quote_size` or `base_size`; limit orders carry `base_size` + `limit_price`; brackets add `stop_trigger_price` ([Advanced API Order Management](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/orders)).

### 2.4 Pagination

Cursor-based: send `limit`, read `has_next` and `cursor` from the response, pass that `cursor` back to get the next page ("returns all responses that come after this value"). **I could not confirm a documented default or maximum `limit` for List Orders** — unlike List Accounts and List Fills, the List Orders page states no default. Treat an explicit modest `limit` (e.g. 100) as the safe move.

---

## 3. Fills

`GET /api/v3/brokerage/orders/historical/fills` ([List Fills](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/list-fills)).

Query params: `order_ids[]`, `trade_ids[]`, `product_ids[]`, `start_sequence_timestamp` / `end_sequence_timestamp` (RFC3339), `order_types[]`, `order_side`, `product_types[]`, `asset_filters[]`, `sort_by` (`PRICE | TRADE_TIME`), `limit` (**default 100**), `cursor`.

Response, verbatim from the reference:

```json
{
  "fills": [
    {
      "entry_id": "22222-2222222-22222222",
      "trade_id": "1111-11111-111111",
      "order_id": "0000-000000-000000",
      "trade_time": "2021-05-31T09:59:59Z",
      "trade_type": "FILL",
      "price": "10000.00",
      "size": "0.001",
      "commission": "1.25",
      "product_id": "BTC-USD",
      "sequence_timestamp": "2021-05-31T09:58:59Z",
      "liquidity_indicator": "MAKER",
      "size_in_quote": false,
      "user_id": "3333-333333-3333333",
      "side": "BUY",
      "retail_portfolio_id": "4444-444444-4444444",
      "fillSource": "FILL_SOURCE_CLOB",
      "commission_detail_total": {
        "total_commission": "1.25",
        "gst_commission": "0.00",
        "withholding_commission": "0.00",
        "client_commission": "0.00",
        "venue_commission": "0.00",
        "regulatory_commission": "0.00",
        "clearing_commission": "0.00"
      },
      "order_data_source": "ORDER_DATA_SOURCE_TRADING_PROXY",
      "future_legs": []
    }
  ],
  "cursor": "789100",
  "proof_token_required": true
}
```

Notes for the module:

- **Fills link to orders via `order_id`**, and one order can have many fills (`number_of_fills` on the order). The order's `total_fees` is the aggregate of its fills' `commission`.
- **`commission` is the fee actually paid on that fill** — this is the authoritative source for "fees already paid" in a break-even calculation. `commission_detail_total` breaks the same number down (GST, venue, regulatory, clearing components).
- **`liquidity_indicator`** is `MAKER` or `TAKER` — it tells you *which* fee-tier rate was applied to that fill, which is how you sanity-check a projected-fee model against history.
- **`size_in_quote`** flags whether `size` is denominated in the quote currency rather than the base asset. Do not assume base.
- `trade_time` vs `sequence_timestamp`: the sample shows them differing, and the filter parameters are `start_/end_sequence_timestamp`, i.e. **the API paginates/filters by sequence timestamp, not trade time**. The docs do not define the semantic difference between the two fields; that is unconfirmed.
- The List Fills response shows a `cursor` but, unlike List Orders and List Accounts, **no `has_next` field appears in the documented response schema**. Detect end-of-pages by an empty/absent `cursor` or a short page rather than relying on `has_next`.

---

## 4. Fee tiers

`GET /api/v3/brokerage/transaction_summary` ([Get Transaction Summary](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/fees/get-transaction-summary)).

Query params: `product_type` (`SPOT | FUTURE | EQUITY | OPTION_GROUP | FUTURE_GROUP`), `contract_expiry_type` (FUTURE only), `product_venue` (`CBE | FCM | INTX`).

Documented response fields:

- `total_volume` — "Total balance across assets and products… denoted in USD"
- `total_fees` — "Total fees across assets, denoted in USD"
- `fee_tier` — the object that matters:
  - `pricing_tier` — tier name, example `"<$10k"`
  - `maker_fee_rate` — string decimal, example `"0.0020"`
  - `taker_fee_rate` — string decimal, example `"0.0010"`
  - `aop_from` / `aop_to` — the tier's asset-on-platform bounds in USD
  - `volume_types_and_range[]` — per-volume-type bands (`VOLUME_TYPE_SPOT`, `VOLUME_TYPE_US_DERIVATIVES`) each with `vol_from` / `vol_to`
- `margin_rate` — decimal, "only applicable to product_type `FUTURE`"
- `goods_and_services_tax` — `{ rate, type }` where type is `INCLUSIVE` or `EXCLUSIVE`
- `advanced_trade_only_volume` / `advanced_trade_only_fees`, `coinbase_pro_volume` / `coinbase_pro_fees`, `total_balance`, `volume_breakdown`

**Source caveat, stated plainly:** the reference page renders its schema from an OpenAPI spec and **does not publish a complete example 200 response** — WebFetch confirmed only per-field examples (e.g. `"total_fees": 25`) exist, not an assembled JSON block. The field list above is from the schema, and the `pricing_tier` / `taker_fee_rate` / `maker_fee_rate` example values are quoted from the same page's field examples. Older Coinbase docs used `usd_from`/`usd_to` on `fee_tier`; the current page shows **`aop_from`/`aop_to`** — I could not confirm whether `usd_from`/`usd_to` are still returned alongside them, so do not depend on them.

**Computing a projected sell-side fee:** call `transaction_summary?product_type=SPOT`, read `fee_tier.taker_fee_rate` (a market sell is a taker; a resting limit sell would be `maker_fee_rate`), and multiply by the projected notional. Cross-check against reality using historical fills' `liquidity_indicator` + `commission` ÷ (`price` × `size`). Note the tier is account-wide and volume-dependent, so it can move between the time you project and the time you sell — and `goods_and_services_tax` may add on top depending on jurisdiction.

---

## 5. Accounts / balances

`GET /api/v3/brokerage/accounts` ([List Accounts](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/accounts/list-accounts)).

Query params: `limit` — "The number of accounts to display per page. By default, displays 49 (max 250)" — and `cursor`. Response carries `accounts[]`, `has_next`, `cursor`, `size`.

Account object:

```json
{
  "uuid": "string",
  "name": "string",
  "currency": "string",
  "available_balance": { "value": "string", "currency": "string" },
  "default": true,
  "active": true,
  "created_at": "RFC3339",
  "updated_at": "RFC3339",
  "deleted_at": "RFC3339",
  "type": "FIAT | CRYPTO | VAULT | PERP_FUTURES",
  "ready": true,
  "hold": { "value": "string", "currency": "string" }
}
```

`uuid` is the per-asset account identifier (one account per currency). **`available_balance` is spendable; `hold` is the portion locked by open orders** — total position for an asset is `available_balance + hold`, and a display that shows only `available_balance` will under-report whenever a sell order is resting. There is a companion `GET /api/v3/brokerage/accounts/{account_id}` for a single account ([Advanced Trade API Endpoints](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api)).

---

## 6. Practicalities

### 6.1 Base URLs

From the [Advanced Trade API reference introduction](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/introduction) and confirmed by the TS SDK's [`constants.ts`](https://github.com/coinbase-samples/advanced-sdk-ts/blob/main/src/constants.ts) (`BASE_URL = 'api.coinbase.com'`, `API_PREFIX = '/api/v3/brokerage/'`):

| Interface | URL |
|---|---|
| REST | `https://api.coinbase.com/api/v3/brokerage` |
| WebSocket (public/market data) | `wss://advanced-trade-ws.coinbase.com` |
| WebSocket (authenticated user channel) | `wss://advanced-trade-ws-user.coinbase.com` |
| REST sandbox | `https://api-sandbox.coinbase.com/api/v3/brokerage` |

Public market-data REST endpoints mirror the product endpoints under a `/market/` path prefix and need no authentication, "with 1s cache enabled" ([Advanced Trade API Endpoints](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api)).

### 6.2 Rate limits — partially unconfirmed

- **WebSocket**: "Advanced Trade API WebSocket connections are rate-limited at **8 per second per IP address**" and "unauthenticated messages are rate-limited at **8 per second per IP address**" ([Advanced Trade WebSocket Rate Limits](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-rate-limits)).
- **REST**: **I could not confirm the Advanced Trade REST per-key requests-per-second limit from a currently-reachable primary page.** The historically-cited page `docs.cloud.coinbase.com/advanced-trade/docs/rest-api-rate-limits` now **307-redirects** to `docs.cdp.coinbase.com/advanced-trade/docs/rest-api-rate-limits`, which renders as the generic Advanced Trade overview and contains no rate-limit numbers; `.../coinbase-app/advanced-trade-apis/rate-limits` and `.../rest-api/rate-limits` both return **404**; and `docs.cdp.coinbase.com/llms.txt` lists no Advanced-Trade rate-limit page at all. Search snippets of the retired page quote "private endpoints are throttled by user at 30 requests per second," but **I could not open that page to verify it, so it is not a citable primary fact.**
- What *is* citable and adjacent: the Coinbase App (v2) API is "rate limited to **10,000 requests per hour**" per API key or OAuth user, returning HTTP `429` with `rate_limit_exceeded` ([Coinbase App Rate Limiting](https://docs.cdp.coinbase.com/coinbase-app/api-architecture/rate-limiting)); CDP's core v2 reference documents **600 read / 500 write requests per 10 seconds** ([Rate Limits](https://docs.cdp.coinbase.com/api-reference/v2/rate-limits)). Neither is stated to govern `/api/v3/brokerage/*`.

**Practical stance:** build for a low-single-digit request rate with caching, and handle `429` with backoff, rather than tuning against an unverified number.

### 6.3 Sandbox

A sandbox exists but is severely limited ([Advanced Trade API Sandbox](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/sandbox)):

- Base URL `https://api-sandbox.coinbase.com/api/v3/brokerage/{resource}`; requests can be made **without authentication**.
- **All responses are static and pre-defined** — they do not reflect market conditions or any real account.
- "Only Accounts and Orders related endpoints are currently available in the sandbox" (orders coverage includes fills). **Transaction summary / fee tiers are therefore not available in sandbox.**
- An `X-Sandbox:` request header triggers specific error responses (insufficient funds, order not found, …) for error-path testing.

So the sandbox is useful for exercising response *parsing* and error handling, and useless for exercising *auth* (it needs none) or fee logic.

### 6.4 Official SDKs

| Language | Package / repo | Status |
|---|---|---|
| Python | `coinbase-advanced-py` (PyPI) — [coinbase/coinbase-advanced-py](https://github.com/coinbase/coinbase-advanced-py) | **Official**, actively maintained |
| TypeScript | `@coinbase-sample/advanced-trade-sdk-ts` — [coinbase-samples/advanced-sdk-ts](https://github.com/coinbase-samples/advanced-sdk-ts) | **Sample**, see below |
| Go | [coinbase-samples/advanced-trade-sdk-go](https://github.com/coinbase-samples/advanced-trade-sdk-go) | Sample |
| Java | [coinbase-samples/advanced-sdk-java](https://github.com/coinbase-samples/advanced-sdk-java) | Sample |

The [Advanced Trade API overview](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/overview) labels Python as the official SDK and the other three explicitly as **samples**, under the `coinbase-samples` GitHub org rather than `coinbase`.

**TypeScript SDK verdict.** The npm package is `@coinbase-sample/advanced-trade-sdk-ts`, latest **v0.3.0 published 2026-06-02**, with only two published versions (0.2.0 in Jan 2025, 0.3.0 in Jun 2026); the repo was last pushed **2026-06-02**, is not archived, and has 51 stars ([npm registry metadata](https://registry.npmjs.org/@coinbase-sample/advanced-trade-sdk-ts); GitHub repo metadata via `gh api`). Its only runtime dependency is `jsonwebtoken`, and it uses Node's built-in `crypto`. It exposes services matching the endpoints this module needs — `src/rest/accounts`, `src/rest/orders`, `src/rest/fees`, `src/rest/data`, `src/rest/products`, `src/rest/portfolios`, `src/rest/public`.

Assessment: it is real, first-party-authored (Apache 2.0, "Copyright 2024-present Coinbase Global, Inc."), and its auth code is sound — but it is a **sample**, pre-1.0, with two releases in eighteen months. For a read-only module touching five GET endpoints, the credentials file above is ~40 lines of copyable logic; **depending on the SDK buys little and couples the app to a sample-grade package.** Reasonable either way; hand-rolling `jose`/`jsonwebtoken` + `fetch` is defensible.

---

## 7. Next.js 16 App Router on Vercel free tier

- **Node runtime required, not Edge.** Both official SDKs sign JWTs with Node's `crypto` — the TS SDK calls `crypto.createPrivateKey`, `crypto.randomBytes` and `crypto.sign` directly ([`credentials/index.ts`](https://github.com/coinbase-samples/advanced-sdk-ts/blob/main/src/rest/credentials/index.ts)). Route handlers/server actions that talk to Coinbase must run on the Node runtime. (App Router route handlers default to Node, so this is a "don't opt into Edge" constraint rather than extra work. If Edge were ever needed, `EdDSA`/`ES256` signing is expressible in Web Crypto — but that is untested inference, not something Coinbase documents.)
- **Key storage.** ECDSA keys are multi-line PEM; Vercel env vars hold them fine but the `\n` handling must be deliberate (§1.3). Ed25519's raw-base64 form is a single line and avoids the problem entirely — a point in Ed25519's favour if the ES256-only warning in §1.3 turns out to be stale for brokerage endpoints.
- **IP allowlisting is effectively unavailable on Hobby.** Coinbase supports up to 30 allowlisted IPs per key, but Vercel functions have no fixed egress IP by default: [Static IPs](https://vercel.com/docs/networking/static-ips) are a **Pro/Enterprise** feature at **$100/month per project**, and Secure Compute is Enterprise-only. So the key's defence-in-depth on a free-tier deploy is *View-only permission + short-lived JWTs + env-var secrecy*, not network origin.
- **Secrets never reach the browser.** The private key must live only in server-side env vars (no `NEXT_PUBLIC_` prefix) and every Coinbase call must be server-side; a JWT signed in the browser would expose the key.

---

## 8. Open questions and caveats

1. **REST rate limit for `/api/v3/brokerage/*`** — unconfirmed; the owning page is gone (§6.2). Resolve by observing `429`s or by finding a live CDP page that states it.
2. **ES256 vs Ed25519 for brokerage endpoints** — two current Coinbase pages contradict each other (§1.3). Resolvable in ten minutes empirically: create one key of each type and call `key_permissions`.
3. **No full example JSON for `transaction_summary`** — the reference publishes schema + per-field examples only (§4). The precise shape of `volume_types_and_range` and `goods_and_services_tax`, and whether legacy `usd_from`/`usd_to` still appear, need a live call to confirm.
4. **`trade_time` vs `sequence_timestamp` semantics** on fills are undefined in the docs (§3), yet only the latter is filterable.
5. **`has_next` on List Fills** is absent from the documented response schema while present on orders/accounts (§3) — pagination-termination logic should not assume it.
6. **List Orders `limit` default/max** is not documented (§2.4).
7. **Sunset date for legacy HMAC `CB-ACCESS-*` keys** — not found on any current CDP page (§1.5).
8. **Sandbox cannot exercise auth or fees** (§6.3), so the JWT path and the fee-tier path can only be validated against production with a real View-only key.
9. **`order_placement_source` defaults to `RETAIL_ADVANCED`** — orders placed in the ordinary Coinbase consumer app are `RETAIL_SIMPLE` and will be missing from default queries (§2.2). This is the single most likely cause of "my trades aren't showing up."

---

## What this means for the module

A read-only Coinbase module in this Next.js/Supabase app needs **five GET endpoints and no more**:

| Endpoint | Why |
|---|---|
| `GET /api/v3/brokerage/key_permissions` | Boot-time assertion that the key is View-only (`can_trade: false`, `can_transfer: false`) |
| `GET /api/v3/brokerage/accounts` | Current holdings per asset — `available_balance` **+** `hold`, keyed by account `uuid` |
| `GET /api/v3/brokerage/orders/historical/batch` | Order history and open orders; the per-order rollup (`total_fees`, `average_filled_price`, `filled_size`, `settled`) |
| `GET /api/v3/brokerage/orders/historical/fills` | The authoritative per-execution record: `price`, `size`, `commission`, `liquidity_indicator`, linked to orders by `order_id` |
| `GET /api/v3/brokerage/transaction_summary` | Current `fee_tier.maker_fee_rate` / `taker_fee_rate` for projecting future fees |

**Break-even calculation, sourced end to end:**

- *Cost basis and fees already paid on the buy* come from **fills**: sum `price × size` for the buy fills of the position, plus sum of `commission`. Do not use the order's `total_fees` alone if you want per-execution fidelity — but note it should equal the sum of its fills' commissions, which makes it a free consistency check.
- *Projected sell-side fee* comes from **`transaction_summary.fee_tier`**: `taker_fee_rate` for an immediate market sell, `maker_fee_rate` for a resting limit sell, multiplied by projected notional. Validate the model against history via each fill's `liquidity_indicator` and `commission`.
- *Break-even price* is then `(cost_basis + buy_commissions) / (size × (1 − projected_sell_rate))`, all in decimal arithmetic — every numeric field in this API is a **string**.

**Shape of the integration:** a Node-runtime server module (never Edge, never client) that signs a fresh 2-minute JWT per request with `iss: "cdp"`, `sub`/`kid` = key name, and a `uri` claim of `"{METHOD} api.coinbase.com{path}"` **with query parameters stripped**. Given only five GET calls, hand-rolling that against `jsonwebtoken`/`jose` is preferable to depending on the sample-grade `@coinbase-sample/advanced-trade-sdk-ts` — but read that SDK's `credentials/index.ts` first, since it is the clearest primary statement of the signing contract.

**Cache aggressively.** Fee tier changes rarely; fills are append-only and can be fetched incrementally by `start_sequence_timestamp`; accounts change on every trade. Since the REST rate limit is unverified, treat a `429` as expected and back off.

**What remains unknown before building:** the REST rate limit, whether an Ed25519 key works against brokerage endpoints, and the exact `transaction_summary` payload — all three answerable with one View-only key and three live calls, which is the natural first task of implementation.
