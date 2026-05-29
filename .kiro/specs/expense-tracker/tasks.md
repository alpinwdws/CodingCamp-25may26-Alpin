# Implementation Plan: Expense Tracker

## Overview

Implement a fully client-side expense tracker as three files: `index.html`, `styles.css`, and `app.js`. The implementation follows a data → render loop: user actions flow through the Validator, mutate the State Manager's in-memory array, persist via the LocalStorage Writer, and trigger a full UI re-render. Chart.js is loaded from CDN. All 8 correctness properties are verified with fast-check property-based tests.

## Tasks

- [ ] 1. Create project file structure and HTML skeleton
  - Create `index.html` with the full semantic HTML structure: `<header>` with `#balance-display`, `<main>` with `#form-section` (form + `#form-errors`), `#chart-section` (canvas + `#chart-empty-msg`), `#list-section` (`#transaction-list` + `#list-empty-msg`), and `#storage-warning`
  - Add `aria-live="polite"` on `#form-errors` and `role="alert"` on `#storage-warning`
  - Link `styles.css` in `<head>` and `app.js` (deferred) before `</body>`
  - Load Chart.js from CDN: `https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js` before `app.js`
  - Create empty `styles.css` and empty `app.js` placeholder files
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 2. Implement Validator module
  - [ ] 2.1 Write `validateForm(name, amount, category)` in `app.js`
    - Trim `name`; reject if empty or whitespace-only or longer than 100 chars
    - Reject `amount` if non-numeric, zero, negative, or outside 0.01–999,999,999.99
    - Reject `category` if not one of `"Food"`, `"Transport"`, `"Fun"`
    - Return `{ valid: boolean, errors: string[] }` with one error string per failing field
    - _Requirements: 1.1, 1.5, 1.6_

  - [ ]* 2.2 Write property test for Validator — Property 4: whitespace-only name is rejected
    - **Property 4: Whitespace-only or empty name is rejected**
    - Generate strings composed entirely of whitespace (space, tab, newline) or empty string using fast-check `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))`
    - Assert `validateForm(whitespaceStr, 10, 'Food').valid === false` for all generated inputs
    - **Validates: Requirements 1.5**

  - [ ]* 2.3 Write property test for Validator — Property 5: invalid amount is rejected
    - **Property 5: Invalid amount is rejected**
    - Generate out-of-range values: zero, negatives (`fc.float({ max: 0 })`), values above 999,999,999.99, and non-numeric strings
    - Assert `validateForm('Item', invalidAmount, 'Food').valid === false` for all generated inputs
    - **Validates: Requirements 1.6**

- [ ] 3. Implement State Manager and data utilities
  - [ ] 3.1 Define the `Transaction` typedef and initialize `let transactions = []` and `let chartInstance = null`
    - Implement `generateId()` using `crypto.randomUUID()` with `Date.now().toString()` fallback
    - Implement `formatAmount(n)` returning a string formatted to 2 decimal places (e.g., `"1,234.56"`)
    - Implement `getCategoryTotals(transactions)` returning `{ Food, Transport, Fun }` with only categories whose total > 0
    - _Requirements: 4.1, 5.2, 7.1_

  - [ ]* 3.2 Write property test for State Manager — Property 2: balance equals sum of amounts
    - **Property 2: Balance equals sum of all transaction amounts**
    - Generate arrays of valid Transaction objects using fast-check arbitraries
    - Assert that `renderBalance()` output equals `sum(amounts)` formatted to 2 decimal places
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 3.3 Write property test for State Manager — Property 7: category proportions sum to 1.0
    - **Property 7: Category totals are proportionally correct**
    - Generate non-empty Transaction arrays; compute proportions from `getCategoryTotals`
    - Assert each proportion equals `categoryTotal / grandTotal` and all proportions sum to 1.0 within `Number.EPSILON * 10` tolerance
    - **Validates: Requirements 5.2**

  - [ ]* 3.4 Write property test for State Manager — Property 8: zero-total categories excluded
    - **Property 8: Categories with zero total are excluded from the chart**
    - Generate Transaction arrays with varying category coverage (some categories may have no entries)
    - Assert that `getCategoryTotals` only returns keys for categories whose summed amount is strictly > 0
    - **Validates: Requirements 5.1, 5.3, 5.4**

- [ ] 4. Implement LocalStorage Writer module
  - [ ] 4.1 Write `saveToStorage()` in `app.js`
    - Serialize `transactions` to JSON and call `localStorage.setItem("expense-tracker-transactions", json)`
    - Wrap in try/catch; on failure call `showStorageError(msg)` and return `false`; on success return `true`
    - Write `showStorageError(msg)` and `showStorageWarning(msg)` to display/hide `#storage-warning`
    - _Requirements: 6.1, 6.2, 6.7, 1.7, 3.4_

  - [ ] 4.2 Write `loadFromStorage()` in `app.js`
    - Call `localStorage.getItem("expense-tracker-transactions")`; if null initialize `transactions = []`
    - Wrap `JSON.parse` in try/catch; on malformed JSON set `transactions = []` and call `showStorageWarning(msg)`
    - On success deserialize into `transactions`
    - _Requirements: 6.3, 6.4, 6.6, 2.2, 2.6_

  - [ ]* 4.3 Write property test for LocalStorage Writer — Property 1: round-trip preserves data
    - **Property 1: LocalStorage round-trip preserves transaction data**
    - Generate random valid Transaction arrays; call `saveToStorage()` (with mocked `localStorage`), then `loadFromStorage()`
    - Assert each transaction's `name`, `amount`, and `category` are identical after the round-trip
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

- [ ] 5. Checkpoint — Ensure Validator, State utilities, and LocalStorage modules work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement `addTransaction` and `deleteTransaction`
  - [ ] 6.1 Write `addTransaction(name, amount, category)` in `app.js`
    - Create a new Transaction object with `generateId()`, trimmed name, parsed amount, category, and `Date.now()` timestamp
    - Push to `transactions[]`; call `saveToStorage()`; on failure splice the entry back out and return without rendering
    - On success call `renderAll()`
    - _Requirements: 1.2, 1.3, 1.4, 1.7_

  - [ ]* 6.2 Write property test for `addTransaction` — Property 3: adding grows list by exactly one
    - **Property 3: Adding a valid transaction grows the list by exactly one**
    - Generate an existing transaction array and a valid new transaction (name, amount, category)
    - Set `transactions` to the generated array, call `addTransaction`, assert `transactions.length === before + 1` and the new entry has the correct name, amount, and category
    - **Validates: Requirements 1.2, 2.3**

  - [ ] 6.3 Write `deleteTransaction(id)` in `app.js`
    - Find the transaction by `id`; splice it from `transactions[]`
    - Call `saveToStorage()`; on failure splice the entry back in and call `showStorageError(msg)`, then return
    - On success call `renderAll()`
    - _Requirements: 3.3, 3.4_

  - [ ]* 6.4 Write property test for `deleteTransaction` — Property 6: deleted id is absent
    - **Property 6: Deleting a transaction removes it from the list**
    - Generate a non-empty transaction array; pick a random transaction id from it
    - Set `transactions` to the array, call `deleteTransaction(id)`, assert no entry with that id remains and all other entries are unchanged
    - **Validates: Requirements 3.3**

- [ ] 7. Implement UI Renderer
  - [ ] 7.1 Write `renderTransactionList()` in `app.js`
    - Sort `transactions` by `timestamp` descending (newest first)
    - Build `<li>` elements showing name, `formatAmount(amount)`, and category; include a delete `<button>` per entry
    - Toggle `#list-empty-msg` visibility based on whether `transactions` is empty
    - Attach click handler on each delete button: show `window.confirm` prompt; on confirmation call `deleteTransaction(id)`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 3.1, 3.2_

  - [ ] 7.2 Write `renderBalance()` in `app.js`
    - Sum all `transaction.amount` values; format with `formatAmount`; update `#balance-display` text
    - Show `"0.00"` when `transactions` is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.3 Write `renderChart()` in `app.js` (Chart Adapter)
    - Guard: if `window.Chart` is undefined, show fallback message in `#chart-section` and return
    - Call `getCategoryTotals(transactions)`; if result is empty hide canvas and show `#chart-empty-msg`
    - On first call create a new `Chart` instance on `#spending-chart` canvas; on subsequent calls update `chartInstance.data` and call `chartInstance.update()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.3_

  - [ ] 7.4 Write `renderAll()` calling `renderTransactionList()`, `renderBalance()`, and `renderChart()` in sequence
    - _Requirements: 2.3, 4.2, 4.3, 5.3, 5.4_

- [ ] 8. Wire form submission and app initialization
  - [ ] 8.1 Attach `submit` event listener to `#input-form`
    - Read values from `#item-name`, `#item-amount`, `#item-category`
    - Call `validateForm`; if invalid render errors in `#form-errors` and return
    - If valid clear `#form-errors`, call `addTransaction`, then reset the form fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 8.2 Add `DOMContentLoaded` listener that calls `loadFromStorage()` then `renderAll()`
    - _Requirements: 2.2, 4.5, 5.7, 6.3, 6.4_

- [ ] 9. Implement CSS styling in `styles.css`
  - Style the layout: centered container, header with balance, form section, chart section, scrollable transaction list
  - Style transaction list items with name, amount, category badge, and delete button
  - Style error/warning banners (`#form-errors`, `#storage-warning`) with distinct colors
  - Ensure the transaction list is scrollable when entries overflow the visible area
  - _Requirements: 2.4, 7.1, 7.2, 7.4_

- [ ] 10. Final checkpoint — Ensure all tests pass and app is functional
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use [fast-check](https://github.com/dubzzz/fast-check); load via CDN in a test HTML file or install via npm in a separate test environment
- Each property test is tagged with `// Feature: expense-tracker, Property N: <property text>` as a comment
- Each property test runs a minimum of 100 iterations
- `renderBalance()` and `renderChart()` read directly from the module-level `transactions` array — tests must set that array before calling these functions
- The `saveToStorage` / `loadFromStorage` tests should mock `localStorage` (e.g., using a simple in-memory object) to avoid side effects between test runs
- Checkpoints ensure incremental validation at logical boundaries

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "4.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.3", "6.1", "6.3"] },
    { "id": 3, "tasks": ["6.2", "6.4", "7.1", "7.2", "7.3"] },
    { "id": 4, "tasks": ["7.4", "8.1", "8.2"] },
    { "id": 5, "tasks": ["9"] }
  ]
}
```
