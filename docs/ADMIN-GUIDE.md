# ARKVOLT — Dashboard Guide

Everything on the website can be changed from the dashboard. You never need to
open a code editor, and you never need to ask anyone to "deploy" a change for
you: press Save, and the site picks it up on its own — most pages within a
minute, the booking and title pages within about five.

Sign in at **`/admin`** on your domain. The first time, use the email and
password that were set up for you; then go to **Settings → Account** and change
the password to something only you know.

---

## 1. The five-minute tour

| Page | What it is for |
| --- | --- |
| **Overview** | Today's queue at a glance — new orders, open bookings, unread enquiries. Start here every morning. |
| **Orders** | Software and hardware purchases. Confirm payment, mark as delivered. |
| **Bookings** | Repair appointments. Assign, reschedule, quote. |
| **Enquiries** | Messages from the contact form, plus the title setup requests. |
| **Catalogue** | Products, Services, Categories, Titles. |
| **Settings** | Phone numbers, addresses, delivery fees, opening hours, announcement bar. |
| **Activity log** | Every change ever made, by whom, from where, with the old value. |

---

## 2. How a sale actually happens

Cards are only ever a *promise* to buy. Money changes hands on WhatsApp, exactly
as it does today — the dashboard is what keeps it organised.

1. A customer picks something and goes to checkout. The site creates an order
   with a reference like `AV-2610-KM4TR9` and shows them a button that opens
   **WhatsApp with the whole order already written out**.
2. The order appears under **Orders** with the status `New`.
3. You open it, check the details, and reply on WhatsApp. When they pay, set:

   - **Status** → `Confirmed`
   - **Payment** → `Paid`

   Both are dropdowns in the right-hand panel. Changes save the moment you
   click away from the field.
4. Set the status forward as the work progresses: `Preparing` → `Ready` →
   `Completed`. The customer's tracking page (`/order/AV-…`) shows the same
   stages, so a customer who checks their link sees what you have set here.
5. **Mark WhatsApp sent** records that you have replied. It is a note to
   yourself, not a message — it does not send anything.

> **Deleting a product that has been ordered does not delete the order.** It
> archives the product instead, so old orders and receipts stay readable.

## 3. Repair bookings

Bookings arrive with a reference like `AVR-2610-3PQK7X` and carry the machine,
the fault, the preferred time and how urgent it is.

- **Status**: `New` → `Scheduled` → `In Progress` → `Awaiting parts` → `Ready` →
  `Completed`. Customers see a simplified version of this on their tracking page.
- **Technician**: who is on it. With one bench this is usually your own name,
  but it keeps the record honest when you bring in help.
- **Quoted fee**: the *real* number, added after you have seen the machine.
  Leave it empty until you have quoted.
- **Internal notes**: your working notes. Never shown to the customer.
- Anything marked **Emergency** sorts to the top of the overview — treat it as
  a call-back today, not a form to process.

## 4. Adding software, hardware or a part

**Catalogue → Products → New product.** The form is grouped the same way the
public page is laid out, so what you type in reads back the way you expect.

| Section | Why it matters |
| --- | --- |
| **Identity** | Name, SKU, category, kind. The SKU is what you will search by later. |
| **Pricing** | Price in naira, plus an optional "was" price shown struck through. |
| **Stock** | Untick *Track stock* for anything made to order — it will never read as out of stock. |
| **Images** | Drag your photos in. The first image is the cover; the rest become the gallery. |
| **Specs** | Label/value pairs, e.g. `Capacity` / `1 TB`. Rendered as the spec table. |
| **Requirements** | Grouped lists — "Your machine must have…". These become the checkout warnings. |
| **Procedure** | Numbered steps, e.g. how installation runs on the day. |
| **Included** | One line per item, e.g. "Thermal paste, pads, labour". |
| **Delivery & SEO** | Delivery note plus the Google title and description. |

Press **Save draft** while you are still writing, and **Publish** when the page
is ready for customers. Drafts are invisible on the site but fully editable.

> ⚠️ **Licensing.** This store sells *labour and setup*, not cracked copies of
> games. Do not add a product that promises a licence you cannot legally supply.
> The Titles reference list exists for exactly that reason — see below.

## 5. Services (repair work)

**Catalogue → Services.** Same idea as products, plus:

- **Price display** — `From`, `Fixed price`, or `Quote on assessment`. Most repair
  work should be `From`; the honest number comes after you have seen the machine.
- **Turnaround** — plain language, e.g. "2–4 hours on the bench".
- **Procedure** — the numbered stages the customer will see on the service page.
- **Bookable** — untick to hide it from the booking form without deleting it.

## 6. Titles (the game reference list)

The storefront lists game titles as a **reference** for setup requests. The list
holds names, series and genre only — no download links, no files, no claims of
licensing.

- **Requests tab**: every title setup request from the website. Move each one
  through `Open → Quoted → Scheduled → Completed`.
- **Index tab**: the list itself. Fix a typo by clicking the cell and typing —
  changes save on blur. Search by name, filter by genre.

If a customer asks for a title that is not there, add it to the list or reply
with a labour quote; either way the price is for work, not for the game.

## 7. Settings

Everything here is read live by the website.

- **WhatsApp number** — the single most important field. Every order, booking
  and enquiry is routed to this number. Allow a minute or two after changing it
  before testing. International format, no plus sign:
  `2349030438653`.
- **Delivery fee / free over** — the standard charge and the basket value above
  which it is dropped. Set free-over to `0` to switch it off.
- **Announcement bar** — one line across the top of the site for closures,
  holidays or capacity. Preview shows exactly what visitors will see.
- **Payment instructions** — the bank details you paste into WhatsApp when an
  order is confirmed. These are *not* published on the website.

## 8. The Activity log

Read-only by design: nothing in it can be edited or deleted, not even by you.

Each line records the action, the record, who did it, from which IP address,
and — expand the row — the before and after value of every field that changed.
Use the search and the action chips to find, for example, every time a price
changed, or the exact moment an order was marked paid. **Export CSV** writes the
current view out for your accountant or a dispute.

If two people are ever given dashboard access, this is the record of what each
one did.

---

## Dos and don'ts

**Do**

- Reply to every order on WhatsApp within the same day — the reference makes it
  quick (`Order AV-2610-KM4TR9`).
- Change prices in the dashboard, not by memory: the site, the invoice and the
  order history all read the same number.
- Keep stock honest. The overview warns you at 3 units or fewer.
- Use internal notes for anything you will forget in a week.

**Don't**

- Don't promise a licence or a serial key you cannot supply.
- Don't delete a category until the products inside it have been moved — the
  dashboard will refuse, and it will tell you how many are blocking it.
- Don't share dashboard access casually. If you ever do, the activity log will
  show exactly what that person changed.
