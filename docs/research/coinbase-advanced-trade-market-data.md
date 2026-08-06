# Coinbase Advanced Trade API: Watchlists, Products and Market Data

Research for GitHub issue #93 (child of wayfinder map #91). Scope: what the Coinbase Advanced Trade API exposes for *reading* watchlists, tradable products, current prices and historical candles; whether a real-time feed is usable from this deployment; and which of those endpoints are public versus authenticated. All claims are sourced from Coinbase primary documentation (`docs.cdp.coinbase.com`), Coinbase's own GitHub repositories, or — for the deployment constraints in §5 — Vercel's own documentation (`vercel.com/docs`), linked inline on the sentence making the claim. Where a page 404s or a fact could not be confirmed, that is stated explicitly rather than filled in. Where the SDK source is the only place a behaviour is recorded, the source file is cited and labelled as SDK source rather than prose docs. Researched 2026-08-05.

This is a companion to [`coinbase-advanced-trade-api.md`](./coinbase-advanced-trade-api.md) (issue #92), which covers auth, orders, fills and fee tiers. Auth mechanics are not repeated here except where they differ.

---

## 1. Watchlists — the negative result

### 1.1 There is no watchlist endpoint

**The Advanced Trade API exposes no endpoint to read, create, or modify a user's watchlist.** This is stated plainly because it is load-bearing for issue #97.

The evidence:

- The [Advanced Trade API Endpoints](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api) page is the complete brokerage endpoint index. It lists 42 authenticated endpoints (accounts, orders, products, transaction summary, convert, portfolios, CFM futures, INTX perpetuals, payment methods, key permissions) and 6 public endpoints (`/time`, `/market/product_book`, `/market/products`, `/market/products/{product_id}`, `/market/products/{product_id}/candles`, `/market/products/{product_id}/ticker`). **No endpoint on that page relates to watchlists, favorites, saved products, or starred assets.**
- Coinbase's official Python SDK [`coinbase-advanced-py`](https://github.com/coinbase/coinbase-advanced-py) has one method module per endpoint family (`accounts.py`, `orders.py`, `products.py`, `market_data.py`, `public.py`, `portfolios.py`, `fees.py`, `futures.py`, `perpetuals.py`, `payments.py`, `convert.py`, `data_api.py`). There is **no watchlist module and no method whose name contains "watch"** — a repo-wide grep for `watchlist` in the SDK returns nothing outside the `watched` response field discussed below. (Verified against a fresh clone of `master`; this is SDK source, not prose docs.)
- The TypeScript sample SDK [`advanced-sdk-ts`](https://github.com/coinbase-samples/advanced-sdk-ts) has the same service layout (`accounts`, `convert`, `data`, `fees`, `futures`, `orders`, `paymentMethods`, `perpetuals`, `portfolios`, `products`, `public`) and likewise has no watchlist service. The only occurrence of "watch" in its model layer is the `watched` field on [`src/model/Product.ts`](https://github.com/coinbase-samples/advanced-sdk-ts/blob/main/src/model/Product.ts).

### 1.2 The one thing that is *not* nothing: `product.watched`

Every product object returned by List Products / Get Product carries a required boolean field:

| Field | Type | Documented description |
|---|---|---|
| `watched` | boolean (required) | "Whether or not the product is on the user's watchlist" |

That description is quoted verbatim from [Get Product](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product), and the same field with the same description appears on [List Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/list-products) and on the public [List Public Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/list-public-products). The [Get Product](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product) example response shows `"watched": true`. The TS SDK's model comment repeats it: `Whether or not the product is on the user's watchlist.` ([`src/model/Product.ts`](https://github.com/coinbase-samples/advanced-sdk-ts/blob/main/src/model/Product.ts)).

So a watchlist *concept* exists inside Coinbase and is surfaced as a per-product flag. But:

- **There is no filter.** [List Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/list-products) has no `watched` query parameter — the documented params are `limit`, `offset`, `product_type`, `product_ids`, `contract_expiry_type`, `expiring_contract_status`, `get_tradability_status`, `get_all_products`, `products_sort_order`, `cursor`, `futures_underlying_type`, `user_country_code`, `expired`. Reading the watchlist would mean paging the entire product catalogue and filtering client-side.
- **There is no write path.** Nothing in the endpoint index sets `watched`.
- **I could not confirm that `watched` is actually populated for a CDP-key-authenticated request.** The field is documented as required and appears identically on the *public* (keyless) product schema, where there is no user to have a watchlist. Whether an authenticated `/api/v3/brokerage/products` call reflects the watchlist the user curated in the Coinbase app, or always returns `false`, is **not stated on any page I could reach and needs a live call with a real View-only key to settle.** Do not design against it until it is verified.

**Judgement call (labelled as such):** even in the best case where `watched` is correctly populated, it is read-only, unfilterable, requires a full catalogue scan, and is undocumented as to which of the user's several watchlists it reflects. It is not a usable backing store for a watchlist feature.

### 1.3 The nearest substitutes, and why each fails

| Candidate | What it actually is | Why it is not a watchlist |
|---|---|---|
| `GET /api/v3/brokerage/portfolios` | "Portfolio is the identifying information for a portfolio" — returns `portfolios[]` of `{name, uuid, type, deleted}`, filterable by `portfolio_type` (`UNDEFINED \| DEFAULT \| CONSUMER \| INTX`) ([List Portfolios](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/portfolios/list-portfolios)) | A portfolio is a **funds container**, not a list of assets you're interested in. It has no product list at all in the list response. Adding an asset to a portfolio means moving money. |
| `GET /api/v3/brokerage/accounts` | One account per currency, with `available_balance` and `hold` ([List Accounts](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/accounts/list-accounts)) | This is **what you own**, not what you're watching. It cannot express "I want to track SOL-USD but hold none of it" — the exact case a watchlist exists for. Coinbase does create zero-balance accounts for many currencies, so the accounts list is also *too broad* to read as intent. |
| `GET /api/v3/brokerage/products` | The full tradable catalogue ([List Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/list-products)) | Every tradable pair on the venue. Universe, not selection. |
| `product.watched` | Per-product boolean, §1.2 | Unfilterable, unwritable, and unverified as to whether it is populated. |
| `GET /api/v3/brokerage/key_permissions` | `can_view` / `can_trade` / `can_transfer` / `portfolio_uuid` / `portfolio_type` ([Get API Key Permissions](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/data-api/get-api-key-permissions)) | Tells you which single portfolio the key is scoped to. Nothing about product interest. |

**Conclusion for #97: the watchlist must be modelled in-app.** Supabase Postgres with RLS, one row per (user, product_id), is the only path. Coinbase supplies the *universe* (`/products`) and the *quotes* (`/products/{id}` price, candles, ticker); it does not supply the *selection*.

---

## 2. Products

### 2.1 Endpoints

| Purpose | Method + path | Auth |
|---|---|---|
| List tradable products | `GET /api/v3/brokerage/products` | Authenticated |
| Get one product | `GET /api/v3/brokerage/products/{product_id}` | Authenticated |
| List tradable products (public) | `GET /api/v3/brokerage/market/products` | Public — see §6 |
| Get one product (public) | `GET /api/v3/brokerage/market/products/{product_id}` | Public — see §6 |

Sources: [Advanced Trade API Endpoints](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api), [List Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/list-products), [Get Product](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product), [List Public Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/list-public-products).

The Python SDK's README states directly that the public and authenticated variants are equivalent: "It does *not* require authentication and is the public counterpart to Get Products, which *does* require authentication. **Both endpoints return the same data.**" ([coinbase-advanced-py README](https://github.com/coinbase/coinbase-advanced-py/blob/master/README.md)).

### 2.2 Query parameters — List Products

Verified against [List Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/list-products). Descriptions quoted verbatim.

| Param | Type | Description / default |
|---|---|---|
| `limit` | int32 | "The number of products to be returned." No documented default or maximum. |
| `offset` | int32 | "The number of products to skip before returning." |
| `product_type` | enum | "Only returns products matching this product type. **If omitted, only SPOT products are returned.**" Default sentinel `UNKNOWN_PRODUCT_TYPE`. Values: `SPOT`, `FUTURE`, `EQUITY`, `OPTION_GROUP`, `FUTURE_GROUP`. |
| `product_ids` | array[string] | "The list of trading pairs (e.g. 'BTC-USD')." |
| `contract_expiry_type` | enum | "Only applicable if product_type is set to FUTURE." |
| `expiring_contract_status` | enum | "Only returns contracts with this status (default is UNEXPIRED)." |
| `get_tradability_status` | bool | "Whether or not to populate `view_only` with the tradability status of the product. This is only enabled for SPOT products." |
| `get_all_products` | bool | "If true, return all products of all product types (including expired futures contracts)." |
| `products_sort_order` | enum | "By default, products are returned in **24 hour volume descending (in quote)**." |
| `cursor` | string | "a base64 encoded string that decodes into the last productId of the previously returned page" |
| `futures_underlying_type` | enum | FUTURE only. |
| `user_country_code` | string | "used to provide differentiated product display names" |
| `expired` | bool | Deribit venue only; defaults false. |

Two consequences worth flagging. First, **omitting `product_type` gives you SPOT only** — which is exactly what this module wants, so the default is friendly here. Second, the default sort is 24h quote volume descending, so `limit=50` without a sort override gives you "the 50 most-traded pairs," a reasonable default universe for a picker.

Note a divergence between docs and SDK: Coinbase's own Python `get_products()` only forwards `limit, offset, product_type, product_ids, contract_expiry_type, expiring_contract_status, get_tradability_status, get_all_products` — it does **not** expose `cursor`, `products_sort_order`, `user_country_code`, `futures_underlying_type` or `expired` ([`coinbase/rest/products.py`](https://github.com/coinbase/coinbase-advanced-py/blob/master/coinbase/rest/products.py)). That is SDK lag behind the reference, not evidence the params don't exist; hand-rolled `fetch` can use all of them.

`Get Product` takes only the `product_id` path param plus `get_tradability_status`.

### 2.3 Product object — the verified field list

The following is the complete documented field set from [Get Product](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product), cross-checked against [List Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/list-products). Descriptions are quoted from the reference. **Every price/size/volume field is a string.**

| Field | Type | Required | Description |
|---|---|---|---|
| `product_id` | string | ✓ | The trading pair (e.g. `BTC-USD`) |
| `price` | string | ✓ | "The current price for the product, in quote currency" |
| `price_percentage_change_24h` | string | ✓ | "The amount the price changed, in percent, in the last 24 hours" |
| `volume_24h` | string | ✓ | "The trading volume for the product in the last 24 hours" |
| `volume_percentage_change_24h` | string | ✓ | 24h volume change, percent |
| `base_increment` | string | ✓ | "Minimum amount base value can be increased or decreased at once" |
| `quote_increment` | string | ✓ | Same, quote side |
| `quote_min_size` | string | ✓ | "Minimum size that can be represented of quote currency" |
| `quote_max_size` | string | ✓ | Maximum, quote |
| `base_min_size` | string | ✓ | Minimum, base |
| `base_max_size` | string | ✓ | Maximum, base |
| `base_name` | string | ✓ | "Name of the base currency" (e.g. `Bitcoin`) |
| `quote_name` | string | ✓ | "Name of the quote currency" (e.g. `US Dollar`) |
| `watched` | boolean | ✓ | "Whether or not the product is on the user's watchlist" — see §1.2 |
| `is_disabled` | boolean | ✓ | "Whether or not the product is disabled for trading" |
| `new` | boolean | ✓ | "Whether or not the product is 'new'" |
| `status` | string | ✓ | Status of the product (example value `"online"`) |
| `cancel_only` | boolean | ✓ | "Whether or not orders of the product can only be cancelled, not placed or edited" |
| `limit_only` | boolean | ✓ | "Whether or not orders of the product can only be limit orders, not market orders" |
| `post_only` | boolean | ✓ | "Whether or not orders of the product can only be posted, not cancelled" |
| `trading_disabled` | boolean | ✓ | "Whether or not the product is disabled for trading **for all market participants**" |
| `auction_mode` | boolean | ✓ | "Whether or not the product is in auction mode" |
| `base_display_symbol` | string | ✓ | e.g. `BTC` |
| `quote_display_symbol` | string | ✓ | e.g. `USD` |
| `base_currency_id` | string | | "Symbol of the base currency" |
| `quote_currency_id` | string | | "Symbol of the quote currency" |
| `product_type` | string | | `UNKNOWN_PRODUCT_TYPE \| SPOT \| FUTURE \| EQUITY \| OPTION_GROUP \| FUTURE_GROUP` |
| `mid_market_price` | string | | "The current midpoint of the bid-ask spread, in quote currency" |
| `alias` | string | | "Product id for the corresponding unified book" |
| `alias_to` | array[string] | | "Product ids that this product serves as an alias for" |
| `view_only` | boolean | | "Reflects whether an FCM product has expired. For SPOT, set `get_tradability_status` to get a return value here. Defaulted to false for all other product types" |
| `price_increment` | string | | "Minimum amount price can be increased or decreased at once" |
| `display_name` | string | | e.g. `BTC PERP` |
| `product_venue` | string | | "The sole venue id for the product" |
| `approximate_quote_24h_volume` | string | | 24h volume approximated in current quote |
| `new_at` | RFC3339 | | "The timestamp when the product was listed (populated if product has new tag)" |
| `market_cap` | string | | "The market capitalization of the product's base asset" |
| `icon_color` | string | | Brand colour for the asset icon |
| `icon_url` | string | | "A URL to the icon image" |
| `display_name_overwrite` | string | | Alternative display name |
| `about_description` | string | | "Description used in about section for an asset" |
| `best_bid_price` | string | | Best bid |
| `best_ask_price` | string | | Best ask |
| `high_24h` | string | | 24-hour high |
| `low_24h` | string | | 24-hour low |
| `fcm_trading_session_details` | object | | FCM trading session info (futures) |
| `future_product_details` | object | | Futures-only |
| `equity_product_details` | object | | "Populated when product_type is EQUITY" |

Fields the issue asked about that are **confirmed present**: `product_id`, `base_currency_id`, `quote_currency_id`, `price`, `price_percentage_change_24h`, `volume_24h`, `base_increment`, `quote_increment`, `quote_min_size`, `quote_max_size`, `base_min_size`, `base_max_size`, `status`, `trading_disabled`, `is_disabled`, `new`, `cancel_only`, `limit_only`, `post_only`, `auction_mode`, `product_type`, `fcm_trading_session_details`, `mid_market_price`.

Fields the issue did not name but which are **operationally valuable and confirmed present**: `icon_url`, `icon_color`, `display_name`, `about_description`, `market_cap`, `high_24h`, `low_24h`, `best_bid_price`, `best_ask_price`, `price_increment`, `base_name`, `quote_name`. Together those make the product object a complete quote card without a second call.

**Note on `status`:** the reference documents it as "Status of the product" with example `"online"` but **does not publish the enum of possible values.** Treat it as an opaque string and gate on the booleans (`trading_disabled`, `is_disabled`, `cancel_only`, `limit_only`, `post_only`, `auction_mode`) instead, which are precisely defined.

Example response, verbatim from [Get Product](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product):

```json
{
  "product_id": "BTC-USD",
  "price": "140.21",
  "price_percentage_change_24h": "9.43%",
  "volume_24h": "1908432",
  "volume_percentage_change_24h": "9.43%",
  "base_increment": "0.00000001",
  "quote_increment": "0.00000001",
  "quote_min_size": "0.00000001",
  "quote_max_size": "1000",
  "base_min_size": "0.00000001",
  "base_max_size": "1000",
  "base_name": "Bitcoin",
  "quote_name": "US Dollar",
  "watched": true,
  "is_disabled": false,
  "new": true,
  "status": "online",
  "cancel_only": false,
  "limit_only": false,
  "post_only": false,
  "trading_disabled": false,
  "auction_mode": false,
  "product_type": "SPOT",
  "base_display_symbol": "BTC",
  "quote_display_symbol": "USD",
  "mid_market_price": "140.22"
}
```

Note that `price_percentage_change_24h` in the official example is **`"9.43%"` — a string with a trailing percent sign**, not a bare decimal. That is what the reference publishes. Whether the live API returns `"9.43"` or `"9.43%"` **I could not confirm without a live call**; parse defensively (strip a trailing `%` before decimal conversion).

### 2.4 List Products response envelope

The list response wraps products in an envelope. [List Public Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/list-public-products) documents:

```json
{
  "products": [ /* Product objects */ ],
  "num_products": 123,
  "pagination": {
    "prev_cursor": "string",
    "next_cursor": "string",
    "has_next": true,
    "has_prev": true
  }
}
```

Coinbase's Python SDK only unpacks `products` and `num_products` from this response ([`coinbase/rest/types/product_types.py`](https://github.com/coinbase/coinbase-advanced-py/blob/master/coinbase/rest/types/product_types.py), `ListProductsResponse`) — the remainder lands in the base response's passthrough. The SDK also exposes no `cursor` param, so **the SDK cannot cursor-paginate products; it can only `limit`/`offset`.** That is SDK source, not prose docs. Hand-rolled `fetch` can use `cursor`.

### 2.5 How a product id is formed

A product id is `{BASE}-{QUOTE}` using the display symbols — `BTC-USD`, `ETH-USD`, `SOL-USD`. The reference describes `product_id` as "The trading pair (e.g. 'BTC-USD')" throughout ([Get Product](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product)), and the product object carries `base_display_symbol` / `quote_display_symbol` which compose to it in every published example.

Do **not** construct product ids by string-concatenating an asset symbol with `-USD` and assuming it exists. Resolve them: call `/products` (SPOT default), index by `product_id`, and treat that index as the authoritative set. `alias` and `alias_to` exist precisely because some ids are aliases onto a unified book — "Product id for the corresponding unified book" and "Product ids that this product serves as an alias for" ([Get Product](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product)) — so a naïvely constructed id can resolve to a different book than the one the user sees in the app.

Also note: an account currency (from `/accounts`, e.g. `BTC`) is **not** a product id. Mapping holdings to quotes requires joining `account.currency` → `product.base_currency_id` for products whose `quote_currency_id` is your display currency.

---

## 3. Market data: current price / ticker

There are **four** ways to get a current price, with different costs and semantics.

| Source | Endpoint | What you get | Cost |
|---|---|---|---|
| Product object | `GET /products` or `GET /products/{id}` | `price`, `mid_market_price`, `best_bid_price`, `best_ask_price`, `price_percentage_change_24h`, `volume_24h`, `high_24h`, `low_24h` | **1 call for N products** via `product_ids[]` |
| Market trades ("ticker") | `GET /products/{product_id}/ticker` | Last N trades + `best_bid` + `best_ask` | 1 call **per product** |
| Best bid/ask | `GET /best_bid_ask` | Top-of-book bids/asks for many products | 1 call for N products, **auth only** |
| Product book | `GET /product_book` | Full order book depth, `last`, `mid_market`, `spread_bps`, `spread_absolute` | 1 call per product |

### 3.1 The product object's own price — the cheapest path

Because [List Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/list-products) accepts `product_ids` as an array, **one call returns a full quote card for every product on a watchlist**: `price` ("The current price for the product, in quote currency"), plus 24h change, 24h volume, 24h high/low, best bid/ask, mid-market price and the display metadata. For a watchlist view this is strictly the best trade-off — N products, one request.

Trade-off: the docs do not state how fresh `price` is, and the public `/market/*` variant is explicitly cached for 1 second (§6.1). For a personal read-only dashboard that is irrelevant; for anything latency-sensitive it would not be.

### 3.2 `GET /products/{product_id}/ticker` — despite the name, this is Market Trades

The endpoint index labels it **"Get Market Trades — GET `/products/{product_id}/ticker`"** ([Advanced Trade API Endpoints](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api)). The path says ticker; the payload is a trade tape. Per [Get Market Trades](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-market-trades):

Params: `product_id` (path), `limit` (**required**, "Number of trades to return"), `start` and `end` (optional UNIX timestamps).

```json
{
  "trades": [
    {
      "trade_id": "34b080bf-fcfd-445a-832b-46b5ddc65601",
      "product_id": "BTC-USD",
      "price": "140.91",
      "size": "4",
      "time": "2021-05-31T09:59:59Z",
      "side": "BUY",
      "exchange": "string"
    }
  ],
  "best_bid": "291.13",
  "best_ask": "292.40"
}
```

`best_bid` is "The best bid for the `product_id`, in quote currency" and `best_ask` the equivalent. The Python SDK describes the endpoint as "Get snapshot information, by product ID, about the last trades (ticks), best bid/ask, and 24h volume" ([`coinbase/rest/public.py`](https://github.com/coinbase/coinbase-advanced-py/blob/master/coinbase/rest/public.py)) — note that SDK docstring mentions 24h volume, which **the reference's published response schema does not show**; I could not confirm a `volume_24h` field on this response.

**Trade-off:** last-traded price with sub-second granularity and the actual tape, but one call per product and `limit` is mandatory. Use it when you want "what just happened" on a single product detail page, not for a watchlist grid.

### 3.3 `GET /api/v3/brokerage/best_bid_ask`

Per [Get Best Bid/Ask](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-best-bid-ask): optional `product_ids` array ("The list of trading pairs (e.g. 'BTC-USD')"), and the response is a list of pricebooks:

```json
{
  "pricebooks": [
    {
      "product_id": "BTC-USD",
      "bids": [{ "price": "string", "size": "string" }],
      "asks": [{ "price": "string", "size": "string" }],
      "time": "RFC3339 Timestamp"
    }
  ]
}
```

**Trade-off:** true top-of-book for many products in one call, with sizes and a timestamp — better than `price` if you need a spread. But it is listed under the **authenticated** endpoints, and **there is no `/market/best_bid_ask` public counterpart** on [the endpoint index](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api) — the public family is only `product_book`, `products`, `products/{id}`, `candles`, `ticker`. If you want top-of-book without auth, use the public `product_book` or read `best_bid_price`/`best_ask_price` off the product object.

The public order-book alternative is `GET /api/v3/brokerage/market/product_book` (params `product_id` required, `limit`, `aggregation_price_increment`), returning `pricebook.{product_id,bids,asks,time}` plus `last`, `mid_market`, `spread_bps` and `spread_absolute` ([Get Public Product Book](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/get-public-product-book)). `spread_bps` in particular has no equivalent anywhere else.

### 3.4 Recommendation

For a watchlist grid: **one `GET /products?product_ids[]=…` call**, read `price`, `price_percentage_change_24h`, `volume_24h`, `high_24h`, `low_24h`, `icon_url`, `display_name`. For a product detail page: add `GET /products/{id}/ticker?limit=…` for the recent tape and `GET /market/product_book?product_id=…` if you want spread. Skip `best_bid_ask` unless you specifically need multi-product top-of-book, since the product object already carries `best_bid_price`/`best_ask_price`.

---

## 4. Market data: historical candles

### 4.1 Endpoints

| Variant | Path |
|---|---|
| Authenticated | `GET /api/v3/brokerage/products/{product_id}/candles` |
| Public | `GET /api/v3/brokerage/market/products/{product_id}/candles` |

Sources: [Get Product Candles](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product-candles), [Get Public Product Candles](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/get-public-product-candles).

### 4.2 Parameters

| Param | Required | Description (verbatim) | Default |
|---|---|---|---|
| `product_id` | ✓ (path) | "The trading pair (e.g. 'BTC-USD')." | — |
| `start` | ✓ | "The UNIX timestamp indicating the start of the time interval." | — |
| `end` | ✓ | "The UNIX timestamp indicating the end of the time interval." | — |
| `granularity` | ✓ | "The timeframe each candle represents." | `UNKNOWN_GRANULARITY` |
| `limit` | | "The number of candle buckets to be returned. **By default, returns 350 (max 350).**" | 350 |

`start` and `end` are **UNIX seconds passed as strings**, not milliseconds and not RFC3339. The reference types them as string and the example candle `start` is `"1639508050"` — a 10-digit seconds value. Coinbase's Python SDK types them `start: str, end: str` and passes them through untouched ([`coinbase/rest/market_data.py`](https://github.com/coinbase/coinbase-advanced-py/blob/master/coinbase/rest/market_data.py)) — SDK source, corroborating the string-seconds reading.

### 4.3 Granularity enum — the exact values

Both the authenticated and public reference pages publish the identical enum:

```
UNKNOWN_GRANULARITY   (default sentinel — will be rejected)
ONE_MINUTE
FIVE_MINUTE
FIFTEEN_MINUTE
THIRTY_MINUTE
ONE_HOUR
TWO_HOUR
FOUR_HOUR
SIX_HOUR
ONE_DAY
```

These are **named string constants, not integer seconds.** That matters because the older Coinbase Exchange (Pro) candles endpoint uses integer seconds and is documented separately at [Exchange: Get product candles](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles), where "The granularity field must be one of the following 'second' values: `{60, 300, 900, 3600, 21600, 86400}`, or your request is rejected." **Do not carry Exchange's integer granularities into Advanced Trade.** Note also that Advanced Trade has `THIRTY_MINUTE`, `TWO_HOUR` and `FOUR_HOUR` buckets that Exchange does not.

### 4.4 Max candles per request — contradiction, resolved

The issue flagged this as historically unstable, and there **is** a live contradiction between two current Coinbase pages — but they are for two different APIs:

- **Advanced Trade** says 350: "The number of candle buckets to be returned. By default, returns 350 (max 350)." ([Get Product Candles](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product-candles), and identically on [Get Public Product Candles](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/get-public-product-candles)).
- **Exchange** says 300: "If data points are readily available, your response may contain as many as 300 candles and some of those candles may precede your declared start value." ([Exchange: Get product candles](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles)).

**Safest choice (judgement call):** treat **350** as the Advanced Trade ceiling, because both Advanced Trade reference pages agree on it and the 300 figure belongs to a different product's endpoint. Then, to be robust against the number changing again, **request `limit` explicitly rather than relying on the default, chunk by `(end - start) / granularity_seconds ≤ limit`, and never assume the response contains every bucket you asked for** — the Exchange page's warning that "Historical rate data may be incomplete. No data is published for intervals where there are no ticks" is a general property of candle APIs and the Advanced Trade page publishes no contrary guarantee.

Practical span per request at `limit=350`: ~5.8h at `ONE_MINUTE`, ~29h at `FIVE_MINUTE`, ~14.6d at `ONE_HOUR`, ~350d at `ONE_DAY`. A one-year daily chart is one request. A one-year hourly chart is 26.

### 4.5 Candle object

```json
{
  "candles": [
    {
      "start": "1639508050",
      "low": "140.21",
      "high": "140.21",
      "open": "140.21",
      "close": "140.21",
      "volume": "56437345"
    }
  ]
}
```

| Field | Description (verbatim) |
|---|---|
| `start` | "The UNIX timestamp indicating the start of the time interval." |
| `low` | "Lowest price during the bucket interval." |
| `high` | "Highest price during the bucket interval." |
| `open` | "Opening price (first trade) in the bucket interval." |
| `close` | "Closing price (last trade) in the bucket interval." |
| `volume` | "Volume of trading activity during the bucket interval." |

All six are **strings**, including `start`. This is an object-per-candle shape, unlike Exchange's positional-array shape (`[timestamp, price_low, price_high, price_open, price_close]` per the [Exchange page](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles)) — another reason not to reuse Exchange parsing code.

**Not confirmed:** whether candles are returned newest-first or oldest-first, and whether `start` is inclusive of the bucket start. Neither reference page states an ordering guarantee. Sort by `start` on receipt rather than trusting the wire order.

---

## 5. Real-time: WebSocket vs polling on Vercel Hobby

### 5.1 The feed exists

| Interface | URL |
|---|---|
| WebSocket, market data | `wss://advanced-trade-ws.coinbase.com` |
| WebSocket, user data | `wss://advanced-trade-ws-user.coinbase.com` |

Source: [Advanced Trade API reference introduction](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/introduction) and [WebSocket Overview](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-overview).

### 5.2 Channels and which need auth

Per [Advanced Trade WebSocket Channels](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-channels) and [the WebSocket guide](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/websocket):

| Channel | Delivers | Auth |
|---|---|---|
| `heartbeats` | "Real-time server pings to keep all connections open" | Public |
| `candles` | Candle updates, "every second", bucketed in **five minutes** | Public |
| `status` | "Sends all products and currencies on a preset interval" | Public |
| `ticker` | "Real-time price updates every time a match happens" | Public |
| `ticker_batch` | Same as `ticker` but batched — latest price every 5 seconds if changed | Public |
| `level2` | Order-book snapshot + updates (`price_level`, `new_quantity`, `event_time`, `side`) | Public |
| `market_trades` | "Real-time updates every time a market trade happens" | Public |
| `user` | Open orders and positions | **Auth required** |
| `futures_balance_summary` | "Updates on all of a user's futures balances" | **Auth required** |
| `subscriptions` | — see caveat below | — |

The guide states: **"Public channels do not require authentication, so you can simply send a subscription message after establishing the WebSocket connection."** Only `user` and `futures_balance_summary` require a JWT.

**Could not confirm:** the issue listed `subscriptions` as a channel. It does **not** appear in the channel table on the channels page. It is almost certainly the *server's confirmation message type* echoed back after a `subscribe`, not a channel you subscribe to — but I could not find a primary page stating that, so treat it as unconfirmed.

Subscribe message shape ([channels page](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-channels)):

```json
{
  "type": "subscribe",
  "channel": "ticker",
  "product_ids": ["ETH-USD", "BTC-USD"],
  "jwt": "XYZ"
}
```

Connection lifecycle: **"you are disconnected if no `subscribe` has been received within 5 seconds"** ([WebSocket Overview](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-overview)), and for authenticated channels a fresh JWT is needed per message since JWTs expire after 2 minutes.

WebSocket rate limits ([Advanced Trade WebSocket Rate Limits](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-rate-limits)):

- "Advanced Trade API WebSocket connections are rate-limited at **8 per second per IP address**."
- "Advanced Trade API WebSocket unauthenticated messages are rate-limited at **8 per second per IP address**."

**Could not confirm:** any limit on the *number of concurrent connections* or the *number of product_ids per subscription*. The page publishes only the two per-second figures.

### 5.3 Vercel Hobby: what the platform actually allows

The constraints, from Vercel's own docs, are more nuanced than "serverless can't do WebSockets" — that statement is now **out of date**:

- **Vercel Functions can serve WebSockets.** "Vercel Functions can serve WebSocket connections, keeping a bidirectional connection open between a client and your server-side code," and "WebSockets require Fluid compute to be enabled. This is the default for new projects created on or after April 23, 2025." ([WebSockets](https://vercel.com/docs/functions/websockets)). Next.js specifically needs `experimental_upgradeWebSocket()` from `@vercel/functions`, because "Next.js does not expose an API for handling WebSocket upgrades."
- **But function duration caps it.** With Fluid compute, Node.js functions get **"Hobby: 300s default and maximum"** — no extension available on Hobby; Pro/Enterprise get 800s and an 1800s beta ([Vercel Functions Limits](https://vercel.com/docs/functions/limitations)). And explicitly: **"WebSocket connections close when a Vercel Function reaches its maximum duration."**
- **And there is still no always-on process.** Functions are request-driven; a connection exists only while an invocation is alive, and "New WebSocket connections are not guaranteed to reach the same Vercel Function instance," so state must live "in an external data store instead of relying on in-memory variables" ([WebSockets](https://vercel.com/docs/functions/websockets)).
- **Cron on Hobby: available, but daily only.** This corrects the assumption in the issue. Per [Usage & Pricing for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing), Hobby gets **100 cron jobs per project**, **minimum interval "Once per day"**, **scheduling precision "Per-hour (±59 min)"**. The page is explicit: *"Hobby accounts are limited to cron jobs that run once per day. Cron expressions that would run more frequently will fail during deployment"* — `0 * * * *` or `*/30 * * * *` fail deployment with the error *"Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day."* And *"a cron job configured as `0 1 * * *` (every day at 1 am) will trigger anywhere between 1:00 am and 1:59 am."* Pro raises this to once per minute with per-minute precision.
- Hobby usage budget for context: **1,000,000 invocations, 4 CPU-hrs Active CPU, 360 GB-hrs Provisioned Memory, 100 GB Fast Data Transfer** per month ([Limits](https://vercel.com/docs/limits)). A held-open WebSocket bills Function usage "while the connection is active" ([WebSockets](https://vercel.com/docs/functions/websockets)) — 4 CPU-hrs is only ~2.4 hours of a single continuously-provisioned instance's *wall* time before other headroom concerns, though idle socket wait is I/O and does not count toward Active CPU ("Waiting for I/O … does not count towards active CPU time", [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)). Provisioned Memory time, however, does accrue while the instance is alive.

### 5.4 Verdict on architecture

**A persistent server-side WebSocket subscription to Coinbase is not viable on Vercel Hobby.** Not because WebSockets are unsupported — they now are — but because:

1. Any function holding the upstream socket dies at **300s**, hard-capped on Hobby.
2. Nothing wakes it back up. Hobby cron fires **at most once per day**, so there is no scheduled re-connect loop; you would need an external pinger, which is outside the deployment.
3. Even if it stayed alive, there is no place to put the received ticks that the next request would see, without adding a store and a fan-out mechanism — a lot of machinery for a personal read-only dashboard.

**REST polling, request-driven (on page load, on user action, on a client-side interval), is the realistic path**, and it is a good fit: one `GET /products?product_ids[]=…` call refreshes an entire watchlist grid (§3.4), and candles are historical and therefore cacheable indefinitely for closed buckets.

**Third option: a browser-side WebSocket from a client component.** This *is* viable, and the docs support it directly:

- The public channels — `ticker`, `ticker_batch`, `level2`, `candles`, `market_trades`, `status`, `heartbeats` — **can be subscribed to unauthenticated**: "Public channels do not require authentication, so you can simply send a subscription message after establishing the WebSocket connection" ([WebSocket guide](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/websocket)). No key ever reaches the browser, so the module's read-only, server-only-secrets invariant is preserved.
- What it solves: live price ticks on an open tab, at zero server cost and zero function duration risk. `ticker_batch` (5-second batching) is the right channel for a watchlist grid — `ticker` fires on every match and will flood a 20-row table.
- What it does **not** solve: nothing server-side. No persistence, no alerts when the tab is closed, no historical backfill, no data for server-rendered pages. The first paint still needs REST. Rate limits are then **per end-user IP** (8 connections/sec, 8 unauthenticated messages/sec) rather than pooled — generally a benefit, though it does put the burden on the client's network.
- Caveat: Coinbase's Python SDK README notes **"Unauthenticated requests are rate-limited more aggressively. Because of this we recommend that you authenticate your requests"** ([coinbase-advanced-py README](https://github.com/coinbase/coinbase-advanced-py/blob/master/README.md)) — stated for REST but the sentiment plausibly extends to WS. The specific unauthenticated limits are not published.

**Recommended shape (judgement call):** server-side REST on render for correctness and first paint; optional browser-side `ticker_batch` subscription layered on top for live movement. Ship the REST path first; the WS layer is purely additive polish.

---

## 6. Auth and rate limits

### 6.1 Public vs authenticated, endpoint by endpoint

The [Advanced Trade API Endpoints](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api) page states plainly: **"Public endpoints do not require authentication."** and **"1s cache is enabled for all public endpoints. If you need real-time data, please choose one of the following options:"** — the alternatives being WebSocket (recommended for fastest updates), sending a `cache-control: no-cache` header, or using the authenticated endpoints instead.

| Endpoint | Public variant | Verdict |
|---|---|---|
| `GET /products` | `GET /market/products` | **Both exist.** Public returns the same data ([SDK README](https://github.com/coinbase/coinbase-advanced-py/blob/master/README.md)). |
| `GET /products/{id}` | `GET /market/products/{id}` | **Both exist.** |
| `GET /products/{id}/candles` | `GET /market/products/{id}/candles` | **Both exist.** |
| `GET /products/{id}/ticker` (market trades) | `GET /market/products/{id}/ticker` | **Both exist.** |
| `GET /product_book` | `GET /market/product_book` | **Both exist.** |
| `GET /best_bid_ask` | — | **Authenticated only.** No `/market/best_bid_ask` on the endpoint index. |
| `GET /portfolios` | — | Authenticated (View permission). |
| `GET /accounts` | — | Authenticated (View permission). |
| `GET /key_permissions` | — | Authenticated. |
| `GET /time` | `GET /time` | Listed under public endpoints. |

**A genuine contradiction between two Coinbase pages.** The [endpoint index](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api) says public endpoints need no auth. But the individual API-reference pages for the public family — [List Public Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/list-public-products), [Get Public Market Trades](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/get-public-market-trades), [Get Public Product Book](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/get-public-product-book) — each render a security scheme requiring **"A JWT signed using your CDP API Key Secret, encoded in base64"** as a bearer token, identical to the private endpoints.

Coinbase's own SDK breaks the tie. `coinbase/rest/public.py` calls every `/market/*` path with an explicit `public=True` flag, and its docstrings say verbatim **"This endpoint is public and does not need authentication."**; the transport layer only attaches `Authorization: Bearer …` when `self.is_authenticated`, and rejects unauthenticated calls only for non-public endpoints (`if not self.is_authenticated and not public:` in [`coinbase/rest/rest_base.py`](https://github.com/coinbase/coinbase-advanced-py/blob/master/coinbase/rest/rest_base.py)). The README confirms: "Both clients contain public endpoints which can be accessed without authentication. To do so, simply initialize the clients without providing any API keys as arguments."

**Safest choice (judgement call):** the `/market/*` family genuinely works unauthenticated — the security block on the reference pages is a boilerplate artefact of the shared OpenAPI security scheme, not a real requirement. **But send the JWT anyway.** Reasons: the module already signs JWTs for accounts/orders/fills, so it costs nothing; the SDK README warns "Unauthenticated requests are rate-limited more aggressively"; and authenticated endpoints bypass the 1-second public cache. Use the **authenticated** `/products`, `/products/{id}/candles`, `/products/{id}/ticker` paths as the primary, and keep the `/market/*` paths as a documented fallback for any future client-side or key-less use.

### 6.2 REST rate limits — re-verified independently, still unconfirmed

Issue #92 reported the REST rate-limit page as gone. **I re-checked this from scratch and reach the same conclusion.**

- `https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rate-limits` → **HTTP 404**.
- `https://docs.cdp.coinbase.com/advanced-trade/docs/rest-api-rate-limits` — the historically-cited URL — **resolves but renders as the generic "Welcome to Advanced Trade API" overview**, containing no rate-limit numbers whatsoever. Fetched and inspected: it covers interfaces, tradable markets and the September 2026 derivatives migration, and nothing else. The owning page is effectively gone; the URL survives as a redirect into an unrelated page.
- Site search across `docs.cdp.coinbase.com` for Advanced Trade REST rate limits surfaces only the **WebSocket** rate-limit page, plus rate-limit pages belonging to *other* Coinbase products (Exchange, International Exchange, Coinbase App v2, CDP v2). None of those is stated to govern `/api/v3/brokerage/*`.
- The [Advanced Trade API reference introduction](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/introduction) publishes base URLs but **no rate-limit section**.

**So: I could not confirm any documented REST requests-per-second limit for `/api/v3/brokerage/*` from a currently-reachable primary Coinbase page.** This independently reproduces #92's finding rather than restating it.

What *is* citable:

- **WebSocket**: 8 connections/sec/IP and 8 unauthenticated messages/sec/IP ([Advanced Trade WebSocket Rate Limits](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/websocket/websocket-rate-limits)).
- **Public REST caching**: "1s cache is enabled for all public endpoints" ([Advanced Trade API Endpoints](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api)) — a de facto throttle on how often polling the public family can yield new data.
- **Directional, from SDK docs rather than a limits page**: "Unauthenticated requests are rate-limited more aggressively. Because of this we recommend that you authenticate your requests" ([coinbase-advanced-py README](https://github.com/coinbase/coinbase-advanced-py/blob/master/README.md)). This confirms two different regimes exist without giving either number.

**Practical stance:** authenticate everything, cache aggressively, poll at human speed (page load / explicit refresh / a client interval of ≥5s), and treat `429` as expected with exponential backoff.

---

## 7. What this means for the module

### 7.1 The watchlist must be an in-app model — this is settled

Issue #97 ("Watchlist representation") has no upstream to defer to. Coinbase provides no watchlist read endpoint, no write endpoint, and no filter; the only trace is an unfilterable, likely-unpopulated `watched` boolean on the product object (§1). The decision is forced:

- A Supabase table — `watchlist_items(user_id, product_id, position, created_at)` — with RLS keyed on `user_id`, is the store.
- `product_id` is the natural key and is a **string like `BTC-USD`**, but it must be validated against `/products` before insert, not free-typed. Persist `product_id` only; everything else (price, name, icon, increments) is fetched live and must not be denormalised into the watchlist row, because it changes.
- The "add to watchlist" UI is a picker over `GET /products` (SPOT-only by default, sorted 24h quote volume descending — so the top of an unfiltered list is already the sensible default set).
- Do **not** build any sync-with-Coinbase affordance. There is nothing to sync with.

### 7.2 The endpoint set this module needs

| Endpoint | Why | Cardinality |
|---|---|---|
| `GET /api/v3/brokerage/products?product_type=SPOT` | The universe, for the watchlist picker. Cache hard — it changes on listings, not ticks. | Once per hour-ish |
| `GET /api/v3/brokerage/products?product_ids[]=…` | The entire watchlist grid in **one call**: `price`, `price_percentage_change_24h`, `volume_24h`, `high_24h`, `low_24h`, `best_bid_price`, `best_ask_price`, `icon_url`, `display_name` | Once per page render |
| `GET /api/v3/brokerage/products/{id}` | Product detail page | On demand |
| `GET /api/v3/brokerage/products/{id}/candles` | Charts. `granularity` enum values, `start`/`end` UNIX seconds as strings, `limit` ≤ 350 | On demand, chunked |
| `GET /api/v3/brokerage/products/{id}/ticker` | Recent trade tape on a detail page (note: `limit` is required) | On demand |

Everything here is a GET. Nothing writes. `/best_bid_ask` and `/product_book` are optional extras only if a spread readout is wanted; `best_bid_price`/`best_ask_price` on the product object usually suffice.

### 7.3 Type-level consequences (TypeScript strict)

- **Every numeric field is a string** — `price`, `volume_24h`, `base_increment`, all six candle fields including `start`. Model them as `string` at the boundary and convert with a decimal library at the point of arithmetic. Never `Number(...)` a price.
- `price_percentage_change_24h` may carry a trailing `%` (§2.3, from Coinbase's own example). Parse with a strip-then-decimal helper, not a raw decimal constructor.
- `start` on a candle is a **string of UNIX seconds** — multiply by 1000 for `Date`, and do it in one shared codec so the ×1000 is not scattered.
- Only a subset of product fields is marked required. Everything in the second half of the §2.3 table (`mid_market_price`, `market_cap`, `icon_url`, `best_bid_price`, `high_24h`, …) should be `| undefined` under strict mode. The required set is small and stable: `product_id`, `price`, the 24h pair, the increments, the min/max sizes, the names, `watched`, and the six trading-state booleans.
- `status` is an undocumented open string (§2.3) — type it `string`, gate UI on the booleans.
- Model the candle response as `{ candles: Candle[] }`, not a bare array, and **sort by `start` on receipt** since ordering is unguaranteed (§4.5).

### 7.4 Runtime and deployment

- **Node runtime, server-side, as established in #92** — the hand-rolled ES256 JWT signing needs `node:crypto`. Nothing in this document changes that. Never Edge.
- **REST polling is the real-time story.** Server-held WebSockets die at Hobby's 300s function cap, and Hobby cron fires at most once per day with ±59min slop (§5.3), so there is no re-connect loop to build on. Request-driven fetches on render and on explicit refresh.
- **A browser-side `ticker_batch` subscription to `wss://advanced-trade-ws.coinbase.com` is a legitimate additive layer** — public channels are subscribable unauthenticated, so no secret leaves the server (§5.4). Prefer `ticker_batch` (5s) over `ticker` (every match) for a grid. Ship it second, if at all; the REST path must stand alone.
- **Caching strategy that follows from the shapes:** closed candle buckets are immutable → cache indefinitely, keyed by `(product_id, granularity, start)`. The product catalogue changes on listings → cache for an hour. Prices → cache for seconds, or not at all on a user-initiated refresh. Since the REST rate limit is unverifiable (§6.2), this caching is not an optimisation, it is the rate-limit strategy.
- **Authenticate the market-data calls even though public variants exist** (§6.1) — it dodges the 1-second public cache, dodges the SDK-documented "more aggressive" unauthenticated throttling, and reuses the JWT signer the module already has.

### 7.5 What remains unknown before building

1. **Is `product.watched` actually populated for an authenticated CDP-key request?** (§1.2) Not documented anywhere reachable. Answerable with one live `GET /products/BTC-USD` using a key whose account has BTC watchlisted. Does not change the #97 decision either way — but worth knowing.
2. **The REST rate limit for `/api/v3/brokerage/*`** — the owning docs page is gone; independently re-verified (§6.2). Discoverable only by observing `429`s.
3. **`price_percentage_change_24h` wire format** — `"9.43"` or `"9.43%"`? Coinbase's own example shows the latter (§2.3).
4. **Candle ordering and `start` inclusivity** — no page states either (§4.5).
5. **Whether `/products/{id}/ticker` returns 24h volume** — the SDK docstring claims it does, the published response schema does not show it (§3.2).
6. **The `status` enum** for products — example `"online"` only, no value list published (§2.3).
7. **Concurrent WebSocket connection limits and max `product_ids` per subscription** — only the two per-second figures are published (§5.2).
8. **Whether `subscriptions` is a channel or a server message type** — it does not appear in the channel table (§5.2).
9. **Whether the `/market/*` security block on the reference pages is real** — the endpoint index and both SDKs say no; the reference pages say yes (§6.1). Answerable with one keyless `curl`.
