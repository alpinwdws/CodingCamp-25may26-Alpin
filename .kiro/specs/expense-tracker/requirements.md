# Requirements Document

## Introduction

A client-side expense tracker web application built with HTML, CSS, and Vanilla JavaScript. The app allows users to log personal expenses by name, amount, and category, view a running total balance, manage a scrollable transaction list, and visualize spending distribution through a pie chart. All data is persisted in the browser's LocalStorage — no backend or server required. The app is designed to be simple, fast, and visually clean, suitable for use as a standalone web page or browser extension.

## Glossary

- **App**: The expense tracker web application as a whole.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The HTML form through which the user enters a new transaction.
- **Balance_Display**: The UI element at the top of the App that shows the total sum of all transaction amounts.
- **Chart**: The pie chart that visualizes spending distribution by category.
- **LocalStorage**: The browser's built-in key-value storage API used to persist transaction data client-side.
- **Category**: One of three fixed labels — Food, Transport, or Fun — used to classify a transaction.
- **Validator**: The client-side logic that checks Input_Form fields before a transaction is saved.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in an expense form and submit it, so that I can record a new transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (maximum 100 characters), a numeric field for amount (range 0.01–999,999,999.99), and a dropdown selector for Category with options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled and a valid positive amount, THE App SHALL create a new Transaction and add it to the Transaction_List.
3. WHEN the user submits the Input_Form with all fields filled and a valid positive amount, THE App SHALL persist the new Transaction to LocalStorage.
4. WHEN the user submits the Input_Form with all fields filled and a valid positive amount, THE App SHALL clear the Input_Form fields after the Transaction is saved.
5. IF the user submits the Input_Form with one or more empty fields, THEN THE Validator SHALL display an inline error message indicating which fields are missing.
6. IF the user submits the Input_Form with an amount that is zero, negative, non-numeric, or outside the valid range, THEN THE Validator SHALL display an inline error message stating that the amount must be a positive number between 0.01 and 999,999,999.99.
7. IF LocalStorage is unavailable when the user submits a valid transaction, THEN THE App SHALL display an error message indicating the transaction could not be saved and SHALL NOT add the Transaction to the Transaction_List.

---

### Requirement 2: Display Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all persisted Transactions in newest-first order, each showing the item name, amount formatted to 2 decimal places, and Category.
2. WHEN the App loads, THE Transaction_List SHALL render all Transactions previously saved in LocalStorage.
3. WHEN a new Transaction is added, THE Transaction_List SHALL update within 100 milliseconds to include the new entry without requiring a page reload.
4. IF the number of Transaction entries exceeds the visible area of the Transaction_List, THEN THE Transaction_List SHALL be scrollable to reveal all entries.
5. WHEN the Transaction_List is empty, THE Transaction_List SHALL display a visible message indicating that no transactions have been recorded.
6. IF LocalStorage contains data that cannot be parsed as a valid Transaction collection when the App loads, THEN THE App SHALL discard the malformed data, initialize with an empty Transaction collection, and display a visible warning message to the user.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to remove an expense from the list, so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a visible, labeled delete button for each Transaction entry.
2. WHEN the user activates the delete button for a Transaction, THE App SHALL display a confirmation prompt asking the user to confirm the deletion before proceeding.
3. WHEN the user confirms deletion, THE App SHALL remove that Transaction from both the Transaction_List and LocalStorage simultaneously.
4. IF LocalStorage is unavailable when the user confirms deletion, THEN THE App SHALL display an error message indicating the transaction could not be deleted and SHALL retain the Transaction in the Transaction_List.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see the total amount I have spent, so that I can track my overall expenditure at a glance.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of the amounts of all Transactions currently in the Transaction_List, formatted to 2 decimal places.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update its value within 100 milliseconds to reflect the new total.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update its value within 100 milliseconds to reflect the new total.
4. WHEN the Transaction_List is empty, THE Balance_Display SHALL show a value of 0.00.
5. WHEN the App loads with existing Transactions in LocalStorage, THE Balance_Display SHALL render the correct total immediately upon page load.

---

### Requirement 5: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display a pie chart with one segment per Category that has at least one Transaction; categories with no Transactions SHALL NOT appear as segments.
2. THE Chart SHALL calculate each segment's proportion as the sum of amounts for that Category divided by the total amount of all Transactions.
3. WHEN a new Transaction is added, THE Chart SHALL update within 100 milliseconds to reflect the new spending distribution, and any Category whose total drops to zero SHALL have its segment removed.
4. WHEN a Transaction is deleted, THE Chart SHALL update within 100 milliseconds to reflect the revised spending distribution, and any Category whose total drops to zero SHALL have its segment removed.
5. WHEN the Transaction_List is empty, THE Chart SHALL display a visible text message indicating no spending data is available.
6. THE Chart SHALL load its charting library from an external CDN URL with no locally installed library files required.
7. WHEN the App loads with existing Transactions in LocalStorage, THE Chart SHALL render the correct spending distribution immediately upon page load.

---

### Requirement 6: Persist Data Across Sessions

**User Story:** As a user, I want my expense data to be saved between browser sessions, so that I do not lose my records when I close and reopen the app.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL write the updated Transaction collection to LocalStorage as a serialized JSON string.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction collection to LocalStorage as a serialized JSON string.
3. WHEN the App loads, THE App SHALL read the Transaction collection from LocalStorage and deserialize it from JSON.
4. IF LocalStorage contains no previously saved data when the App loads, THEN THE App SHALL initialize with an empty Transaction collection.
5. THE App SHALL persist each Transaction such that after a write followed by a read, the deserialized Transaction has the same item name, amount, and Category as the original.
6. IF LocalStorage contains data that cannot be parsed as valid JSON when the App loads, THEN THE App SHALL discard the malformed data and initialize with an empty Transaction collection.
7. IF a LocalStorage write operation fails (e.g., storage quota exceeded), THEN THE App SHALL display a visible error message to the user and SHALL NOT update the in-memory Transaction collection to reflect the failed write.

---

### Requirement 7: Technical Constraints

**User Story:** As a developer, I want the app to use only HTML, CSS, and Vanilla JavaScript with no backend, so that it is simple to deploy and maintain.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no frontend frameworks or build tools required.
2. THE App SHALL use only one CSS file for all styling; no additional stylesheet files shall be linked.
3. THE App SHALL use only one JavaScript file for all application logic; no additional script files shall be loaded except the CDN-hosted chart library.
4. WHEN the App is opened in Chrome, Firefox, Edge, or Safari, THE App SHALL render all UI components and respond to user interactions without browser-specific errors or visual defects.
5. WHEN the App is loaded on a connection of at least 10 Mbps, THE App SHALL become interactive (accepting user input) within 3 seconds of the initial page request.
6. WHILE the App is running, THE App SHALL respond to user interactions (form submission, deletion) within 100 milliseconds.
