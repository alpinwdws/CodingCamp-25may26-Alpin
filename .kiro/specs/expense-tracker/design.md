# Design Document: Expense Tracker

## Overview

The Expense Tracker is a fully client-side web application delivered as a single HTML page with one companion CSS file and one JavaScript file. There is no server, no build step, and no framework — just plain HTML, CSS, and Vanilla JavaScript.

The app lets users record personal expenses (name, amount, category), view a running total balance, browse a scrollable transaction history, and see a pie chart of spending by category. All data is stored in the browser's `localStorage` so records survive page reloads and browser restarts.

### Key Design Decisions

- **No framework**: Keeps the dependency surface to zero and makes the app trivially deployable (open the HTML file in any browser).
- **Single JS file**: All application logic lives in `app.js`. The only external script is the CDN-hosted chart library (Chart.js).
- **localStorage as the source of truth**: On every mutation (add/delete) the full transaction array is serialized to JSON and written to `localStorage`. On load, the array is read back and the UI is rebuilt from it.
- **Synchronous UI updates**: All UI components (list, balance, chart) are re-rendered from the in-memory array after every mutation, keeping them always in sync.

---

## Architecture

The app follows a simple **data → render** loop with no reactive framework:

```
User Action
    │
    ▼
Validator (validate input)
    │
    ▼
State Manager (mutate in-memory array)
    │
    ├──► LocalStorage Writer (persist JSON)
    │
    └──► UI Renderer (re-render all components)
              ├── renderTransactionList()
              ├── renderBalance()
              └── renderChart()
```

### Component Responsibilities

| Module | Responsibility |
|---|---|
| **Validator** | Validates Input_Form fields before any state mutation |
| **State Manager** | Owns the in-memory `transactions[]` array; exposes `addTransaction` / `deleteTransaction` |
| **LocalStorage Writer** | Serializes `transactions[]` to JSON and writes to `localStorage`; reads and deserializes on load |
| **UI Renderer** | Reads from `transactions[]` and rebuilds the DOM for the list, balance, and chart |
| **Chart Adapter** | Thin wrapper around Chart.js that creates/updates the pie chart instance |

### Data Flow on Load

```
Page Load
  └─► readFromLocalStorage()
        ├─ success → deserialize JSON → populate transactions[]
        │             └─► renderAll()
        ├─ empty   → transactions[] = []
        │             └─► renderAll() (shows empty states)
        └─ malformed → transactions[] = [], show warning
                        └─► renderAll()
```

### Data Flow on Add Transaction

```
Form Submit
  └─► validate()
        ├─ invalid → show inline errors, stop
        └─► valid
              └─► addTransaction(name, amount, category)
                    ├─► writeToLocalStorage()
                    │     ├─ success → continue
                    │     └─ failure → show error, rollback, stop
                    └─► renderAll()
```

### Data Flow on Delete Transaction

```
Delete Button Click
  └─► confirm dialog
        ├─ cancelled → stop
        └─► confirmed
              └─► deleteTransaction(id)
                    ├─► writeToLocalStorage()
                    │     ├─ success → continue
                    │     └─ failure → show error, rollback, stop
                    └─► renderAll()
```

---

## Components and Interfaces

### HTML Structure

```
<body>
  <header>
    <h1>Expense Tracker</h1>
    <div id="balance-display">Total: $0.00</div>
  </header>

  <main>
    <section id="form-section">
      <form id="input-form">
        <input  id="item-name"   type="text"   maxlength="100" />
        <input  id="item-amount" type="number" min="0.01" max="999999999.99" step="0.01" />
        <select id="item-category">
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <button type="submit">Add Expense</button>
      </form>
      <div id="form-errors" aria-live="polite"></div>
    </section>

    <section id="chart-section">
      <canvas id="spending-chart"></canvas>
      <p id="chart-empty-msg" hidden>No spending data available.</p>
    </section>

    <section id="list-section">
      <ul id="transaction-list"></ul>
      <p id="list-empty-msg" hidden>No transactions recorded.</p>
    </section>
  </main>

  <div id="storage-warning" role="alert" hidden></div>
</body>
```

### JavaScript Public Interface (app.js)

```javascript
// --- State ---
let transactions = [];          // Array<Transaction>
let chartInstance = null;       // Chart.js instance

// --- Core Functions ---
function addTransaction(name, amount, category)  // → void
function deleteTransaction(id)                   // → void

// --- Persistence ---
function loadFromStorage()   // → void  (called on DOMContentLoaded)
function saveToStorage()     // → boolean (true = success, false = quota/unavailable)

// --- Validation ---
function validateForm(name, amount, category)  // → { valid: boolean, errors: string[] }

// --- Rendering ---
function renderAll()                  // → void  (calls all three below)
function renderTransactionList()      // → void
function renderBalance()              // → void
function renderChart()                // → void

// --- Utilities ---
function formatAmount(n)              // → string  e.g. "1,234.56"
function generateId()                 // → string  (crypto.randomUUID or Date.now fallback)
function showStorageError(msg)        // → void
function showStorageWarning(msg)      // → void
```

### Chart.js Integration

Chart.js is loaded from CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

`renderChart()` creates the chart on first call and calls `chart.update()` on subsequent calls to avoid destroying and recreating the canvas context.

---

## Data Models

### Transaction Object

```javascript
/**
 * @typedef {Object} Transaction
 * @property {string}  id        - Unique identifier (UUID or timestamp string)
 * @property {string}  name      - Item name (1–100 characters, trimmed)
 * @property {number}  amount    - Positive number, 0.01–999,999,999.99
 * @property {string}  category  - "Food" | "Transport" | "Fun"
 * @property {number}  timestamp - Unix ms timestamp of creation (Date.now())
 */
```

### LocalStorage Schema

```
Key:   "expense-tracker-transactions"
Value: JSON string of Transaction[]

Example:
[
  { "id": "abc123", "name": "Lunch", "amount": 12.50, "category": "Food", "timestamp": 1700000000000 },
  { "id": "def456", "name": "Bus fare", "amount": 2.00, "category": "Transport", "timestamp": 1700000001000 }
]
```

### Validation Rules

| Field | Rule |
|---|---|
| `name` | Required; trimmed length 1–100 characters |
| `amount` | Required; numeric; 0.01 ≤ amount ≤ 999,999,999.99 |
| `category` | Required; must be one of "Food", "Transport", "Fun" |

### Category Totals (derived, not stored)

```javascript
function getCategoryTotals(transactions) {
  // Returns { Food: number, Transport: number, Fun: number }
  // Only categories with total > 0 are included in chart segments
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: LocalStorage round-trip preserves transaction data

*For any* valid Transaction (any name 1–100 chars, any amount in range, any category), serializing the transaction array to JSON and deserializing it back SHALL produce a collection where the transaction has the same `name`, `amount`, and `category` as the original.

**Validates: Requirements 6.1, 6.2, 6.3, 6.5**

---

### Property 2: Balance equals sum of all transaction amounts

*For any* collection of transactions, the value rendered by `renderBalance()` SHALL equal the arithmetic sum of all `amount` fields in the collection, formatted to 2 decimal places.

**Validates: Requirements 4.1, 4.4**

---

### Property 3: Adding a valid transaction grows the list by exactly one

*For any* existing transaction list and any valid new transaction (non-empty name, valid amount, valid category), calling `addTransaction` SHALL result in the transaction list having exactly one more entry than before, and that entry SHALL contain the submitted name, amount, and category.

**Validates: Requirements 1.2, 2.3**

---

### Property 4: Whitespace-only or empty name is rejected

*For any* string composed entirely of whitespace characters (or the empty string) submitted as the item name, the Validator SHALL reject the form and the transaction list SHALL remain unchanged.

**Validates: Requirements 1.5**

---

### Property 5: Invalid amount is rejected

*For any* amount value that is zero, negative, non-numeric, or outside the range 0.01–999,999,999.99, the Validator SHALL reject the form and the transaction list SHALL remain unchanged.

**Validates: Requirements 1.6**

---

### Property 6: Deleting a transaction removes it from the list

*For any* transaction list containing at least one transaction, deleting a transaction by its `id` SHALL result in a list that no longer contains any entry with that `id`, and all other entries SHALL remain unchanged.

**Validates: Requirements 3.3**

---

### Property 7: Category totals are proportionally correct

*For any* non-empty transaction list, the proportion of each category in the chart SHALL equal the sum of that category's amounts divided by the total of all amounts, and the sum of all proportions SHALL equal 1.0 (within floating-point tolerance).

**Validates: Requirements 5.2**

---

### Property 8: Categories with zero total are excluded from the chart

*For any* transaction list, a category SHALL appear as a chart segment if and only if the sum of its transaction amounts is strictly greater than zero.

**Validates: Requirements 5.1, 5.3, 5.4**

---

## Error Handling

### LocalStorage Unavailable (write)

- Triggered when `localStorage.setItem` throws (e.g., quota exceeded, private browsing restrictions).
- The in-memory `transactions[]` array is **not** mutated.
- A visible error banner is shown to the user.
- The UI is not updated (the failed transaction is not shown in the list).

### LocalStorage Unavailable (read on load)

- If `localStorage.getItem` throws, treat as empty storage.
- Initialize `transactions[]` to `[]`.
- Render empty states for list, balance, and chart.

### Malformed JSON in LocalStorage

- If `JSON.parse` throws on the stored value, discard the data.
- Initialize `transactions[]` to `[]`.
- Display a visible warning message to the user (distinct from an error — data was present but unreadable).
- Render empty states.

### Validation Errors

- Inline error messages are rendered in `#form-errors` using `aria-live="polite"` so screen readers announce them.
- Errors are cleared on the next successful submission.
- Each field's error is listed separately so the user knows exactly what to fix.

### Chart Library Load Failure

- If the CDN script fails to load, `window.Chart` will be undefined.
- `renderChart()` checks for `window.Chart` before attempting to create the chart.
- If unavailable, the chart section shows a fallback message: "Chart unavailable — could not load charting library."

---

## Testing Strategy

### Unit Tests (example-based)

Focus on specific behaviors with concrete inputs:

- `validateForm` with each invalid field combination
- `formatAmount` with boundary values (0.01, 999999999.99, 0, negative)
- `getCategoryTotals` with mixed and single-category lists
- `loadFromStorage` with empty storage, valid JSON, and malformed JSON
- `saveToStorage` when `localStorage.setItem` throws (mock)
- `renderBalance` with empty list (expects "0.00")
- Delete confirmation: cancelling does not remove the transaction

### Property-Based Tests

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) (loaded via CDN or npm in the test environment). Each test runs a minimum of **100 iterations**.

Each test is tagged with a comment in the format:
`// Feature: expense-tracker, Property N: <property text>`

| Property | Test Description |
|---|---|
| **Property 1** | Generate random valid Transaction arrays → serialize → deserialize → assert structural equality |
| **Property 2** | Generate random Transaction arrays → compute balance via `renderBalance` → assert equals `sum(amounts)` formatted to 2dp |
| **Property 3** | Generate random list + valid new transaction → call `addTransaction` → assert list length +1 and entry present |
| **Property 4** | Generate whitespace-only strings → call `validateForm` → assert rejected and list unchanged |
| **Property 5** | Generate out-of-range/non-numeric amounts → call `validateForm` → assert rejected and list unchanged |
| **Property 6** | Generate list with ≥1 transaction → delete one by id → assert id absent, others intact |
| **Property 7** | Generate non-empty Transaction arrays → compute category proportions → assert sum ≈ 1.0 and each proportion matches formula |
| **Property 8** | Generate Transaction arrays with varying category coverage → assert chart segments match categories with total > 0 |

### Integration / Smoke Tests

- App loads in Chrome, Firefox, Edge, Safari without console errors (manual or Playwright smoke test).
- Full add → verify list → verify balance → verify chart → delete → verify all update cycle.
- LocalStorage persistence: add transactions, reload page, verify data restored.
- Malformed localStorage: manually set bad JSON, reload, verify warning shown and empty state rendered.
