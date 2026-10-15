# Magani Partner API

Send prescriptions from your hospital system to registered community pharmacies on Magani, check stock before you send, and follow each order until the medicine is dispensed.

Base URL: `https://<your-magani-host>/api/partner/v1` (local development: `http://localhost:4000/api/partner/v1`)

## Authentication

Magani gives your organisation an API key that starts with `mgk_`. Send it on every request:

```
Authorization: Bearer mgk_...
```

Keep the key on your server. It is shown once when it is issued; if it leaks, ask Magani to revoke it and issue a new one.

## Typical flow

1. `GET /pharmacies?state=Kaduna` to find pharmacies near the patient.
2. `GET /pharmacies/{id}/availability?medicines=Metformin,Amlodipine` to check stock.
3. `POST /orders` to send the prescription.
4. The pharmacy accepts it (matching each item to a product and confirming the price), prepares it and dispenses it. You receive a webhook at each step, or you can poll `GET /orders/{id}`.

## Endpoints

### List pharmacies

`GET /pharmacies?state=&lga=`

Only pharmacies that have chosen to accept partner orders are listed. Patent medicine vendors are never listed, because prescription medicines must be dispensed by a registered pharmacy.

```json
[{ "id": "1959ac5b-…", "name": "Barka Pharmacy", "state": "Kaduna", "lga": "Kaduna North" }]
```

### Check availability

`GET /pharmacies/{id}/availability?medicines=Metformin,Insulin`

Matches on medicine and generic name. Exact quantities stay private to the pharmacy.

```json
{
  "pharmacy": { "id": "1959ac5b-…", "name": "Barka Pharmacy" },
  "results": [
    { "medicine": "Metformin", "available": true, "matches": [{ "name": "Metformin", "strength": "500mg", "inStock": true, "priceKobo": 120000 }] },
    { "medicine": "Insulin", "available": false, "matches": [] }
  ]
}
```

### Send an order

`POST /orders`

```json
{
  "pharmacyId": "1959ac5b-…",
  "externalRef": "AKTH-RX-2026-000123",
  "patient": { "name": "Bala Musa", "phone": "08033334444" },
  "prescriber": "Dr. Okoro, Medical Outpatients",
  "fulfilment": "PICKUP",
  "payer": "PARTNER",
  "note": "Optional note for the pharmacist",
  "items": [
    { "medicine": "Metformin", "strength": "500mg", "quantity": 2, "instructions": "1 tablet twice daily" }
  ]
}
```

| Field | Notes |
|---|---|
| `externalRef` | Your own reference, unique per order. Sending the same reference again returns the existing order (status 200) instead of creating a duplicate, so retries are safe. |
| `fulfilment` | `PICKUP` or `DELIVERY`. Delivery needs `deliveryAddress`. |
| `payer` | `PARTNER` if your organisation pays the pharmacy, `PATIENT` if the patient pays at the counter. |
| `quantity` | Packs, 1 to 1000. Up to 20 items per order. |

Returns `201` with the order.

### Get orders

- `GET /orders/{id}`
- `GET /orders?externalRef=AKTH-RX-2026-000123`
- `GET /orders` (your latest 100)

### Cancel an order

`POST /orders/{id}/cancel` while it is `SENT`, `ACCEPTED` or `READY`.

## The order object

```json
{
  "id": "62522dfd-…",
  "externalRef": "AKTH-RX-2026-000123",
  "status": "DISPENSED",
  "pharmacy": { "id": "1959ac5b-…", "name": "Barka Pharmacy", "state": "Kaduna", "lga": "Kaduna North" },
  "patient": { "name": "Bala Musa" },
  "fulfilment": "PICKUP",
  "payer": "PARTNER",
  "totalKobo": 240000,
  "declineReason": null,
  "items": [
    {
      "medicine": "Metformin", "strength": "500mg", "quantity": 2, "instructions": "1 tablet twice daily",
      "dispensedAs": { "name": "Metformin", "strength": "500mg", "unitPriceKobo": 120000 }
    }
  ],
  "createdAt": "2026-10-13T11:03:50.000Z",
  "updatedAt": "2026-10-13T11:04:07.330Z",
  "dispensedAt": "2026-10-13T11:04:07.330Z"
}
```

Amounts are in kobo (₦1 = 100 kobo). `totalKobo` is set when the pharmacy accepts the order and confirmed when it dispenses.

| Status | Meaning |
|---|---|
| `SENT` | Waiting for the pharmacy. |
| `ACCEPTED` | The pharmacy matched each item to a product and set the price. |
| `READY` | Ready for pickup or delivery. |
| `DISPENSED` | Handed over. Stock was deducted first-expiry-first-out. |
| `DECLINED` | The pharmacy cannot fill it; see `declineReason`. |
| `CANCELLED` | You cancelled it. |

## Webhooks

If you gave Magani a webhook URL, it receives a `POST` whenever one of your orders changes:

```json
{ "event": "order.updated", "order": { …the order object… } }
```

Each request carries `X-Magani-Signature`: the hex HMAC-SHA256 of the raw request body, using the webhook secret issued with your key. Check it before trusting the body:

```js
const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest();
const given = Buffer.from(req.headers["x-magani-signature"], "hex");
const valid = given.length === expected.length && crypto.timingSafeEqual(given, expected);
```

Delivery is best effort with a 5 second timeout and no retries, so poll `GET /orders/{id}` for anything still open if you missed an update.

## Errors

Errors return JSON `{ "error": "message" }`:

| Status | When |
|---|---|
| 401 | Missing or invalid API key |
| 404 | Pharmacy not found or not accepting orders; order not found |
| 409 | The order cannot change from its current status |
| 422 | Invalid fields (`fields` lists them) |
