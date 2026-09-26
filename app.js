/* ============================================
   TINDA GO - Three Moment Redesign
   ============================================ */

;(function() {
  'use strict';

  // ============================================
  // PAGE DETECTION
  // ============================================
  var pageName = (function() {
    var path = window.location.pathname.split('/').pop().toLowerCase();
    if (path === '' || path === 'index.html') return 'index';
    return path.replace('.html', '');
  })();

  // ============================================
  // STATE
  // ============================================
  var state = {
    settings: {
      language: 'fil',
      textSize: 'standard',
      storeName: 'Aking Tindahan',
      ownerName: 'May-ari',
      hasCompletedSetup: false,
      launchCount: 0,
      defaultMarkup: 20,
      lowStockThreshold: 5,
      defaultCreditLimit: 500
    },
    products: [],
    sales: [],
    debts: [],
    history: [],
    dayOpen: false,
    dayDate: '',          // date this business day started (YYYY-MM-DD)
    dayArchived: false,   // whether day's sales data has been archived to history
    todayExpenses: 0,
    todayEarnings: 0,
    expenseLog: [],      // V2.71: { id, date (YYYY-MM-DD), category, amount, note, createdAt }
    selectedProduct: null,
    paymentDebtId: null,
    editProductId: null
  };

  // ============================================
  // DOM REFS
  // ============================================
  var dom = {};

  function cacheDom() {
    var ids = [
      'headerGreeting', 'headerPageTitle', 'appContent',
      'morningGreeting', 'morningSubtitle',
      'morningStockTitle', 'morningStockDesc',
      'morningDebtTitle', 'morningDebtDesc',
      'morningYesterdayTitle', 'morningYesterdayDesc', 'morningYesterdayCard',
      'btnStartDay', 'btnCloseDay', 'btnCompleteDay',
      'dayDate', 'dayEarnings', 'dayItemsSold', 'dayUtang',
      'dayTransactionList', 'daySummary',
      'closingExpenses', 'closingActualSales', 'closingRecordedSales', 'closingSalesDiff', 'closingTotalToday',
      'closingExpensesToday', 'closingNetProfit',
      'closingSoldItems', 'closingLowStock', 'closingDebts',
      'closingWeeklySales', 'closingTopSeller',
      'dayExpensesTotal', 'expenseAmount', 'expenseCategory', 'expenseDate', 'expenseNote',
      'expenseList', 'expenseTodayTotal',
      'summaryOverlay', 'summaryText', 'summaryDetails',
      'navMorning', 'navSale', 'navClose',
      'saleProductName', 'saleQty', 'saleCustomer', 'saleTotalAmount',
      'saleStockHint',
      'productSuggestions', 'customerSuggestions',
      'paymentSheetOverlay', 'paymentSheet',
      'paymentCustomerName', 'paymentCustomerBalance',
      'paymentAmount', 'paymentRemaining',
      'manageInventoryList', 'inventoryListToolbar', 'manageDebtsList',
      'manageTotalDebt', 'manageStockSearch',
      'addProductTitle',
      'productName', 'productQty', 'productCost', 'productPrice', 'productMarkup',
      'productLowStock', 'productMarkupHint', 'editProductId',
      'productCategory', 'productBrand', 'productUnit', 'productPackageSize',
      'productBrandList', 'productPackageSizeList', 'inventoryCatFilters',
      'headerTutorialBtn', 'tutorialOverlay', 'tutorialBackdrop', 'tutorialHighlight',
      'tutorialBox', 'tutorialText', 'tutorialCurrent', 'tutorialTotal',
      'tutorialSkip', 'tutorialPrev', 'tutorialNext', 'markupSuggestion', 'markupHint', 'markupSuggestedPrice',
      'newDebtCustomer', 'newDebtAmount', 'newDebtSuggestions', 'newDebtPhone',
      'pdProductTitle', 'pdContainer', 'pdDeductQty',
      'cddBalanceCard', 'cddRecordPaymentBtn', 'cddSmsActions', 'cddLedger', 'debtorDetailName',
      'rpAmountField', 'rpRemainingPreview', 'rpNoteField', 'rpPayBtn', 'rpCustomerCard',
      'reportPeriodToggle', 'reportSummaryCards', 'reportBestSellers', 'reportRecentTx', 'reportLowStock',
      'helpTutSelector', 'helpHowTo', 'helpContact', 'helpAbout', 'howToList', 'tutorialSelector',
      'settingsLanguage', 'settingsStoreName', 'settingsOwnerName', 'settingsDefaultMarkup',
      'settingsLowStockThreshold', 'settingsDefaultCreditLimit',
      'saleCreditWarn', 'saleAllowAnyway', 'newDebtCreditWarn', 'newDebtAllowAnyway',
      'btnAddToCart', 'saleCartSection', 'saleCartList', 'saleCartEmpty', 'saleCartCount',
      'salePayCash', 'salePayCredit', 'saleCustomerWrap', 'salePhoneWrap', 'salePhone', 'btnCompleteSale',
      'cddCreditLimit',
      'setupOverlay', 'setupStoreName', 'setupOwnerName', 'setupLanguage',
      'toastContainer'
    ];
    ids.forEach(function(id) {
      dom[id] = document.getElementById(id);
    });
  }

  // ============================================
  // LOCALIZATION
  // ============================================
  var strings = {
    en: {
      greeting: 'Good day!',
      morningGreeting: 'Good morning!',
      greetingMorning: 'Good morning!',
      greetingAfternoon: 'Good afternoon!',
      greetingEvening: 'Good evening!',
      pageMorning: 'Morning',
      pageDay: 'Day',
      pageClosing: 'Close',
      morningSubtitle: 'Is your store ready for today?',
      stockOk: 'All stock is good',
      stockOkDesc: 'No items running low',
      stockWarn: '{n} item(s) need attention',
      stockWarnDesc: 'Items running low or out of stock',
      debtTotal: 'Debt: {amount}',
      debtTotalDesc: '{n} customer(s)',
      yesterday: 'Yesterday: {amount}',
      yesterdayDesc: "Yesterday's sales",
      startDay: 'Start the Day',
      closeDay: 'Close Store \ud83c\udf19',
      overdueTitle: 'The store wasn\'t closed',
      overdueDesc: 'Opened {date} · Open for {n} days',
      overdueCloseStart: 'Close Old Day & Start Today',
      overdueReview: 'Review Last Day\'s Sales',
      overdueReviewTitle: 'Last Day\'s Sales',
      overdueReviewEmpty: 'No sales were recorded on that day.',
      overdueReviewTotal: 'Total',
      overdueArchivedToast: 'Previous day\'s sales saved safely. New day started!',
      overdueRedirect: 'Please close the previous day on the Morning page.',
      overdueDevConfirm: 'A developer date override is active. This archives the previous day\'s sales into real history — permanent if the tab is closed before clearing the override. Continue?',
      dayModeLabel: 'Today',
      payTitle: 'Pay',
      earnings: 'Earnings',
      itemsSold: 'Sold',
      utangToday: 'Debt Today',
      noTransactions: 'No transactions yet — start selling to see them here!',
      closingExpenses: 'Cost of Goods',
      closingActualSales: 'Cash Counted',
      closingProfitLabel: 'Profit from Items Sold',
      closingProfitHint: 'Revenue minus cost of goods sold.',
      closingExpensesToday: 'Store Expenses Today',
      closingNetProfit: 'Net Profit',
      closingNetProfitHint: 'Profit after store expenses.',
      noSales: 'No sales yet — tap Sell to record your first sale!',
      closingRecordedSales: 'Cash Sales Today',
      closingSalesDiff: 'Cash Difference',
      allStockOk: 'All stock is good — you\'re ready to sell!',
      noDebts: 'No outstanding debts — everyone is settled!',
      dayCompleteSub: 'Rest well, {name}. See you tomorrow!',
      productLabel: 'What did they buy?',
      productPlaceholder: 'Search product...',
      qtyLabel: 'How many?',
      customerLabel: 'Who? (if credit)',
      customerPlaceholder: 'Customer name (optional)',
      totalLabel: 'Total:',
      cancel: 'Cancel',
    close: 'Close',
      save: 'Save',
      stockHint: 'Available: {qty}',
      noStock: 'Out of stock',
      payLabel: 'How much to pay?',
      payPreview: 'Remaining after payment:',
      payBtn: 'Paid',
      payBalance: 'Balance: {amount}',
      addStock: 'Add Stock',
      searchProduct: 'Search product...',
      totalDebtLabel: 'Total Debt',
      payBtnLabel: 'Pay',
      settingsLanguage: 'Language',
      settingsStore: 'Store Name',
      settingsOwner: 'Owner Name',
      settingsSectionProfile: 'Store Profile',
      settingsSectionDisplay: 'Display',
      settingsSectionDefaults: 'Inventory Defaults',
      settingsSectionData: 'Data',
      settingsSectionSupport: 'Support',
      resetData: 'Reset Data',
      exportData: 'Export Data',
      importDataBtn: 'Import Data',
      mobileOnlyNotifications: 'Push Notifications',
      mobileOnlyNotificationsDesc: 'This feature requires the TindaGo mobile app for device notifications.',
      mobileOnlySms: 'SMS Notifications',
      mobileOnlySmsDesc: 'This feature requires the TindaGo mobile app for SMS messaging.',
      mobileOnlyNotifSettings: 'Notification Settings',
      mobileOnlyNotifSettingsDesc: 'This feature requires the TindaGo mobile app for notification settings.',
      mobileOnlyTitle: 'Mobile-only functionality',
      mobileOnlyDesc: 'This feature is available on the TindaGo mobile app. Please use the mobile app to continue.',
      mobileOnlyOk: 'OK',
      phoneHintSms: 'Used for SMS receipts and reminders on the mobile app.',
      setupBtn: "Let's start!",
      setupTitle: 'Welcome to TindaGo!',
      setupSubtitle: "Let's get started. Tell us about your store.",
      setupStorePlaceholder: "e.g. Maria's Store",
      setupOwnerPlaceholder: 'e.g. Maria Santos',
      productName: 'Product Name',
      productQty: 'Quantity',
      productCost: 'Cost Price',
      productPrice: 'Selling Price',
      productMarkup: 'Markup (%)',
      markupHint: 'Cost {cost} + {pct}% ({amount}) = Suggested {price}',
      markupBoxHint: 'Cost {cost} + {pct}% = {amount}',
      defaultMarkupLabel: 'Default Markup (%)',
      defaultMarkupHint: 'For new products',
      defaultCreditLimitLabel: 'Default Credit Limit (₱)',
      defaultCreditLimitHint: 'For new customers. 0 = no limit.',
      creditLimitLabel: 'Credit Limit',
      creditLimitNone: 'No limit',
      creditLimitUsesDefault: 'Uses default',
      creditLimitEdit: 'Edit',
      creditLimitCancel: 'Cancel',
      creditLimitSave: 'Save',
      creditLimitSaved: 'Credit limit saved.',
      smsSendReceipt: 'Ipadala ang Receipt',
      smsSendReminder: 'Ipadala ang Paalala',
      smsNoPhone: 'Walang telepono. I-edit ang utang para magdagdag para sa SMS.',
      phoneLabel: 'Numero ng Telepono (opsyonal)',
      smsSendReceipt: 'Send Receipt',
      smsSendReminder: 'Send Reminder',
      smsNoPhone: 'No phone number saved. Edit this debt to add one for SMS.',
      phoneLabel: 'Phone Number (optional)',
      creditWarnNear: '⚠ Getting close to their {limit} credit limit',
      creditWarnOver: '⛔ This would put {name} at {total} — over their {limit} credit limit',
      creditWarnAtLimit: '⛔ {name} is at their {limit} credit limit',
      creditAllowAnyway: 'Allow anyway',
      overLimitDebtors: 'Over-limit debtors',
      newDebtCustomer: 'Customer Name',
      newDebtAmount: 'Debt Amount',
      newDebtTitle: 'New Debt',
      saveDebt: 'Save Debt',
      enterCustomerNameDebt: 'Enter customer name',
      saved: 'Saved!',
      saleSaved: 'Sale recorded!',
      debtSaved: 'Debt recorded!',
      paymentSaved: 'Payment recorded!',
      currentBalance: 'Current Balance',
      recordPayment: 'Record Payment',
      productSaved: 'Product saved!',
      dataReset: 'Data has been reset.',
      noProducts: 'No products yet — add your first product to get started!',
      noDebtItems: 'No debts yet — credit sales will appear here.',
      confirmReset: 'Reset all data? This cannot be undone.',
      dayAlreadyOpen: 'Day is already open!',
      dayNotOpen: 'Day not started yet!',
      profitLabel: 'Profit from Items Sold',
      // Expense Log (V2.71)
      pageExpenses: 'Store Expenses',
      expensesSubtitle: 'Record store expenses — rent, utilities, transport, wages, and more.',
      expensesTodayLabel: 'Today',
      expensesTotalToday: 'Total Today',
      expenseAddTitle: 'Add Expense',
      expenseAmount: 'Amount (₱)',
      expenseAmountPlaceholder: '0.00',
      expenseCategory: 'Category',
      expenseCategoryPlaceholder: 'Select category...',
      expenseDate: 'Date',
      expenseNote: 'Note (optional)',
      expenseNotePlaceholder: 'e.g. electric bill',
      expenseSave: 'Save Expense',
      expenseDelete: 'Delete',
      expenseEmpty: 'No expenses yet — tap + to record your first expense.',
      expenseAdded: 'Expense added.',
      expenseDeleted: 'Expense deleted.',
      expenseAmountRequired: 'Enter an amount greater than 0.',
      expenseCategoryRequired: 'Choose a category.',
      expenseListTitle: 'All Expenses',
      expUtilities: 'Utilities',
      expRent: 'Rent',
      expTransport: 'Transport',
      expPermits: 'Permits & Fees',
      expLabor: 'Labor',
      expSupplies: 'Supplies',
      expMaintenance: 'Maintenance',
      expOther: 'Other',
      dayExpensesBtn: 'Store Expenses Today',
      // Tutorial
      next: 'Next',
      skip: 'Skip',
      prev: 'Previous',
      suggestedPrice: 'Suggested',
      textSize: 'Text Size',
      standard: 'Standard',
      large: 'Large',
      extraLarge: 'Extra Large',
      // Main Tutorial (multi-page walkthrough)
      mainTutorial1: 'Welcome to TindaGo! This quick tour will guide you through your store\'s daily routine — from morning check to closing.',
      mainTutorial2: 'The Stock card shows items running low or out of stock. Tap Stock in the nav to view and manage your inventory.',
      mainTutorial3: 'The Debt card shows how much customers owe you. Tap Debts to view and track payments.',
      mainTutorial4: 'When ready, tap "Start the Day" to open your store for business and start recording sales.',
      mainTutorial5: 'Welcome to Day Mode! This is where you record sales as they happen throughout the day.',
      mainTutorial6: 'The Today summary shows your earnings, items sold, and utang transactions at a glance.',
      mainTutorial7: 'Tap the Sell button to open the checkout page. Add products to the cart, choose Cash or Credit, then complete the sale.',
      checkoutTutorial1: 'This is the checkout page — ring up one customer at a time. Search for a product and set the quantity.',
      checkoutTutorial2: 'Tap "Add to Cart" to put it in the cart. You can add several different products to one sale.',
      checkoutTutorial3: 'The cart lists every item. Use −/+ to change quantities or ✕ to remove an item before completing.',
      checkoutTutorial4: 'Choose Cash or Credit (Utang). For credit, enter the customer name once — the whole cart is charged to them.',
      checkoutTutorial5: 'Review the total, then tap "Complete Sale". Stock and earnings update automatically.',
      mainTutorial8: 'At the end of the day, the Closing screen shows a full summary of today\'s performance.',
      mainTutorial9: 'Enter the actual cash you counted. Profit is calculated from each item selling margin.',
      mainTutorial10: 'Tap "Day Complete" when you\'re ready to finalize. Your daily summary will be saved to history.',
      mainTutorial11: 'The Inventory page lets you search, add, and manage all your stock items in one place.',
      mainTutorial12: 'Tap "Add Stock" to add new products or restock existing items with cost and selling price.',
      mainTutorial13: 'The Debts page tracks all customer debts. The total outstanding amount is shown at the top.',
      mainTutorial14: 'Visit Settings anytime to change language, text size, store name, or owner name. Tap section headers to expand settings.',
      // Morning Tutorial
      morningTutorial1: 'This is the Morning Check — your daily overview before opening the store.',
      morningTutorial2: 'Check which items are running low or out of stock so you can restock today.',
      morningTutorial3: 'Review outstanding customer debts to see who still needs to pay.',
      morningTutorial4: 'Yesterday\'s earnings summary helps you track daily performance.',
      morningTutorial5: 'Tap "Start the Day" when you\'re ready to open your store and start selling!',
      // Day Tutorial
      dayTutorial1: 'This is Day Mode — record sales as they happen throughout your business day.',
      dayTutorial2: 'Your cash earnings update in real-time as you record sales.',
      dayTutorial3: 'Track how many items you\'ve sold today with the sold counter.',
      dayTutorial4: 'Utang (credit) sales are tracked separately so you know what\'s still owed.',
      dayTutorial5: 'All today\'s transactions appear here with time, product, and amount details.',
      dayTutorial6: 'When your store day is done, tap "Close Store" to view the closing summary.',
      // Closing Tutorial
      closingTutorial1: 'This is the Closing screen — finalize your day with a complete summary.',
      closingTutorial2: 'Enter the actual cash you counted at the end of the day (actual sales).',
      closingTutorial3: 'Enter the actual total sales counted at the end of the day (actual sales).',
      closingTutorial4: 'Your profit is calculated from each item - selling price minus cost price.',
      closingTutorial5: 'All items sold today are listed here with quantities and amounts.',
      closingTutorial6: 'Items running low are shown here so you know what to restock tomorrow.',
      closingTutorial7: 'Outstanding debts are listed here — follow up with customers who still owe.',
      closingTutorial8: 'Tap "Day Complete" to finalize. Your daily data will be saved to history.',
      // Inventory Tutorial
      inventoryTutorial1: 'This is the Inventory page — manage all your stock items in one place.',
      inventoryTutorial2: 'Use the search bar to quickly find any product by name.',
      inventoryTutorial3: 'Tap "Add Stock" to add new products or restock existing ones.',
      inventoryTutorial4: 'All your inventory is listed with stock quantity, markup, and sell buttons.',
      inventoryTutorial5: 'Each item shows stock level and color-coded status. Tap the edit button to modify.',
      // Debts Tutorial
      debtsTutorial1: 'This is the Debts page — track all customer debts and record payments.',
      debtsTutorial2: 'The total outstanding debt across all customers is shown here.',
      debtsTutorial3: 'Tap the settings icon to customize your app experience.',
      debtsTutorial4: 'Customer debts are listed with name, last activity, and balance.',
      debtsTutorial5: 'Tap "Pay" on any customer to record a payment and reduce their balance.',
      // Settings Tutorial
      settingTutorial1: 'This is the Settings page — customize your app experience.',
      settingTutorial2: 'Choose between English and Filipino for the app language.',
      settingTutorial3: 'Adjust text size to Standard, Large, or Extra Large for better readability.',
      settingTutorial4: 'Enter your store name to personalize your app header.',
      settingTutorial5: 'Enter your owner name for a personalized greeting each day.',
      // Add Product Tutorial
      addProductTutorial1: 'This page lets you add a new product to your inventory.',
      addProductTutorial2: 'Enter the item name, quantity, cost price, and selling price.',
      addProductTutorial3: 'Set the markup percentage. The markup helper automatically suggests the right selling price.',
      addProductTutorial4: 'Enter the selling price or accept the suggested price from the markup helper.',
      addProductTutorial5: 'Tap "Save" to add the product to your inventory. You can edit it later from the Stock page.',
      tutorialReplayHint: 'You can always tap the ? button to replay this tutorial.',
      // Tutorial Labels
      tutMain: 'Main Tutorial',
      tutMorning: 'Morning Check Tutorial',
      tutDay: 'Day Mode Tutorial',
      tutCheckout: 'Checkout Tutorial',
      tutClosing: 'Closing Tutorial',
      tutInventory: 'Stock Tutorial',
      tutDebts: 'Debts Tutorial',
      tutSetting: 'Settings Tutorial',
      tutAddProduct: 'Add Product Tutorial',
      tutSelector: 'Select a tutorial...',
      tutLaunch: 'Launch',
      tutSection: 'Tutorials',
      // Nav
      navMorning: 'Morning',
      navSale: 'Sell',
      navClose: 'Close',
      // Day mode
      dayEarningsLabel: 'Cash Sales Today',
      dayItemsSoldLabel: 'Sold',
      dayUtangLabel: 'Credit Sales Today',
      dayTransactionsLabel: "Today's Transactions",
      // Closing
      closingTitle: 'Close Store \ud83c\udf19',
      closingSubtitle: 'Finish this day',
      closingSectionSales: 'Sales',
      closingSectionSold: 'Sold Items',
      closingSectionLowStock: 'Low Stock',
      closingSectionDebts: 'Unpaid Debts',
      closingSectionWeekly: 'This Week',
      closingWeeklyLabel: 'Total Sales',
      closingTopSellerLabel: 'Best Seller',
      completeDayBtn: 'Day Complete \u2713',
      backToDayBtn: 'Back to Day',
      dayCompleteTitle: 'Day Complete!',
      prepareTomorrow: 'Prepare for Tomorrow',
      // Sale sheet (V2.68: header now uses checkoutTitle — the legacy
      // "Someone Bought" sales-sheet title was removed)
      checkoutTitle: 'Checkout',
      saleQtyLabel: 'How many?',
      saleCustomerLabel: 'Who? (if credit)',
      saleTotalLabel: 'Total:',
      addToCart: 'Add to Cart',
      cartTitle: 'Cart',
      cartEmpty: 'Cart is empty',
      paymentMethod: 'Payment',
      payCash: 'Cash',
      payCredit: 'Credit (Utang)',
      completeSale: 'Complete Sale',
      saleCompleted: 'Transaction recorded!',
      discardCart: 'Discard cart?',
      discardCartMsg: 'Items in the cart will be removed.',
      noCustomerCredit: 'Enter a customer name for credit.',
      itemRemoved: 'Item removed',
      addedToCart: 'Added to cart',
      selectProductFirst: 'Select a product first.',
      selectFromList: 'Tap a product from the {label} list first',
      noProductsInList: 'No products in {label}',
      lineSubtotal: 'Subtotal',
      eachLabel: 'each',
      // Settings
      settingsTitle: 'Settings',
      dataMgmt: 'Data Management',
      resetDataBtn: 'Reset Data',
      exportDataBtn: 'Export Data',
      // Stock
      stockTitle: 'Stock',
      searchPlaceholder: 'Search product...',
      addStockBtn: 'Add Stock',
      // Stock — Demand Forecast (offline ML)
      forecastSortToggle: '\ud83d\udd2e Sort by Forecast',
      forecastSortOff: 'Sort by forecast',
      forecastInsufficientData: 'Collecting data\u2026',
      forecastNoDemand: 'No demand',
      forecastOutOfStock: 'Out of stock',
      forecastOutToday: 'Out today',
      forecastDaysLeftShort: '{n}d left',
      forecastAvgPerDay: 'Avg {n}/day',
      // Stock — Demand Forecast detail card + urgent restock (Stage 4)
      forecastDetailTitle: 'Forecast Demand',
      forecastDetailSubtitle: 'Pattern learned offline from your sales history',
      forecastMethod: 'Statistical ML',
      forecastHistory: 'Last 7 days sold',
      forecastHowItWorks: 'Avg from 7 days \u2192 daysUntilOut = stock \u00f7 avg.',
      forecastConfidenceHigh: 'High',
      forecastConfidenceMedium: 'Medium',
      forecastConfidenceLow: 'Low',
      forecastInsufficientHint: 'Not enough history \u2014 record 2+ days',
      forecastAvgLabel: 'Avg',
      forecastEmaLabel: 'EMA',
      forecastTrendLabel: 'Trend',
      forecastSuggestedRestock: 'Suggest +{n}',
      forecastFor7Days: 'for 7 days',
      forecastDaysLeftFull: '~{n} days left',
      forecastRestockSoonTitle: 'Restock Soon (ML Forecast) \ud83d\udd2e',
      forecastRestockSoonDesc: 'Predicted days until out of stock (7-day window)',
      forecastUrgentOutToday: 'Out today',
      forecastUrgentOutOfStock: 'Out of stock',
      forecastSuggestedShort: 'suggest +{n}',
      forecastReportTitle: 'Restock Soon (ML Forecast) \ud83d\udd2e',
      forecastReportDesc: '14-day demand window \u2014 buy these to avoid running out',
      // Restock
      tutRestock: 'Restock Day Tutorial',
      restockTutorial1: 'This is the Restock Day page - a guided 2-step workflow to update inventory.',
      restockTutorial2: 'Step 1: Check your shelves. Update the actual count for each product.',
      restockTutorial3: 'Enter the real count you see on your shelf next to what the app thinks.',
      restockTutorial4: 'Green check = count matches. Red = unrecorded sales were found.',
      restockTutorial5: 'After checking, tap Continue to Purchases to record what you bought.',
      restockTutorial6: 'Step 2: Search for a product, enter cost per unit and quantity, tap Add Item. Use the Back button to return to Step 1 if needed.',
      restockTutorial7: 'Review your purchases. Total cost is shown at the bottom.',
      restockTutorial8: 'Tap Done to save. Your inventory is updated. You can also go Back to make changes before finishing.',
      // New Debt tutorial
      tutNewDebt: 'New Debt Tutorial',
      newDebtTutorial1: 'This page lets you manually record a new debt for a customer.',
      newDebtTutorial2: 'Enter the customer\'s name. If they\'re a new customer, they\'ll be added automatically.',
      newDebtTutorial3: 'Enter the debt amount. This will be added to the customer\'s existing balance.',
      newDebtTutorial4: 'Tap "Save Debt" to record it. You can view all debts on the Debts page.',
      // v3.0 parity pages (Product Detail / Debtor Detail / Record Payment / Reports / Help)
      tutProductDetail: 'Product Detail Tutorial',
      tutDebtorDetail: 'Customer Debt Detail Tutorial',
      tutRecordPayment: 'Record Payment Tutorial',
      tutReport: 'Reports Tutorial',
      tutHelp: 'Help Tutorial',
      productDetailTutorial1: 'This page shows everything about a product: name, unit, stock quantity, cost price, selling price, and markup.',
      productDetailTutorial2: 'A color-coded alert appears when stock is running low or out of stock.',
      productDetailTutorial3: 'Deduct sold or damaged stock, restock, or edit the product details from this page.',
      productDetailTutorial4: 'Use Delete to permanently remove the product — with a confirmation first.',
      customerDebtDetailTutorial1: 'This page shows a customer\'s utang: current balance, total debt, and total collected.',
      customerDebtDetailTutorial2: 'The ledger below lists every debt addition and payment with its date and running balance.',
      customerDebtDetailTutorial3: 'Green rows are debt added to the customer; orange rows are payments received.',
      customerDebtDetailTutorial4: 'Tap Record Payment to accept a payment against this debt.',
      customerDebtDetailTutorial5: 'When the balance reaches zero, the debt is marked fully settled.',
      recordPaymentTutorial1: 'Enter how much the customer is paying against their current balance.',
      recordPaymentTutorial2: 'The remaining balance preview updates instantly as you type.',
      recordPaymentTutorial3: 'Add an optional note, like "paid in cash" or "partial payment".',
      recordPaymentTutorial4: 'Tap Pay to save the payment. The balance and history update automatically.',
      reportTutorial1: 'The Reports page shows your store\'s sales performance over time.',
      reportTutorial2: 'Use the toggle buttons to switch between Daily, Weekly, and Monthly views.',
      reportTutorial3: 'The summary cards show total sales and profit for the selected period.',
      reportTutorial4: 'Recent transactions appear here with details on each sale. Scroll to see more.',
      reportTutorial5: 'The Best-Selling Products section shows your top-performing items.',
      reportTutorial6: 'Low-stock items are listed here so you know what needs restocking.',
      helpTutorial1: 'This is the Help page — your guide to using TindaGo effectively.',
      helpTutorial2: 'The Tutorial Selector lets you choose from different tutorials. Select a tutorial from the dropdown and tap "Launch" to start a guided tour of any page.',
      helpTutorial3: 'The "How to Use" button opens a detailed guide with step-by-step instructions for recording sales, adding stock, tracking debts, viewing reports, and customizing settings.',
      helpTutorial4: 'The Contact section shows how to reach support for questions or feedback about the app.',
      helpTutorial5: 'The About section tells you about the app version and its purpose.',
      helpTutorial6: 'You can also access page-specific tutorials from any page by tapping the (?) Help button in the top-right corner of the header.',
      tutExpenses: 'Store Expenses Tutorial',
      expensesTutorial1: 'The Store Expenses page records money spent on the store itself — rent, electricity, transport, wages, and other operating costs.',
      expensesTutorial2: 'Fill in the amount and pick a category. The date defaults to today, and a note is optional.',
      expensesTutorial3: 'Expenses are subtracted from your profit to show Net Profit (Tunay na Kita) on the Closing and Reports pages.',
      pdTitle: 'Product Detail',
      criticalStockAlert: '⚠️ Critical Stock Alert',
      criticalAlertDesc: 'This item is out of stock. Restock soon.',
      stockLabel: 'Stock',
      sellPrice: 'Selling Price',
      profitMargin: 'Markup',
      deductStock: 'Deduct Stock',
      deductBtn: 'Deduct',
      restockBtn: 'Restock',
      editBtn: 'Edit',
      deleteBtn: 'Delete',
      confirmDeleteProduct: 'Delete this product from your inventory?',
      productNotFound: 'Product not found',
      fullySettled: '✅ Fully Settled',
      lastActivity: 'Last activity:',
      debtHistory: 'Debt History',
      descHeader: 'Description',
      amountHeader: 'Amount',
      balanceHeader: 'Balance',
      initialDebt: 'Initial',
      totalCollected: 'Total Collected',
      customerNotFound: 'Customer not found',
      paymentAmount: 'Payment Amount',
      paymentExceeds: 'Amount exceeds the balance',
      enterAmount: 'Enter a valid amount.',
      note: 'Note',
      paymentNotePlaceholder: 'e.g. paid in cash',
      savePayment: 'Save Payment',
      reportsTitle: 'Reports',
      periodDay: 'Day',
      periodWeek: 'Week',
      periodMonth: 'Month',
      totalSales: 'Total Sales',
      reportsProfit: 'Gross Profit',
      reportsExpenses: 'Expenses',
      reportsNetProfit: 'Net Profit',
      bestSelling: 'Best-Selling Products',
      recentTransactions: 'Recent Transactions',
      lowStockItems: 'Low Stock Items',
      transactions: 'Transactions',
      reportItemsSold: 'Items Sold',
      cashSales: 'Cash Sales',
      utangSales: 'Credit Sales',
      utangReport: 'Debts / Receivables',
      outstandingUtang: 'Outstanding Debts',
      activeDebtors: 'Active Debtors',
      collected: 'Collected',
      debtAging: 'Age of unpaid debts',
      debtAge30: '0-30 days',
      debtAge60: '31-60 days',
      debtAge60Plus: '60+ days',
      weeklyTrend: 'Weekly Sales Trend',
      stockHealth: 'Stock Health',
      stockValue: 'Stock Value',
      slowMovers: 'Slow Movers (no sales in 30 days)',
      noSlowMovers: 'All items are selling well.',
      noSales30: 'No sales in 30 days',
      leftLabel: 'left',
      outOfStockLabel: 'Out of stock',
      exportReport: 'Export CSV',
      exportReportDone: 'Report exported.',
      exportReportError: 'Export failed.',
      reportSummaryLine: '{period}: {sales} sales, {profit} profit{vs}{owed}',
      reportVsUp: ' \u25b2 +{pct}% vs previous',
      reportVsDown: ' \u25bc {pct}% vs previous',
      reportOwed: ' \u00b7 {owed} still owed to you',
      noData: 'No data yet',
      helpTitle: 'Help',
      replayTutorial: 'Replay Tutorial',
      howToUse: 'How to Use',
      contactInfo: 'Contact',
      aboutApp: 'About App',
      contactText: 'For questions or feedback, email support@tindago.com',
      aboutText: 'TindaGo v3.0 — a store management app for sari-sari store owners.',
      howToSales: 'Record your daily cash sales and specific item sales on the Sales page.',
      howToStock: 'Add products, restock, and track inventory levels on the Stocks page.',
      howToDebts: 'Track customer debts and record payments on the Debts page.',
      howToReports: 'View your store\'s performance on the Reports page.',
      howToSettings: 'Customize language, text size, store and owner name in Settings.',
      moreSection: 'More',
      // Debts
      debtsTitle: 'Debts',
      debtsTotalLabel: 'Total Debt',
      newDebtBtn: 'New Debt',
      stocksLink: 'Stock',
      debtsLink: 'Debts',
      // Add product
      addProductTitle: 'Add Stock',
      editProductTitle: 'Edit Stock',
      productNameLabel: 'Product Name',
      productQtyLabel: 'Quantity',
      costLabel: 'Cost Price (\u20b1)',
      priceLabel: 'Selling Price (\u20b1)',
      markupLabel: 'Markup (%)',
      lowStockAlertLabel: 'Low Stock Alert At',
      alertThreshold: 'Low Stock Threshold',
      alertThresholdDesc: 'Alert when stock is low',
      saveBtn: 'Save',
      // Product details (units, brands, categories)
      productDetailsSection: 'Product Details',
      productDetailsHint: 'Optional — helps sort your products',
      categoryLabel: 'Category',
      brandLabel: 'Brand',
      unitLabel: 'Unit',
      packageSizeLabel: 'Package Size',
      brandPlaceholder: 'e.g. Ligo, Bear Brand',
      packageSizePlaceholder: 'e.g. 155g, 1L',
      catAll: 'All',
      catPantryStaples: 'Pantry Staples & Cooking', catCannedGoods: 'Canned Goods', catInstantDryGoods: 'Instant & Dry Goods',
      catSnacksSweets: 'Snacks, Biscuits & Sweets', catBeverages: 'Beverages', catDairyRefrigerated: 'Dairy & Refrigerated',
      catFreshSection: 'Fresh Section', catLiquorWine: 'Liquor, Wine & Tobacco', catPersonalCare: 'Personal Care',
      catHouseholdCare: 'Household & Home Care', catBabyCare: 'Baby Care', catPaperSanitary: 'Paper & Sanitary',
      catOther: 'Other',
      subRice: 'Rice', subCookingOil: 'Cooking Oil', subSugar: 'Sugar', subSalt: 'Salt', subVinegar: 'Vinegar', subBread: 'Bread / Pandesal',
      subSardines: 'Sardines', subCornedBeef: 'Corned Beef', subTuna: 'Tuna', subMeatLoaf: 'Meat Loaf', subSausage: 'Sausage',
      subInstantNoodles: 'Instant Noodles', subCupNoodles: 'Cup Noodles', subPasta: 'Pasta', subSoupMixes: 'Soup Mixes',
      subChips: 'Chips', subCrackers: 'Crackers', subCandies: 'Candies', subChocolates: 'Chocolates', subCookies: 'Cookies',
      subCoffeeMix: 'Coffee Mix', subPowderedMilk: 'Powdered Milk', subChocolateDrink: 'Chocolate Drink', subJuice: 'Juice',
      subSoftDrinks: 'Soft Drinks', subBottledWater: 'Bottled Water',
      subCheese: 'Cheese', subButter: 'Butter', subMargarine: 'Margarine', subChilledMeats: 'Chilled Meats',
      subFreshMeat: 'Fresh Meat', subFreshSeafood: 'Fresh Seafood', subFruits: 'Fruits', subVegetables: 'Vegetables', subEggs: 'Eggs',
      subBeer: 'Beer', subGin: 'Gin', subBrandy: 'Brandy', subWine: 'Wine', subCigarettes: 'Cigarettes',
      subShampoo: 'Shampoo', subConditioner: 'Conditioner', subBathSoap: 'Bath Soap', subToothpaste: 'Toothpaste',
      subToothbrush: 'Toothbrush', subLotion: 'Lotion', subCosmetics: 'Cosmetics',
      subLaundry: 'Laundry', subFabricSoftener: 'Fabric Softener', subDishwashing: 'Dishwashing', subCleaners: 'Cleaners',
      subTrashBags: 'Trash Bags', subMosquitoControl: 'Mosquito Control',
      subDiapers: 'Diapers', subBabyWipes: 'Baby Wipes', subBabyToiletries: 'Baby Toiletries',
      subTissue: 'Tissue', subPaperTowels: 'Paper Towels', subSanitaryPads: 'Sanitary Pads',
      subcategoriesLabel: 'Subcategories',
      checkoutOverflow: '{n} more — refine search or category',
      catMore: 'More ▾', catLess: 'Less ▴',
      unitPiece: 'piece', unitSachet: 'sachet', unitPack: 'pack', unitBox: 'box',
      unitBottle: 'bottle', unitCan: 'can', unitKg: 'kg', unitG: 'g',
      unitL: 'L', unitMl: 'mL', unitBundle: 'bundle', unitDozen: 'dozen',
      unitSack: 'sack', unitLoaf: 'loaf', unitTube: 'tube', unitBar: 'bar', unitSticks: 'sticks'
    },
    fil: {
      greeting: 'Magandang araw!',
      morningGreeting: 'Magandang umaga!',
      greetingMorning: 'Magandang umaga!',
      greetingAfternoon: 'Magandang hapon!',
      greetingEvening: 'Magandang gabi!',
      pageMorning: 'Umaga',
      pageDay: 'Araw',
      pageClosing: 'Isara',
      morningSubtitle: 'Handa na ba ang tindahan ngayong araw?',
      stockOk: 'Lahat ng stock okay',
      stockOkDesc: 'Walang item na kulang',
      stockWarn: '{n} item(s) ang kailangan ng pansin',
      stockWarnDesc: 'Mga item na nauubos na o wala na',
      debtTotal: 'Utang: {amount}',
      debtTotalDesc: '{n} kostumer(s)',
      yesterday: 'Kahapon: {amount}',
      yesterdayDesc: 'Benta kahapon',
      startDay: 'Simulan ang Araw',
      closeDay: 'Isara ang Tindahan \ud83c\udf19',
      overdueTitle: 'Hindi pa isinara ang tindahan',
      overdueDesc: 'Binuksan noong {date} · Bukas na sa loob ng {n} na araw',
      overdueCloseStart: 'Isara ang dating araw at simulan ang bago',
      overdueReview: 'Tingnan ang Benta ng Nakaraang Araw',
      overdueReviewTitle: 'Benta ng Nakaraang Araw',
      overdueReviewEmpty: 'Walang naitalang benta sa araw na iyon.',
      overdueReviewTotal: 'Kabuuan',
      overdueArchivedToast: 'Na-save nang ligtas ang benta ng nakaraang araw. Nagsimula na ang bagong araw!',
      overdueRedirect: 'Pakiusap, isara muna ang nakaraang araw sa pahina ng Umaga.',
      overdueDevConfirm: 'Aktibo ang developer date override. Aarkibuhin nito ang benta ng nakaraang araw sa totoong history — permanente ito kung isasara ang tab bago i-clear ang override. Magpatuloy?',
      dayModeLabel: 'Araw na ito',
      payTitle: 'Magbayad',
      earnings: 'Kita',
      itemsSold: 'Naibenta',
      utangToday: 'Utang Ngayon',
      noTransactions: 'Wala pang transaksyon.',
      closingExpenses: 'Gastos sa Paninda',
      closingRecordedSales: 'Bentang Cash Ngayon',
      closingActualSales: 'Perang Nabilang sa Drawer',
      closingSalesDiff: 'Pagkakaiba ng Pera',
      closingProfitLabel: 'Tubo mula sa mga Naibenta',
      closingProfitHint: 'Benta ng mga naibenta minus ang halaga ng paninda.',
      closingExpensesToday: 'Mga Gastos sa Tindahan Ngayon',
      closingNetProfit: 'Tunay na Kita',
      closingNetProfitHint: 'Tunay na Kita = tubo mula sa mga naibenta - mga gastos ng tindahan.',
      noSales: 'Walang naitalang benta.',
      allStockOk: 'Lahat ng stock ay okay.',
      noDebts: 'Walang utang na natitira.',
      dayCompleteSub: 'Magpahinga na, {name}. Bukas ulit!',
      productLabel: 'Ano ang binili?',
      productPlaceholder: 'Maghanap ng produkto...',
      qtyLabel: 'Ilan?',
      customerLabel: 'Sino? (kung utang)',
      customerPlaceholder: 'Pangalan ng kostumer (opsyonal)',
      totalLabel: 'Total:',
      cancel: 'Kanselahin',
    close: 'Isara',
      save: 'I-save',
      stockHint: 'Available: {qty}',
      noStock: 'Walang stock',
      payLabel: 'Magkano ang ibabayad?',
      payPreview: 'Matitira pagkatapos:',
      payBtn: 'Bayad Na',
      payBalance: 'Balanse: {amount}',
      addStock: 'Magdagdag ng Stock',
      searchProduct: 'Maghanap ng produkto...',
      totalDebtLabel: 'Kabuuang Utang',
      payBtnLabel: 'Bayad',
      settingsLanguage: 'Wika',
      settingsStore: 'Pangalan ng Tindahan',
      settingsOwner: 'Pangalan ng May-ari',
      settingsSectionProfile: 'Profile ng Tindahan',
      settingsSectionDisplay: 'Display',
      settingsSectionDefaults: 'Default ng Inventory',
      settingsSectionData: 'Data',
      settingsSectionSupport: 'Suporta',
      resetData: 'I-reset ang Data',
      exportData: 'I-export ang Data',
      importDataBtn: 'I-import ang Data',
      mobileOnlyNotifications: 'Mga Notipikasyon',
      mobileOnlyNotificationsDesc: 'Ang feature na ito ay available sa TindaGo mobile app. Ginagamit nito ang notification system ng iyong phone para magpadala ng mga alerto para sa hindi naisara na tindahan, mababang stock, restock reminders, at oras ng pagsasara.',
      mobileOnlySms: 'SMS Notifications',
      mobileOnlySmsDesc: 'Ang feature na ito ay available sa TindaGo mobile app. Nagpapadala ng utang na paalala at resibo gamit ang SMS gamit ang messaging capability ng iyong phone.',
      mobileOnlyNotifSettings: 'Mga Setting ng Notipikasyon',
      mobileOnlyNotifSettingsDesc: 'Ang feature na ito ay available sa TindaGo mobile app. I-configure ang mga notification channel para sa hindi naisara na tindahan, mababang stock, restock reminders, at oras ng pagsasara.',
      mobileOnlyTitle: 'Mobile-only na functionality',
      mobileOnlyDesc: 'Ang feature na ito ay available sa TindaGo mobile app. Mangyaring gamitin ang mobile app para magpatuloy.',
      mobileOnlyOk: 'OK',
      phoneHintSms: 'Ginagamit para sa SMS receipts at reminders sa mobile app.',
      setupBtn: 'Magsimula na!',
      setupTitle: 'Maligayang pagdating sa TindaGo!',
      setupSubtitle: 'Magsimula tayo. Sabihin sa amin ang tungkol sa iyong tindahan.',
      setupStorePlaceholder: 'Hal. Tindahan ni Maria',
      setupOwnerPlaceholder: 'Hal. Maria Santos',
      productName: 'Pangalan ng Produkto',
      productQty: 'Dami',
      productCost: 'Presyo ng Stock',
      productPrice: 'Presyo ng Benta',
      productMarkup: 'Markup (%)',
      markupHint: 'Halaga {cost} + {pct}% ({amount}) = Mungkahing {price}',
      markupBoxHint: 'Halaga {cost} + {pct}% = {amount}',
      defaultMarkupLabel: 'Default na Markup (%)',
      defaultMarkupHint: 'Para sa mga bagong produkto',
      defaultCreditLimitLabel: 'Default na Limit ng Utang (₱)',
      defaultCreditLimitHint: 'Para sa mga bagong kostumer. 0 = walang limit.',
      creditLimitLabel: 'Limit ng Utang',
      creditLimitNone: 'Walang limit',
      creditLimitUsesDefault: 'Ginagamit ang default',
      creditLimitEdit: 'I-edit',
      creditLimitCancel: 'Kanselahin',
      creditLimitSave: 'I-save',
      creditLimitSaved: 'Na-save ang limit ng utang.',
      creditWarnNear: '⚠ Malapit na sa kanyang {limit} limit ng utang',
      creditWarnOver: '⛔ Ilalagay nito si {name} sa {total} — lampas sa kanyang {limit} limit',
      creditWarnAtLimit: '⛔ Naabot na ni {name} ang kanyang {limit} limit ng utang',
      creditAllowAnyway: 'Payagan pa rin',
      overLimitDebtors: 'Lampas sa limit ng utang',
      newDebtCustomer: 'Pangalan ng Kostumer',
      newDebtAmount: 'Halaga ng Utang',
      newDebtTitle: 'Bagong Utang',
      saveDebt: 'I-save ang Utang',
      enterCustomerNameDebt: 'Ilagay ang pangalan ng kostumer',
      saved: 'Na-save!',
      saleSaved: 'Naitala ang benta!',
      debtSaved: 'Naitala ang utang!',
      paymentSaved: 'Naitala ang bayad!',
      currentBalance: 'Kasalukuyang Balanse',
      recordPayment: 'Magtala ng Bayad',
      productSaved: 'Na-save ang produkto!',
      dataReset: 'Na-reset ang data.',
      noProducts: 'Wala pang produkto.',
      noDebtItems: 'Wala pang utang.',
      confirmReset: 'I-reset ang lahat ng data? Hindi ito maaaring i-undo.',
      dayAlreadyOpen: 'Bukas na ang araw!',
      dayNotOpen: 'Hindi pa bukas ang araw!',
      profitLabel: 'Tubo mula sa mga Naibenta',
      // Expense Log (V2.71)
      pageExpenses: 'Mga Gastos sa Tindahan',
      expensesSubtitle: 'Itala ang mga gastos ng tindahan — upa, kuryente, pamasahe, sahod, at iba pa.',
      expensesTodayLabel: 'Ngayon',
      expensesTotalToday: 'Kabuuang Ngayon',
      expenseAddTitle: 'Magdagdag ng Gastos',
      expenseAmount: 'Halaga (₱)',
      expenseAmountPlaceholder: '0.00',
      expenseCategory: 'Kategorya',
      expenseCategoryPlaceholder: 'Pumili ng kategorya...',
      expenseDate: 'Petsa',
      expenseNote: 'Tandaan (opsyonal)',
      expenseNotePlaceholder: 'hal. bill ng kuryente',
      expenseSave: 'I-save ang Gastos',
      expenseDelete: 'Burahin',
      expenseEmpty: 'Wala pang naitalang gastos.',
      expenseAdded: 'Naidagdag ang gastos.',
      expenseDeleted: 'Nabura ang gastos.',
      expenseAmountRequired: 'Maglagay ng halagang mas malaki sa 0.',
      expenseCategoryRequired: 'Pumili ng kategorya.',
      expenseListTitle: 'Lahat ng Gastos',
      expUtilities: 'Kuryente at Tubig',
      expRent: 'Upa',
      expTransport: 'Pamasahe / Deliveries',
      expPermits: 'Lisensya / Bayarin',
      expLabor: 'Sahod',
      expSupplies: 'Mga Gamit',
      expMaintenance: 'Pagkukumpuni',
      expOther: 'Iba pa',
      dayExpensesBtn: 'Mga Gastos sa Tindahan Ngayon',
      // Tutorial
      next: 'Susunod',
      skip: 'Laktawan',
      prev: 'Nakaraan',
      suggestedPrice: 'Mungkahi',
      textSize: 'Laki ng Teksto',
      standard: 'Karaniwan',
      large: 'Malaki',
      extraLarge: 'Pinakamalaki',
      // Main Tutorial (multi-page walkthrough)
      mainTutorial1: 'Maligayang pagdating sa TindaGo! Ang tour na ito ay gagabay sa iyo sa pang-araw-araw na gawain ng iyong tindahan.',
      mainTutorial2: 'Ang Stock card ay nagpapakita ng mga item na nauubos o wala na. I-tap ang Stock sa nav para tingnan ang iyong inventory.',
      mainTutorial3: 'Ang Debt card ay nagpapakita ng utang ng mga kostumer. I-tap ang Debts para makita at subaybayan ang mga bayad.',
      mainTutorial4: 'Kapag handa na, i-tap ang "Simulan ang Araw" para buksan ang tindahan at magsimulang magtala ng benta.',
      mainTutorial5: 'Maligayang pagdating sa Day Mode! Dito mo itinatala ang mga benta habang nangyayari ang mga ito.',
      mainTutorial6: 'Ang Today summary ay nagpapakita ng iyong kita, naibenta, at utang sa isang sulyap.',
      mainTutorial7: 'I-tap ang Benta para buksan ang checkout page. Magdagdag ng mga produkto sa cart, pumili ng Cash o Utang, tapos tapusin ang benta.',
      checkoutTutorial1: 'Ito ang checkout page — isang customer sa isang transaksyon. Maghanap ng produkto at ilagay ang dami.',
      checkoutTutorial2: 'I-tap ang "Add to Cart" para ilagay ito sa cart. Pwedeng magdagdag ng iba\'t ibang produkto sa isang benta.',
      checkoutTutorial3: 'Ipinapakita ng cart ang bawat item. Gamitin ang −/+ para baguhin ang dami o ✕ para alisin ang item.',
      checkoutTutorial4: 'Pumili ng Cash o Utang. Para sa utang, ilagay ang pangalan ng kostumer nang isang beses — buong cart ang sisingilin sa kanya.',
      checkoutTutorial5: 'Suriin ang total, tapos i-tap ang "Complete Sale". Awtomatikong mag-a-update ang stock at kita.',
      mainTutorial8: 'Sa pagtatapos ng araw, ang Closing screen ay nagpapakita ng buong summary ng performance ngayong araw.',
      mainTutorial9: 'Ilagay ang aktwal na pera. Awtomatikong kukuwentahin ang kita mula sa bawat item.',
      mainTutorial10: 'I-tap ang "Tapos Na ang Araw" para tapusin. Ang iyong daily summary ay mase-save sa history.',
      mainTutorial11: 'Ang Inventory page ay nagbibigay-daan sa iyo na maghanap, magdagdag, at mamahala ng stock.',
      mainTutorial12: 'I-tap ang "Magdagdag ng Stock" para magdagdag ng bagong produkto o mag-restock.',
      mainTutorial13: 'Ang Debts page ay sumusubaybay sa lahat ng utang ng kostumer. Ang kabuuang halaga ay nasa itaas.',
      mainTutorial14: 'Pumunta sa Settings anumang oras para baguhin ang wika, laki ng teksto, o pangalan ng tindahan. I-tap ang mga section header para buksan ang settings.',
      // Morning Tutorial
      morningTutorial1: 'Ito ang Morning Check — ang iyong pang-araw-araw na pagsusuri bago buksan ang tindahan.',
      morningTutorial2: 'Tingnan kung aling mga item ang nauubos o wala na para mag-restock ngayong araw.',
      morningTutorial3: 'Suriin ang mga natitirang utang ng kostumer upang makita kung sino ang may puwedeng magbayad.',
      morningTutorial4: 'Ang summary ng kita kahapon ay tumutulong sa iyo na subaybayan ang performance.',
      morningTutorial5: 'I-tap ang "Simulan ang Araw" kapag handa ka nang buksan ang tindahan at magsimula!',
      // Day Tutorial
      dayTutorial1: 'Ito ang Day Mode — itala ang mga benta habang nangyayari ang mga ito sa buong araw.',
      dayTutorial2: 'Ang iyong cash earnings ay nag-a-update sa real-time habang nagtatala ka ng benta.',
      dayTutorial3: 'Subaybayan kung ilang items ang naibenta ngayong araw gamit ang sold counter.',
      dayTutorial4: 'Ang utang (credit) sales ay hiwalay na sinusubaybayan para malaman mo kung ano ang hindi pa bayad.',
      dayTutorial5: 'Lahat ng transaksyon ngayong araw ay lilitaw dito kasama ang oras, produkto, at halaga.',
      dayTutorial6: 'Kapag tapos na ang araw ng tindahan, i-tap ang "Isara ang Tindahan" para makita ang closing summary.',
      // Closing Tutorial
      closingTutorial1: 'Ito ang Closing screen — tapusin ang iyong araw na may kumpletong summary.',
      closingTutorial2: 'Ilagay ang aktwal na perang nabilang mo sa pagtatapos ng araw (aktwal na benta).',
      closingTutorial3: 'Ilagay ang aktwal na kabuuang benta na nabilang mo sa pagtatapos ng araw.',
      closingTutorial4: 'Ang kita ay kinakwenta mula sa bawat item - presyo ng benta minus presyo ng stock.',
      closingTutorial5: 'Lahat ng items na naibenta ngayong araw ay nakalista dito kasama ang dami at halaga.',
      closingTutorial6: 'Ang mga item na nauubos ay ipinapakita dito para malaman mo ang kailangan i-restock bukas.',
      closingTutorial7: 'Ang mga natitirang utang ay nakalista dito — kausapin ang mga kostumer na may utang pa.',
      closingTutorial8: 'I-tap ang "Tapos Na ang Araw" para tapusin. Ang iyong daily data ay mase-save sa history.',
      // Inventory Tutorial
      inventoryTutorial1: 'Ito ang Inventory page — pamahalaan ang lahat ng iyong stock item sa isang lugar.',
      inventoryTutorial2: 'Gamitin ang search bar para mabilis na makahanap ng produkto sa pangalan.',
      inventoryTutorial3: 'I-tap ang "Magdagdag ng Stock" para magdagdag ng bagong produkto o mag-restock.',
      inventoryTutorial4: 'Ang lahat ng iyong inventory ay nakalista na may stock quantity at markup.',
      inventoryTutorial5: 'Ang bawat item ay nagpapakita ng stock level at color-coded status. I-tap ang edit button para baguhin.',
      // Debts Tutorial
      debtsTutorial1: 'Ito ang Debts page — subaybayan ang lahat ng utang ng kostumer at magtala ng bayad.',
      debtsTutorial2: 'Ang kabuuang natitirang utang ng lahat ng kostumer ay ipinapakita dito.',
      debtsTutorial3: 'I-tap ang settings icon para i-customize ang iyong app experience.',
      debtsTutorial4: 'Ang mga utang ng kostumer ay nakalista na may pangalan, huling aktibidad, at balanse.',
      debtsTutorial5: 'I-tap ang "Bayad" sa sinumang kostumer para magtala ng bayad at bawasan ang kanilang balanse.',
      // Settings Tutorial
      settingTutorial1: 'Ito ang Settings page — i-customize ang iyong app experience.',
      settingTutorial2: 'Pumili sa pagitan ng English at Filipino para sa wika ng app.',
      settingTutorial3: 'Ayusin ang laki ng teksto sa Standard, Large, o Extra Large para sa mas magandang readability.',
      settingTutorial4: 'Ilagay ang pangalan ng iyong tindahan para i-personalize ang app header.',
      settingTutorial5: 'Ilagay ang pangalan ng may-ari para sa personalized na pagbati araw-araw.',
      // Add Product Tutorial
      addProductTutorial1: 'Ang page na ito ay para magdagdag ng bagong produkto sa iyong inventory.',
      addProductTutorial2: 'Ilagay ang pangalan ng item, dami, presyo ng stock, at presyo ng benta.',
      addProductTutorial3: 'Itakda ang markup percentage. Ang markup helper ay awtomatikong nagmumungkahi ng tamang selling price.',
      addProductTutorial4: 'Ilagay ang presyo ng benta o tanggapin ang mungkahi mula sa markup helper.',
      addProductTutorial5: 'I-tap "Save" para idagdag ang produkto sa iyong inventory. Maaari mo itong i-edit mamaya mula sa Stock page.',
      tutorialReplayHint: 'Maaari mong i-tap ang ? button kahit kailan para i-replay ang tutorial na ito.',
      // Tutorial Labels
      tutMain: 'Main na Tutorial',
      tutMorning: 'Morning Check na Tutorial',
      tutDay: 'Day Mode na Tutorial',
      tutCheckout: 'Checkout na Tutorial',
      tutClosing: 'Closing na Tutorial',
      tutInventory: 'Stock na Tutorial',
      tutDebts: 'Debts na Tutorial',
      tutSetting: 'Settings na Tutorial',
      tutAddProduct: 'Add Product na Tutorial',
      tutSelector: 'Pumili ng tutorial...',
      tutLaunch: 'Simulan',
      tutSection: 'Mga Tutorial',
      // Nav
      navMorning: 'Umaga',
      navSale: 'Benta',
      navClose: 'Isara',
      // Day mode
      dayEarningsLabel: 'Bentang Cash Ngayon',
      dayItemsSoldLabel: 'Naibenta',
      dayUtangLabel: 'Utang Ngayon',
      dayTransactionsLabel: 'Mga Transaksyon Ngayon',
      // Closing
      closingTitle: 'Isara ang Tindahan \ud83c\udf19',
      closingSubtitle: 'Tapusin na ang araw na ito',
      closingSectionSales: 'Benta',
      closingSectionSold: 'Mga Nabenta',
      closingSectionLowStock: 'Mga Kulang sa Stock',
      closingSectionDebts: 'Utang Hindi Pa Bayad',
      closingSectionWeekly: 'Ngayong Linggo',
      closingWeeklyLabel: 'Kabuuang benta',
      closingTopSellerLabel: 'Pinakamabenta',
      completeDayBtn: 'Tapos Na ang Araw \u2713',
      backToDayBtn: 'Bumalik sa Araw',
      dayCompleteTitle: 'Tapos Na ang Araw!',
      prepareTomorrow: 'Maghanda para Bukas',
      // Sale sheet (V2.68: header now uses checkoutTitle — the legacy
      // "May Bumili" sales-sheet title was removed)
      checkoutTitle: 'Checkout',
      saleQtyLabel: 'Ilan?',
      saleCustomerLabel: 'Sino? (kung utang)',
      saleTotalLabel: 'Total:',
      addToCart: 'Idagdag sa Cart',
      cartTitle: 'Cart',
      cartEmpty: 'Wala pang laman',
      paymentMethod: 'Pagbabayad',
      payCash: 'Cash',
      payCredit: 'Utang',
      completeSale: 'Tapusin ang Benta',
      saleCompleted: 'Naitala ang transaksyon!',
      discardCart: 'Alisin ang cart?',
      discardCartMsg: 'Mawawala ang mga laman ng cart.',
      noCustomerCredit: 'Ilagay ang pangalan ng kostumer para sa utang.',
      itemRemoved: 'Naalis ang item',
      addedToCart: 'Idinagdag sa cart',
      selectProductFirst: 'Pumili muna ng produkto.',
      selectFromList: 'Pumili muna ng produkto mula sa {label}',
      noProductsInList: 'Walang produkto sa {label}',
      lineSubtotal: 'Subtotal',
      eachLabel: 'bawat isa',
      // Settings
      settingsTitle: 'Settings',
      dataMgmt: 'Data Management',
      resetDataBtn: 'I-reset ang Data',
      exportDataBtn: 'I-export ang Data',
      // Stock
      stockTitle: 'Stock',
      searchPlaceholder: 'Maghanap ng produkto...',
      addStockBtn: 'Magdagdag ng Stock',
      // Stock — Demand Forecast (offline ML)
      forecastSortToggle: '\ud83d\udd2e Ayon sa Forecast',
      forecastSortOff: 'Ayon sa forecast',
      forecastInsufficientData: 'Nangongolekta pa\u2026',
      forecastNoDemand: 'Walang benta',
      forecastOutOfStock: 'Ubos na ang stock',
      forecastOutToday: 'Ubos ngayon',
      forecastDaysLeftShort: '{n} araw na lang',
      forecastAvgPerDay: 'Avg {n}/araw',
      // Stock — Demand Forecast detail card + urgent restock (Stage 4)
      forecastDetailTitle: 'Hula ng Demand',
      forecastDetailSubtitle: 'Pattern na natutunan offline mula sa iyong benta',
      forecastMethod: 'Statistical ML',
      forecastHistory: 'Huling 7 araw na benta',
      forecastHowItWorks: 'Avg mula 7 araw \u2192 daysUntilOut = stock \u00f7 avg.',
      forecastConfidenceHigh: 'Mataas',
      forecastConfidenceMedium: 'Katamtaman',
      forecastConfidenceLow: 'Mababa',
      forecastInsufficientHint: 'Kulang ang kasaysayan \u2014 magtala ng 2+ araw',
      forecastAvgLabel: 'Avg',
      forecastEmaLabel: 'EMA',
      forecastTrendLabel: 'Trend',
      forecastSuggestedRestock: 'Mungkahi +{n}',
      forecastFor7Days: 'para sa 7 araw',
      forecastDaysLeftFull: '~{n} araw na lang',
      forecastRestockSoonTitle: 'Restock Na (ML Forecast) \ud83d\udd2e',
      forecastRestockSoonDesc: 'Inaasahang araw bago maubos (7-araw na window)',
      forecastUrgentOutToday: 'Ubos ngayon',
      forecastUrgentOutOfStock: 'Ubos na ang stock',
      forecastSuggestedShort: 'mungkahi +{n}',
      forecastReportTitle: 'Restock Na (ML Forecast) \ud83d\udd2e',
      forecastReportDesc: '14-araw na window ng demand \u2014 bilhin ang mga ito para hindi maubos',
      // Debts
      debtsTitle: 'Utang',
      debtsTotalLabel: 'Kabuuang Utang',
      newDebtBtn: 'Bagong Utang',
      // New Debt tutorial
      tutRestock: 'Restock Day na Tutorial',
      tutNewDebt: 'New Debt na Tutorial',
      newDebtTutorial1: 'Ang page na ito ay para manu-manong magtala ng bagong utang para sa isang kostumer.',
      newDebtTutorial2: 'Ilagay ang pangalan ng kostumer. Kung sila ay bagong kostumer, awtomatiko silang idadagdag.',
      newDebtTutorial3: 'Ilagay ang halaga ng utang. Ito ay idadagdag sa existing balance ng kostumer.',
      newDebtTutorial4: 'I-tap ang "Save Debt" para itala ito. Maaari mong tingnan ang lahat ng utang sa Debts page.',
      // v3.0 parity pages (Product Detail / Debtor Detail / Record Payment / Reports / Help)
      tutProductDetail: 'Product Detail na Tutorial',
      tutDebtorDetail: 'Customer Debt Detail na Tutorial',
      tutRecordPayment: 'Record Payment na Tutorial',
      tutReport: 'Reports na Tutorial',
      tutHelp: 'Help na Tutorial',
      productDetailTutorial1: 'Ang page na ito ay nagpapakita ng lahat tungkol sa produkto: pangalan, unit, stock quantity, presyo ng stock, presyo ng benta, at markup.',
      productDetailTutorial2: 'May color-coded na alert kapag mababa na o ubos na ang stock.',
      productDetailTutorial3: 'Ibawas ang nabentang stock, mag-restock, o i-edit ang detalye ng produkto dito.',
      productDetailTutorial4: 'Gamitin ang Delete para permanenteng alisin ang produkto — may kumpirmasyon muna.',
      customerDebtDetailTutorial1: 'Ang page na ito ay nagpapakita ng utang ng customer: current balance, kabuuang utang, at kabuuang nakolekta.',
      customerDebtDetailTutorial2: 'Ang ledger sa ibaba ay nagpapakita ng bawat idinagdag na utang at bayad kasama ang petsa at running balance.',
      customerDebtDetailTutorial3: 'Ang berdeng row ay dagdag na utang; ang orange na row ay mga bayad na natanggap.',
      customerDebtDetailTutorial4: 'I-tap ang Record Payment para tumanggap ng bayad sa utang na ito.',
      customerDebtDetailTutorial5: 'Kapag zero na ang balance, mamarkahan ang utang bilang fully settled.',
      recordPaymentTutorial1: 'Ilagay kung magkano ang ibabayad ng customer sa kanyang current balance.',
      recordPaymentTutorial2: 'Agad na nag-a-update ang preview ng natitirang balance habang nagta-type ka.',
      recordPaymentTutorial3: 'Magdagdag ng opsyonal na note, tulad ng "cash na binayad" o "partial payment".',
      recordPaymentTutorial4: 'I-tap ang Pay para i-save ang bayad. Awtomatikong mag-a-update ang balance at history.',
      reportTutorial1: 'Ang Reports page ay nagpapakita ng performance ng iyong tindahan sa paglipas ng panahon.',
      reportTutorial2: 'Gamitin ang toggle buttons para lumipat sa Daily, Weekly, o Monthly views.',
      reportTutorial3: 'Ang summary cards ay nagpapakita ng total sales at profit para sa napiling panahon.',
      reportTutorial4: 'Ang mga recent transactions ay lumalabas dito na may detalye ng bawat benta.',
      reportTutorial5: 'Ang Best-Selling Products section ay nagpapakita ng iyong mga top-performing items.',
      reportTutorial6: 'Ang low-stock items ay nakalista dito para malaman mo kung ano ang kailangan i-restock.',
      helpTutorial1: 'Ito ang Help page — ang iyong gabay sa paggamit ng TindaGo nang epektibo.',
      helpTutorial2: 'Ang Tutorial Selector ay nagbibigay-daan sa iyo na pumili ng iba\'t ibang tutorial. Pumili ng tutorial mula sa dropdown at i-tap ang "Launch" para magsimula ng guided tour.',
      helpTutorial3: 'Ang "How to Use" button ay nagbubukas ng detalyadong gabay na may step-by-step na tagubilin para sa pag-record ng benta, pagdagdag ng stock, pagsubaybay ng utang, at iba pa.',
      helpTutorial4: 'Ang Contact section ay nagpapakita kung paano makipag-ugnayan sa support para sa mga tanong o feedback.',
      helpTutorial5: 'Ang About section ay nagsasabi tungkol sa bersyon ng app at layunin nito.',
      helpTutorial6: 'Maaari ka ring mag-access ng page-specific tutorial mula sa kahit anong page sa pamamagitan ng pag-tap sa (?) Help button sa kanang bahagi ng header.',
      tutExpenses: 'Tutorial ng Mga Gastos',
      expensesTutorial1: 'Ang pahina ng Mga Gastos ay nagtatala ng perang ginastos sa tindahan mismo — upa, kuryente, pamasahe, sahod, at iba pang gastusin.',
      expensesTutorial2: 'Ilagay ang halaga at pumili ng kategorya. Ang petsa ay awtomatikong ngayon, at ang tala ay opsyonal.',
      expensesTutorial3: 'Ibawas ang mga gastos sa iyong tubo para makita ang Tunay na Kita sa Closing at Reports pages.',
      pdTitle: 'Detalye ng Produkto',
      criticalStockAlert: '⚠️ Kritikal na Stock Alert',
      criticalAlertDesc: 'Wala nang stock ang item na ito. Mag-restock agad.',
      stockLabel: 'Stock',
      sellPrice: 'Presyo ng Benta',
      profitMargin: 'Markup',
      deductStock: 'Ibawas ang Stock',
      deductBtn: 'Ibawas',
      restockBtn: 'Mag-restock',
      editBtn: 'I-edit',
      deleteBtn: 'Tanggalin',
      confirmDeleteProduct: 'Tanggalin ang produktong ito sa iyong inventory?',
      productNotFound: 'Hindi nakita ang produkto',
      fullySettled: '✅ Bayad na Lahat',
      lastActivity: 'Huling aktibidad:',
      debtHistory: 'Kasaysayan ng Utang',
      descHeader: 'Paglalarawan',
      amountHeader: 'Halaga',
      balanceHeader: 'Balanse',
      initialDebt: 'Unang Utang',
      totalCollected: 'Kabuuang Nakolekta',
      customerNotFound: 'Hindi nakita ang kostumer',
      paymentAmount: 'Halaga ng Bayad',
      paymentExceeds: 'Lumampas ang halaga sa balanse',
      enterAmount: 'Ilagay ang tamang halaga.',
      note: 'Tala',
      paymentNotePlaceholder: 'hal. cash na binayad',
      savePayment: 'I-save ang Bayad',
      reportsTitle: 'Ulat',
      periodDay: 'Araw',
      periodWeek: 'Linggo',
      periodMonth: 'Buwan',
      totalSales: 'Kabuuang Benta',
      reportsProfit: 'Kabuuang Tubo',
      reportsExpenses: 'Mga Gastos',
      reportsNetProfit: 'Tunay na Kita',
      bestSelling: 'Mga Paboritong Produkto',
      recentTransactions: 'Mga Kamakailang Transaksyon',
      lowStockItems: 'Mga Item na Kulang na',
      transactions: 'Transaksyon',
      reportItemsSold: 'Naibenta',
      cashSales: 'Bentang Cash',
      utangSales: 'Bentang Utang',
      utangReport: 'Utang na Hindi pa Bayad',
      outstandingUtang: 'Natitirang Utang',
      activeDebtors: 'May Utang',
      collected: 'Nakolekta',
      debtAging: 'Edad ng hindi pa bayad na utang',
      debtAge30: '0-30 araw',
      debtAge60: '31-60 araw',
      debtAge60Plus: '60+ araw',
      weeklyTrend: 'Lingguhang Benta',
      stockHealth: 'Kalagayan ng Stock',
      stockValue: 'Halaga ng Stock',
      slowMovers: 'Mabagal Bumenta (walang benta sa 30 araw)',
      noSlowMovers: 'Bumebenta nang maayos ang lahat.',
      noSales30: 'Walang benta sa 30 araw',
      leftLabel: 'na lang',
      outOfStockLabel: 'Walang stock',
      exportReport: 'I-export ang CSV',
      exportReportDone: 'Na-export ang report.',
      exportReportError: 'Nabigong i-export.',
      reportSummaryLine: '{period}: {sales} benta, {profit} tubo{vs}{owed}',
      reportVsUp: ' \u25b2 +{pct}% vs nakaraan',
      reportVsDown: ' \u25bc {pct}% vs nakaraan',
      reportOwed: ' \u00b7 {owed} pa ang utang sa iyo',
      noData: 'Wala pang data',
      helpTitle: 'Tulong',
      replayTutorial: 'Balik-aral sa Tutorial',
      howToUse: 'Paano Gamitin',
      contactInfo: 'Makipag-ugnayan',
      aboutApp: 'Tungkol sa App',
      contactText: 'Para sa mga tanong o feedback, mag-email sa support@tindago.com',
      aboutText: 'TindaGo v3.0 — isang store management app para sa mga may-ari ng sari-sari store.',
      howToSales: 'Itala ang iyong araw-araw na cash sales at specific item sales sa Sales page.',
      howToStock: 'Magdagdag ng produkto, mag-restock, at subaybayan ang inventory sa Stocks page.',
      howToDebts: 'Subaybayan ang mga utang ng kostumer at magtala ng bayad sa Debts page.',
      howToReports: 'Tingnan ang performance ng iyong tindahan sa Reports page.',
      howToSettings: 'I-customize ang wika, laki ng text, pangalan ng tindahan at may-ari sa Settings.',
      moreSection: 'Iba Pa',
      stocksLink: 'Stock',
      debtsLink: 'Utang',
      // Add product
      addProductTitle: 'Magdagdag ng Stock',
      editProductTitle: 'Edit Stock',
      productNameLabel: 'Pangalan ng Produkto',
      productQtyLabel: 'Dami',
      costLabel: 'Presyo ng Stock (\u20b1)',
      priceLabel: 'Presyo ng Benta (\u20b1)',
      markupLabel: 'Markup (%)',
      lowStockAlertLabel: 'Alerto Kapag Kulang ang Stock',
      alertThreshold: 'Low Stock Threshold',
      alertThresholdDesc: 'Alert kapag mababa ang stock',
      saveBtn: 'I-save',
      // Product details (units, brands, categories)
      productDetailsSection: 'Detalye ng Produkto',
      productDetailsHint: 'Opsyonal — nakakatulong kilalanin at i-ayos ang mga produkto',
      categoryLabel: 'Kategorya',
      brandLabel: 'Brand',
      unitLabel: 'Unit',
      packageSizeLabel: 'Laki ng Pack',
      brandPlaceholder: 'Hal. Ligo, Bear Brand',
      packageSizePlaceholder: 'Hal. 155g, 1L',
      catAll: 'Lahat',
      catPantryStaples: 'Sangkap sa Pagluluto', catCannedGoods: 'De-lata', catInstantDryGoods: 'Instant at Tuyo',
      catSnacksSweets: 'Meryenda at Matamis', catBeverages: 'Inumin', catDairyRefrigerated: 'Gatas at Malamig',
      catFreshSection: 'Sariwang Produkto', catLiquorWine: 'Alak at Sigarilyo', catPersonalCare: 'Pansariling Kalinga',
      catHouseholdCare: 'Pang-labada at Panglinis', catBabyCare: 'Pangangalaga sa Sanggol', catPaperSanitary: 'Papel at Sanitary',
      catOther: 'Iba pa',
      subRice: 'Bigas', subCookingOil: 'Mantika', subSugar: 'Asukal', subSalt: 'Asin', subVinegar: 'Suka', subBread: 'Tinapay / Pandesal',
      subSardines: 'Sardinas', subCornedBeef: 'Corned Beef', subTuna: 'Tuna', subMeatLoaf: 'Meat Loaf', subSausage: 'Sausage',
      subInstantNoodles: 'Pansit Instant', subCupNoodles: 'Cup Noodles', subPasta: 'Pasta', subSoupMixes: 'Soup Mix',
      subChips: 'Chips', subCrackers: 'Galletas', subCandies: 'Kendi', subChocolates: 'Tsokolate', subCookies: 'Biskwit',
      subCoffeeMix: 'Kape 3-in-1', subPowderedMilk: 'Gatas na Pulbos', subChocolateDrink: 'Chocolate Drink', subJuice: 'Juice',
      subSoftDrinks: 'Softdrinks', subBottledWater: 'Tubig',
      subCheese: 'Keso', subButter: 'Butter', subMargarine: 'Margarina', subChilledMeats: 'Malamig na Karne',
      subFreshMeat: 'Sariwang Karne', subFreshSeafood: 'Sariwang Isda', subFruits: 'Prutas', subVegetables: 'Gulay', subEggs: 'Itlog',
      subBeer: 'Beer', subGin: 'Gin', subBrandy: 'Brandy', subWine: 'Wine', subCigarettes: 'Sigarilyo',
      subShampoo: 'Shampoo', subConditioner: 'Conditioner', subBathSoap: 'Sabon', subToothpaste: 'Toothpaste',
      subToothbrush: 'Toothbrush', subLotion: 'Lotion', subCosmetics: 'Cosmetics',
      subLaundry: 'Detergent', subFabricSoftener: 'Fabric Softener', subDishwashing: 'Panghugas ng Pinggan', subCleaners: 'Panglinis',
      subTrashBags: 'Trash Bag', subMosquitoControl: 'Katol / Panlaban sa Lamok',
      subDiapers: 'Diapers', subBabyWipes: 'Baby Wipes', subBabyToiletries: 'Baby Toiletries',
      subTissue: 'Tissue', subPaperTowels: 'Paper Towel', subSanitaryPads: 'Sanitary Pads',
      subcategoriesLabel: 'Mga Subcategory',
      checkoutOverflow: '{n} pa — paliitin ang hanap o kategorya',
      catMore: 'Dagdag ▾', catLess: 'Bawas ▴',
      unitPiece: 'piraso', unitSachet: 'sachet', unitPack: 'pack', unitBox: 'kahon',
      unitBottle: 'bote', unitCan: 'lata', unitKg: 'kg', unitG: 'g',
      unitL: 'L', unitMl: 'mL', unitBundle: 'bundle', unitDozen: 'dosena',
      unitSack: 'sako', unitLoaf: 'loaf', unitTube: 'tube', unitBar: 'bar', unitSticks: 'sticks'
    }
  };

  function t(key, replacements) {
    var lang = state.settings.language || 'fil';
    var str = (strings[lang] && strings[lang][key]) || (strings.en && strings.en[key]) || key;
    if (replacements) {
      for (var k in replacements) {
        if (replacements.hasOwnProperty(k)) {
          str = str.replace('{' + k + '}', replacements[k]);
        }
      }
    }
    return str;
  }

  // ============================================
  // UTILITY
  // ============================================
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // Dev-only temporary date override (YYYY-MM-DD). Stored in sessionStorage so
  // it survives page-to-page navigation within the tab but is cleared when the
  // tab closes — it is NEVER written to localStorage/state and never alters
  // real data permanently. Set via Developer Panel (Shift+N) → Day State.
  var devDateOverride = null;
  var devStateSnapshot = null; // pre-override business-day snapshot (restored on clear)
  // Dev-only temporary HOUR override (0-23) for testing the time-based greeting.
  // Same contract as devDateOverride: sessionStorage only, cleared on tab close,
  // never written to state/localStorage. Set via Developer Panel (Shift+N).
  var devTimeOverride = null;

  function todayStr() {
    if (devDateOverride) return devDateOverride; // dev override wins (temporary)
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // ─── Dev Override Snapshot (restores business state when override is cleared) ───
  // Captures the exact business-day state BEFORE a temporary date override is
  // applied, so clearing the override restores the previous open day, its sales,
  // and closing inputs — nothing is lost. Stored in sessionStorage so it survives
  // page navigation (web reloads) but never persists beyond the tab session.
  function captureDevSnapshot() {
    devStateSnapshot = {
      dayOpen: state.dayOpen,
      dayDate: state.dayDate,
      dayArchived: state.dayArchived,
      todayExpenses: state.todayExpenses,
      todayEarnings: state.todayEarnings,
      expenseLog: JSON.parse(JSON.stringify(state.expenseLog || [])),
      sales: JSON.parse(JSON.stringify(state.sales)),
      history: JSON.parse(JSON.stringify(state.history))
    };
    try { sessionStorage.setItem('sss_v3_devSnapshot', JSON.stringify(devStateSnapshot)); } catch(e) {}
  }

  function restoreDevSnapshot() {
    if (!devStateSnapshot) return;
    var snap = devStateSnapshot;
    // Restore the EXACT pre-test business state: replace the active sales list
    // with the snapshot's copy so any sales recorded during the test (dated to
    // the override date) are purged — no test data leaks into real records.
    state.sales = JSON.parse(JSON.stringify(snap.sales || []));
    state.dayOpen = snap.dayOpen;
    state.dayDate = snap.dayDate;
    state.dayArchived = snap.dayArchived;
    state.todayExpenses = snap.todayExpenses;
    state.todayEarnings = snap.todayEarnings;
    state.expenseLog = JSON.parse(JSON.stringify(snap.expenseLog || []));
    // Restore the exact pre-test history too, so any history entries created
    // during the test (EOD/archive writes dated to the override date) are also
    // purged. Newer snapshots carry the history list; older ones (pre-v2.34)
    // fall back to removing just the archive-only sales copy for the snap day.
    if (snap.history) {
      state.history = JSON.parse(JSON.stringify(snap.history));
    } else if (snap.dayOpen && snap.dayDate) {
      state.history.forEach(function(h) {
        if (h.date === snap.dayDate && h.archivedSales) delete h.archivedSales;
      });
    }
    devStateSnapshot = null;
    try { sessionStorage.removeItem('sss_v3_devSnapshot'); } catch(e) {}
    saveState();
  }

  function formatDate(d) {
    if (!d) d = new Date();
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(amount) {
    return '\u20b1' + Number(amount || 0).toFixed(2);
  }

  function getStockStatus(product) {
    if (!product || product.quantity <= 0) return 'out';
    // Per-product threshold wins; fall back to the global Settings threshold
    // (products created before per-product thresholds have no value here).
    var threshold = (typeof product.lowStockThreshold === 'number' && product.lowStockThreshold >= 0)
      ? product.lowStockThreshold
      : getGlobalLowStockThreshold();
    if (product.quantity <= threshold) return 'low';
    return 'plenty';
  }

  function getGlobalLowStockThreshold() {
    var t = state.settings && state.settings.lowStockThreshold;
    return (typeof t === 'number' && t >= 0) ? t : 5;
  }

  // ============================================
  // PRODUCT DETAILS — units, brands, categories
  // ============================================
  // Category keys (keep in sync with the i18n cat* keys).
  // 12 retail categories (Food on top, Non-Food below), each with the
  // subcategory drill-down used by checkout / inventory / add-product.
  var PRODUCT_CATEGORIES = ['pantry_staples','canned_goods','instant_dry_goods','snacks_sweets','beverages','dairy_refrigerated','fresh_section','liquor_wine','personal_care','household_care','baby_care','paper_sanitary'];
  var PRODUCT_SUBCATEGORIES = {
    pantry_staples:['rice','cooking_oil','sugar','salt','vinegar','bread'],
    canned_goods:['sardines','corned_beef','tuna','meat_loaf','sausage'],
    instant_dry_goods:['instant_noodles','cup_noodles','pasta','soup_mixes'],
    snacks_sweets:['chips','crackers','candies','chocolates','cookies'],
    beverages:['coffee_mix','powdered_milk','chocolate_drink','juice','soft_drinks','bottled_water'],
    dairy_refrigerated:['cheese','butter','margarine','chilled_meats'],
    fresh_section:['fresh_meat','fresh_seafood','fruits','vegetables','eggs'],
    liquor_wine:['beer','gin','brandy','wine','cigarettes'],
    personal_care:['shampoo','conditioner','bath_soap','toothpaste','toothbrush','lotion','cosmetics'],
    household_care:['laundry','fabric_softener','dishwashing','cleaners','trash_bags','mosquito_control'],
    baby_care:['diapers','baby_wipes','baby_toiletries'],
    paper_sanitary:['tissue','paper_towels','sanitary_pads']
  };
  // Unit keys (keep in sync with the i18n unit* keys).
  var PRODUCT_UNITS = ['piece', 'sachet', 'pack', 'box', 'bottle', 'can', 'kg', 'g', 'L', 'mL', 'bundle', 'dozen', 'sack', 'loaf', 'tube', 'bar', 'sticks'];

  function productCategoryLabel(key) {
    if (!key) return '';
    var map = {
      pantry_staples:'catPantryStaples',canned_goods:'catCannedGoods',instant_dry_goods:'catInstantDryGoods',
      snacks_sweets:'catSnacksSweets',beverages:'catBeverages',dairy_refrigerated:'catDairyRefrigerated',
      fresh_section:'catFreshSection',liquor_wine:'catLiquorWine',personal_care:'catPersonalCare',
      household_care:'catHouseholdCare',baby_care:'catBabyCare',paper_sanitary:'catPaperSanitary'
    };
    return t(map[key] || 'catOther');
  }

  function productUnitLabel(key) {
    if (!key) return '';
    var map = {
      piece: 'unitPiece', sachet: 'unitSachet', pack: 'unitPack', box: 'unitBox',
      bottle: 'unitBottle', can: 'unitCan', kg: 'unitKg', g: 'unitG',
      L: 'unitL', mL: 'unitMl', bundle: 'unitBundle', dozen: 'unitDozen',
      sack: 'unitSack', loaf: 'unitLoaf', tube: 'unitTube', bar: 'unitBar', sticks: 'unitSticks'
    };
    return t(map[key] || key);
  }
  function productSubcategoryLabel(key) {
    if (!key) return '';
    var map = {
      rice:'subRice',cooking_oil:'subCookingOil',sugar:'subSugar',salt:'subSalt',vinegar:'subVinegar',bread:'subBread',
      sardines:'subSardines',corned_beef:'subCornedBeef',tuna:'subTuna',meat_loaf:'subMeatLoaf',sausage:'subSausage',
      instant_noodles:'subInstantNoodles',cup_noodles:'subCupNoodles',pasta:'subPasta',soup_mixes:'subSoupMixes',
      chips:'subChips',crackers:'subCrackers',candies:'subCandies',chocolates:'subChocolates',cookies:'subCookies',
      coffee_mix:'subCoffeeMix',powdered_milk:'subPowderedMilk',chocolate_drink:'subChocolateDrink',juice:'subJuice',soft_drinks:'subSoftDrinks',bottled_water:'subBottledWater',
      cheese:'subCheese',butter:'subButter',margarine:'subMargarine',chilled_meats:'subChilledMeats',
      fresh_meat:'subFreshMeat',fresh_seafood:'subFreshSeafood',fruits:'subFruits',vegetables:'subVegetables',eggs:'subEggs',
      beer:'subBeer',gin:'subGin',brandy:'subBrandy',wine:'subWine',cigarettes:'subCigarettes',
      shampoo:'subShampoo',conditioner:'subConditioner',bath_soap:'subBathSoap',toothpaste:'subToothpaste',toothbrush:'subToothbrush',lotion:'subLotion',cosmetics:'subCosmetics',
      laundry:'subLaundry',fabric_softener:'subFabricSoftener',dishwashing:'subDishwashing',cleaners:'subCleaners',trash_bags:'subTrashBags',mosquito_control:'subMosquitoControl',
      diapers:'subDiapers',baby_wipes:'subBabyWipes',baby_toiletries:'subBabyToiletries',
      tissue:'subTissue',paper_towels:'subPaperTowels',sanitary_pads:'subSanitaryPads'
    };
    var i18n = map[key];
    if (!i18n) {
      // Unknown sub — mirror Strings.kt:1996 title-case fallback
      try { return key.replace(/_/g,' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); }); } catch(e){ return key; }
    }
    var out = t(i18n);
    if (out === i18n) {
      // Table miss (should not happen after EN/FIL patch) — fail-safe to readable label
      try { return key.replace(/_/g,' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); }); } catch(e){ return key; }
    }
    return out;
  }

  // One-line product descriptor: "Brand · Size" (or unit) — used in the sale
  // sheet and inventory list so variants are distinguishable.
  // v2.59 cleanup: the sub-line only renders when a BRAND is present. When the
  // brand is intentionally left blank, nothing is shown — the package size (or
  // unit) must never leak into the brand slot as a fallback.
  function productSubline(p) {
    if (!p || !p.brand) return '';
    var parts = [esc(p.brand)];
    if (p.packageSize) parts.push(esc(p.packageSize));
    else if (p.unit && p.unit !== 'piece') parts.push(esc(productUnitLabel(p.unit)));
    return parts.join(' \u00b7 ');
  }

  // Brand / package-size history for the datalist suggestions on add/edit.
  function getUsedBrands() {
    var seen = {};
    state.products.forEach(function(p) { if (p.brand) seen[p.brand] = true; });
    return Object.keys(seen).sort();
  }
  function getUsedPackageSizes() {
    var seen = {};
    state.products.forEach(function(p) { if (p.packageSize) seen[p.packageSize] = true; });
    return Object.keys(seen).sort();
  }

  function getTodaySales() {
    return state.sales.filter(function(s) {
      return s.date === todayStr();
    });
  }

  function getTodayEarnings() {
    return getTodaySales().reduce(function(sum, s) {
      return sum + (s.customerName ? 0 : s.amount);
    }, 0);
  }

  function getTodayItemsSold() {
    return getTodaySales().reduce(function(sum, s) {
      return sum + (s.quantity || 1);
    }, 0);
  }

  function getTodayUtang() {
    return getTodaySales().filter(function(s) {
      return s.customerName;
    }).reduce(function(sum, s) {
      return sum + s.amount;
    }, 0);
  }

  function getLowStockItems() {
    return state.products.filter(function(p) {
      return getStockStatus(p) === 'low' || getStockStatus(p) === 'out';
    });
  }

  function getTotalDebt() {
    return state.debts.reduce(function(sum, d) {
      return sum + (d.remainingBalance || 0);
    }, 0);
  }

  function getYesterdayEarnings() {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yStr = yesterday.getFullYear() + '-' +
      String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
      String(yesterday.getDate()).padStart(2, '0');
    var entry = state.history.find(function(h) { return h.date === yStr; });
    return entry ? entry.earnings : null;
  }

  function getTodayProfit() {
    return getTodaySales().reduce(function(sum, s) {
      return sum + (s.profit || 0);
    }, 0);
  }

  // ============================================
  // EXPENSE LOG — helpers (V2.71)
  // ============================================
  // Fixed category list (Filipino-first, per the ExpenseTracking analysis).
  var EXPENSE_CATEGORIES = ['utilities', 'rent', 'transport', 'permits', 'labor', 'supplies', 'maintenance', 'other'];

  function expenseCategoryLabel(key) {
    if (!key) return '';
    var map = {
      utilities: 'expUtilities', rent: 'expRent', transport: 'expTransport',
      permits: 'expPermits', labor: 'expLabor', supplies: 'expSupplies',
      maintenance: 'expMaintenance', other: 'expOther'
    };
    return t(map[key] || 'expOther');
  }

  function getExpenses() {
    return state.expenseLog || [];
  }

  // Sum of expenses recorded for one exact business date.
  function getExpensesTotalFor(dateStr) {
    return getExpenses().filter(function(e) { return e.date === dateStr; })
      .reduce(function(a, e) { return a + (e.amount || 0); }, 0);
  }

  // Sum of expenses recorded on or after a start date (reports period).
  function getPeriodExpensesTotal(startDate) {
    return getExpenses().filter(function(e) { return e.date >= startDate; })
      .reduce(function(a, e) { return a + (e.amount || 0); }, 0);
  }

  function getTodayExpensesTotal() {
    return getExpensesTotalFor(todayStr());
  }

  // Net Profit = gross profit (profit from items sold) - store expenses today.
  function getNetProfitToday() {
    return getTodayProfit() - getTodayExpensesTotal();
  }

  function getDaysSinceLastRestock() {
    try {
      var d = localStorage.getItem('sss_v3_lastRestockDate');
      if (!d) return -1;
      var then = new Date(JSON.parse(d));
      if (isNaN(then.getTime())) { localStorage.removeItem('sss_v3_lastRestockDate'); return -1; }
      var now = new Date();
      var diff = Math.floor((now - then) / (1000 * 60 * 60 * 24));
      if (diff < 0 || diff > 365) { localStorage.removeItem('sss_v3_lastRestockDate'); return -1; }
      return diff;
    } catch(e) { localStorage.removeItem('sss_v3_lastRestockDate'); return -1; }
  }

  // ─── Overdue store detection (left open across business days) ───
  // True when the store is open but the business day it started on (dayDate)
  // is strictly BEFORE today. Uses `<` (not `!==`) so a device clock moved
  // backward never archives a "future" day.
  function isStaleOpenDay() {
    return state.dayOpen && state.dayDate && state.dayDate < todayStr();
  }

  // Whole calendar days the current open day has been open (0 = opened today).
  function getDaysOpen() {
    if (!state.dayDate) return 0;
    try {
      var then = new Date(state.dayDate + 'T00:00:00');
      var now = devDateOverride ? new Date(devDateOverride + 'T00:00:00') : new Date();
      var days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
      return isNaN(days) ? 0 : Math.max(0, days);
    } catch(e) { return 0; }
  }

  function calcMarkupSuggestion(cost, markup) {
    if (!cost || cost <= 0) return null;
    markup = markup || 20;
    return cost * (1 + markup / 100);
  }

  /** Configured default markup % from Settings (falls back to 20). */
  function getDefaultMarkup() {
    var m = state.settings && state.settings.defaultMarkup;
    return (typeof m === 'number' && m >= 0) ? m : 20;
  }

  // ── Credit limit engine (v2.56) ──────────────────────────────────────
  /** Default credit limit ₱ from Settings (0 = no limit). Falls back to 500. */
  function getDefaultCreditLimit() {
    var c = state.settings && state.settings.defaultCreditLimit;
    return (typeof c === 'number' && c >= 0) ? c : 500;
  }

  /** Find the debt record for a customer name (case-insensitive), preferring the active one. */
  function getDebtForName(name) {
    if (!name) return null;
    var lower = String(name).toLowerCase();
    var settled = null;
    for (var i = 0; i < state.debts.length; i++) {
      var d = state.debts[i];
      if (d.customerName && String(d.customerName).toLowerCase() === lower) {
        if (d.remainingBalance > 0) return d;
        if (!settled) settled = d;
      }
    }
    return settled;
  }

  /** Effective limit for a name: per-customer override, else global default. 0 = unlimited. */
  function getEffectiveCreditLimit(name) {
    var debt = getDebtForName(name);
    if (debt && typeof debt.creditLimit === 'number' && debt.creditLimit >= 0) return debt.creditLimit;
    return getDefaultCreditLimit();
  }

  /**
   * Credit status for a customer given a prospective new debt amount.
   * limit 0 = no limit. nearLimit at ≥80% of limit. overLimit when the
   * projected total exceeds the limit. All math is automatic (v2.56).
   */
  function getCreditStatus(name, prospective) {
    var limit = getEffectiveCreditLimit(name);
    var balance = 0;
    var lower = String(name || '').toLowerCase();
    state.debts.forEach(function(d) {
      if (d.customerName && String(d.customerName).toLowerCase() === lower && d.remainingBalance > 0) {
        balance += d.remainingBalance;
      }
    });
    var total = balance + (prospective || 0);
    // At-or-above the limit blocks a credit sale (v2.57). Half-cent epsilon so
    // float drift (e.g. 450.10 + 49.90 = 499.99999999999994) can't slip an
    // at-limit sale through the gate.
    var atLimit = limit > 0 && Math.abs(total - limit) < 0.005;
    var overLimit = limit > 0 && total >= limit - 0.005;
    var nearLimit = limit > 0 && !overLimit && total >= limit * 0.8;
    return { limit: limit, balance: balance, total: total, overLimit: overLimit, atLimit: atLimit, nearLimit: nearLimit };
  }

  function getWeeklySales() {
    var total = 0;
    var productCounts = {};
    var oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    var cutoff = oneWeekAgo.toISOString().substring(0, 10);
    state.sales.forEach(function(s) {
      if (s.date >= cutoff) {
        total += s.amount;
        var name = s.productName || 'Unknown';
        productCounts[name] = (productCounts[name] || 0) + (s.quantity || 1);
      }
    });
    var topSeller = '';
    var topCount = 0;
    for (var name in productCounts) {
      if (productCounts[name] > topCount) {
        topCount = productCounts[name];
        topSeller = name;
      }
    }
    return { total: total, topSeller: topSeller };
  }

  // ============================================
  // LOCALIZATION - Apply translations to all data-i18n elements
  // ============================================
  function applyTranslations() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });
    // Translate elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = t(key);
      }
    });
    // Also update dynamically rendered text
    updateHeader();
    try{ if(window.__checkoutRefreshLabel) window.__checkoutRefreshLabel(); }catch(e){}
    try{ if(window.__checkoutRerender) window.__checkoutRerender(); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('tindago:languageChanged')); }catch(e){}
  }

  // ============================================
  // TEXT SIZE
  // ============================================
  function applyTextSize() {
    var app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('text-size-large', 'text-size-extra-large');
    if (state.settings.textSize === 'large') app.classList.add('text-size-large');
    else if (state.settings.textSize === 'extra-large') app.classList.add('text-size-extra-large');

    // Update text size buttons in settings if present
    document.querySelectorAll('.text-size-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-size') === state.settings.textSize);
    });
  }

  function setTextSize(size) {
    state.settings.textSize = size;
    saveState();
    applyTextSize();
    showToast(t('saved'));
  }

  // ============================================
  // TUTORIAL SYSTEM
  // ============================================
  var tutorials = {
    main: {
      label: 'tutMain',
      steps: [
        { textKey: 'mainTutorial1', highlight: null, page: 'morning' },
        { textKey: 'mainTutorial2', highlight: '#morningStockTitle', page: 'morning' },
        { textKey: 'mainTutorial3', highlight: '#morningDebtTitle', page: 'morning' },
        { textKey: 'mainTutorial4', highlight: '#btnStartDay', page: 'morning' },
        { textKey: 'mainTutorial5', highlight: null, page: 'day' },
        { textKey: 'mainTutorial6', highlight: '#daySummary', page: 'day' },
        { textKey: 'mainTutorial7', highlight: '#navSale', page: 'day' },
        { textKey: 'mainTutorial8', highlight: null, page: 'closing' },
        { textKey: 'mainTutorial9', highlight: '#closingActualSales', page: 'closing' },
        { textKey: 'mainTutorial10', highlight: '#btnCompleteDay', page: 'closing' },
        { textKey: 'mainTutorial11', highlight: '#manageStockSearch', page: 'inventory' },
        { textKey: 'mainTutorial12', highlight: 'a[href="add_product.html"].btn-primary', page: 'inventory' },
        { textKey: 'mainTutorial13', highlight: '#manageTotalDebt', page: 'debts' },
        { textKey: 'mainTutorial14', highlight: '#settingsLanguage', page: 'setting' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn', page: 'setting' }
      ]
    },
    morning: {
      label: 'tutMorning',
      page: 'morning',
      steps: [
        { textKey: 'morningTutorial1', highlight: null },
        { textKey: 'morningTutorial2', highlight: '#morningStockTitle' },
        { textKey: 'morningTutorial3', highlight: '#morningDebtTitle' },
        { textKey: 'morningTutorial4', highlight: '#morningYesterdayTitle' },
        { textKey: 'morningTutorial5', highlight: '#btnStartDay' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    day: {
      label: 'tutDay',
      page: 'day',
      steps: [
        { textKey: 'dayTutorial1', highlight: null },
        { textKey: 'dayTutorial2', highlight: '#dayEarnings' },
        { textKey: 'dayTutorial3', highlight: '#dayItemsSold' },
        { textKey: 'dayTutorial4', highlight: '#dayUtang' },
        { textKey: 'dayTutorial5', highlight: '#dayTransactionList' },
        { textKey: 'dayTutorial6', highlight: '#btnCloseDay' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    checkout: {
      label: 'tutCheckout',
      page: 'checkout',
      steps: [
        { textKey: 'checkoutTutorial1', highlight: '#checkoutSearchControl' },
        { textKey: 'checkoutTutorial2', highlight: '#btnAddToCart' },
        { textKey: 'checkoutTutorial3', highlight: '#saleCartSection' },
        { textKey: 'checkoutTutorial4', highlight: '#salePayCredit' },
        { textKey: 'checkoutTutorial5', highlight: '#btnCompleteSale' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    closing: {
      label: 'tutClosing',
      page: 'closing',
      steps: [
        { textKey: 'closingTutorial1', highlight: null },
        { textKey: 'closingTutorial2', highlight: '#closingActualSales' },
        { textKey: 'closingTutorial3', highlight: '#closingActualSales' },
        { textKey: 'closingTutorial4', highlight: '#closingTotalToday' },
        { textKey: 'closingTutorial5', highlight: '#closingSoldItems' },
        { textKey: 'closingTutorial6', highlight: '#closingLowStock' },
        { textKey: 'closingTutorial7', highlight: '#closingDebts' },
        { textKey: 'closingTutorial8', highlight: '#btnCompleteDay' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    inventory: {
      label: 'tutInventory',
      page: 'inventory',
      steps: [
        { textKey: 'inventoryTutorial1', highlight: null },
        { textKey: 'inventoryTutorial2', highlight: '#manageStockSearch' },
        { textKey: 'inventoryTutorial3', highlight: 'a[href="add_product.html"].btn-primary' },
        { textKey: 'inventoryTutorial4', highlight: '#manageInventoryList' },
        { textKey: 'inventoryTutorial5', highlight: '.inv-manage-item:first-child' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    debts: {
      label: 'tutDebts',
      page: 'debts',
      steps: [
        { textKey: 'debtsTutorial1', highlight: null },
        { textKey: 'debtsTutorial2', highlight: '#manageTotalDebt' },
        { textKey: 'debtsTutorial3', highlight: 'a[href="setting.html"]' },
        { textKey: 'debtsTutorial4', highlight: '#manageDebtsList' },
        { textKey: 'debtsTutorial5', highlight: '.debt-manage-item:first-child .debt-manage-pay-btn' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    setting: {
      label: 'tutSetting',
      page: 'setting',
      steps: [
        { textKey: 'settingTutorial1', highlight: null },
        { textKey: 'settingTutorial2', highlight: '#settingsLanguage' },
        { textKey: 'settingTutorial3', highlight: '.text-size-options' },
        { textKey: 'settingTutorial4', highlight: '#settingsStoreName' },
        { textKey: 'settingTutorial5', highlight: '#settingsOwnerName' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    add_product: {
      label: 'tutAddProduct',
      page: 'add_product',
      steps: [
        { textKey: 'addProductTutorial1', highlight: null },
        { textKey: 'addProductTutorial2', highlight: '#productName' },
        { textKey: 'addProductTutorial3', highlight: '#productCost' },
        { textKey: 'addProductTutorial4', highlight: '#productPrice' },
        { textKey: 'addProductTutorial5', highlight: '.btn-primary.btn-full' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    restock: {
      label: 'tutRestock',
      page: 'restock',
      steps: [
        { textKey: 'restockTutorial1', highlight: null },
        { textKey: 'restockTutorial2', highlight: '#restockStep1' },
        { textKey: 'restockTutorial3', highlight: '#restockSearch' },
        { textKey: 'restockTutorial4', highlight: '#restockProductList' },
        { textKey: 'restockTutorial5', highlight: '#restockContinueBtn' },
        { textKey: 'restockTutorial6', highlight: '#restockPurchaseProduct' },
        { textKey: 'restockTutorial7', highlight: '#restockPurchaseList' },
        { textKey: 'restockTutorial8', highlight: '#restockDoneBtn' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    new_debt: {
      label: 'tutNewDebt',
      page: 'new_debt',
      steps: [
        { textKey: 'newDebtTutorial1', highlight: null },
        { textKey: 'newDebtTutorial2', highlight: '#newDebtCustomer' },
        { textKey: 'newDebtTutorial3', highlight: '#newDebtAmount' },
        { textKey: 'newDebtTutorial4', highlight: '.btn-primary.btn-full' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    product_detail: {
      label: 'tutProductDetail',
      page: 'product_detail',
      steps: [
        { textKey: 'productDetailTutorial1', highlight: null },
        { textKey: 'productDetailTutorial2', highlight: '#pdStockAlert' },
        { textKey: 'productDetailTutorial3', highlight: '#pdActions' },
        { textKey: 'productDetailTutorial4', highlight: '#pdDeleteBtn' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    debtor_detail: {
      label: 'tutDebtorDetail',
      page: 'debtor_detail',
      steps: [
        { textKey: 'customerDebtDetailTutorial1', highlight: null },
        { textKey: 'customerDebtDetailTutorial2', highlight: '#cddBalanceCard' },
        { textKey: 'customerDebtDetailTutorial3', highlight: '#cddLedger' },
        { textKey: 'customerDebtDetailTutorial4', highlight: '#cddRecordPaymentBtn' },
        { textKey: 'customerDebtDetailTutorial5', highlight: '#headerTutorialBtn' }
      ]
    },
    record_payment: {
      label: 'tutRecordPayment',
      page: 'record_payment',
      steps: [
        { textKey: 'recordPaymentTutorial1', highlight: '#rpAmountField' },
        { textKey: 'recordPaymentTutorial2', highlight: '#rpRemainingPreview' },
        { textKey: 'recordPaymentTutorial3', highlight: '#rpNoteField' },
        { textKey: 'recordPaymentTutorial4', highlight: '#rpPayBtn' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    expenses: {
      label: 'tutExpenses',
      page: 'expenses',
      steps: [
        { textKey: 'expensesTutorial1', highlight: null },
        { textKey: 'expensesTutorial2', highlight: '#expenseCategory' },
        { textKey: 'expensesTutorial3', highlight: '#expenseList' },
        { textKey: 'tutorialReplayHint', highlight: '#headerTutorialBtn' }
      ]
    },
    report: {
      label: 'tutReport',
      page: 'reports',
      steps: [
        { textKey: 'reportTutorial1', highlight: null },
        { textKey: 'reportTutorial2', highlight: '#reportPeriodToggle' },
        { textKey: 'reportTutorial3', highlight: '#reportSummaryCards' },
        { textKey: 'reportTutorial4', highlight: '#reportRecentTx' },
        { textKey: 'reportTutorial5', highlight: '#reportBestSellers' },
        { textKey: 'reportTutorial6', highlight: '#reportLowStock' }
      ]
    },
    help: {
      label: 'tutHelp',
      page: 'help',
      steps: [
        { textKey: 'helpTutorial1', highlight: null },
        { textKey: 'helpTutorial2', highlight: '#helpTutSelector' },
        { textKey: 'helpTutorial3', highlight: '#helpHowTo' },
        { textKey: 'helpTutorial4', highlight: '#helpContact' },
        { textKey: 'helpTutorial5', highlight: '#helpAbout' },
        { textKey: 'helpTutorial6', highlight: null }
      ]
    }
  };

  var _tutorialState = { active: false, id: null, step: 0, isReplay: false };
  var _tutorialRAF = null;

  // ─── Markup auto-population flags ───
  var _userEditedPrice = false;
  var _suppressPriceListener = false;

  // ─── Tutorial State Persistence ───
  function saveTutorialState(tutorialId, step, isReplay) {
    try {
      localStorage.setItem('sss_v3_tutorial', JSON.stringify({
        id: tutorialId || 'main', step: step, isReplay: isReplay
      }));
    } catch(e) {}
  }

  function loadTutorialState() {
    try {
      var data = localStorage.getItem('sss_v3_tutorial');
      return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
  }

  function clearTutorialState() {
    try { localStorage.removeItem('sss_v3_tutorial'); } catch(e) {}
  }

  // ─── Highlight Tracking ───
  function stopHighlightTracking() {
    if (_tutorialRAF) {
      cancelAnimationFrame(_tutorialRAF);
      _tutorialRAF = null;
    }
  }

  function startHighlightTracking() {
    stopHighlightTracking();

    function track() {
      if (!dom.tutorialOverlay || !dom.tutorialOverlay.classList.contains('active')) {
        stopHighlightTracking();
        return;
      }
      if (!dom.tutorialHighlight || dom.tutorialHighlight.style.display === 'none') {
        _tutorialRAF = requestAnimationFrame(track);
        return;
      }

      var tutorialId = _tutorialState.id || 'main';
      var steps = (tutorials[tutorialId] && tutorials[tutorialId].steps) || [];
      var step = steps[_tutorialState.step];
      if (!step || !step.highlight) {
        _tutorialRAF = requestAnimationFrame(track);
        return;
      }

      var target = document.querySelector(step.highlight);
      if (target) {
        var rect = target.getBoundingClientRect();
        dom.tutorialHighlight.style.left = (rect.left - 4) + 'px';
        dom.tutorialHighlight.style.top = (rect.top - 4) + 'px';
        dom.tutorialHighlight.style.width = (rect.width + 8) + 'px';
        dom.tutorialHighlight.style.height = (rect.height + 8) + 'px';
      }

      _tutorialRAF = requestAnimationFrame(track);
    }

    _tutorialRAF = requestAnimationFrame(track);
  }

  // ─── Tutorial Box Alignment ───
  function getTutorialBoxAlignment(highlightSelector) {
    if (!highlightSelector) return 'center';
    var target = document.querySelector(highlightSelector);
    if (!target) return 'center';
    var rect = target.getBoundingClientRect();
    var viewportH = window.innerHeight;
    var targetCenter = rect.top + rect.height / 2;
    if (targetCenter < viewportH * 0.4) return 'flex-end';
    return 'flex-start';
  }

  // ─── Start Tutorial ───
  function startTutorial(tutorialId, isReplay) {
    if (!dom.tutorialOverlay) return;
    if (!tutorials[tutorialId]) return;
    _tutorialState.active = true;
    _tutorialState.id = tutorialId;
    _tutorialState.isReplay = isReplay || false;
    _tutorialState.step = 0;

    clearTutorialState();
    dom.tutorialOverlay.style.display = 'flex';
    dom.tutorialOverlay.classList.add('active');
    if (dom.tutorialSkip) dom.tutorialSkip.style.display = isReplay ? 'block' : 'none';

    renderTutorialStep();
  }

  // ─── Resume Tutorial (after page navigation) ───
  function resumeTutorial(savedState) {
    if (!dom.tutorialOverlay || !savedState) return false;
    _tutorialState.active = true;
    _tutorialState.id = savedState.id || 'main';
    _tutorialState.isReplay = savedState.isReplay || false;
    _tutorialState.step = savedState.step || 0;

    dom.tutorialOverlay.style.display = 'flex';
    dom.tutorialOverlay.classList.add('active');
    if (dom.tutorialSkip) dom.tutorialSkip.style.display = _tutorialState.isReplay ? 'block' : 'none';

    renderTutorialStep();
    return true;
  }

  // ─── Render Tutorial Step ───
  function renderTutorialStep() {
    if (!dom.tutorialOverlay) return;
    var tutorialId = _tutorialState.id || 'main';
    var steps = (tutorials[tutorialId] && tutorials[tutorialId].steps) || [];
    var stepIndex = _tutorialState.step || 0;
    var step = steps[stepIndex];
    if (!step) { endTutorial(); return; }

    if (dom.tutorialText) dom.tutorialText.textContent = t(step.textKey);
    if (dom.tutorialCurrent) dom.tutorialCurrent.textContent = stepIndex + 1;
    if (dom.tutorialTotal) dom.tutorialTotal.textContent = steps.length;
    // Previous button is hidden on the first step (mobile parity)
    if (dom.tutorialPrev) dom.tutorialPrev.style.display = stepIndex > 0 ? 'block' : 'none';

    if (dom.tutorialHighlight) {
      if (step.highlight) {
        var target = document.querySelector(step.highlight);
        if (target) {
          // Scroll the content so the highlighted element is visible
          var scrollContainer = document.getElementById('appContent');
          if (scrollContainer) {
            var containerRect = scrollContainer.getBoundingClientRect();
            var targetRect = target.getBoundingClientRect();
            var buffer = 60; // leave room for the tutorial box
            if (targetRect.bottom > containerRect.bottom - buffer) {
              scrollContainer.scrollTop += targetRect.bottom - containerRect.bottom + buffer;
            } else if (targetRect.top < containerRect.top + 30) {
              scrollContainer.scrollTop -= containerRect.top - targetRect.top + 30;
            }
          }
          var rect = target.getBoundingClientRect();
          dom.tutorialHighlight.style.position = 'fixed';
          dom.tutorialHighlight.style.zIndex = '151';
          dom.tutorialHighlight.style.display = 'block';
          dom.tutorialHighlight.style.left = (rect.left - 4) + 'px';
          dom.tutorialHighlight.style.top = (rect.top - 4) + 'px';
          dom.tutorialHighlight.style.width = (rect.width + 8) + 'px';
          dom.tutorialHighlight.style.height = (rect.height + 8) + 'px';
          startHighlightTracking();
        } else {
          dom.tutorialHighlight.style.display = 'none';
          stopHighlightTracking();
        }
      } else {
        dom.tutorialHighlight.style.display = 'none';
        stopHighlightTracking();
      }
    }

    if (dom.tutorialBox) {
      dom.tutorialBox.style.alignSelf = getTutorialBoxAlignment(step.highlight);
    }
  }

  // ─── Advance / Next Step ───
  function advanceTutorial() {
    if (!dom.tutorialOverlay) return;
    var tutorialId = _tutorialState.id || 'main';
    var steps = (tutorials[tutorialId] && tutorials[tutorialId].steps) || [];
    var nextStep = (_tutorialState.step || 0) + 1;
    if (nextStep >= steps.length) {
      endTutorial();
      // After the MAIN tutorial completes, return to the Morning page (where
      // the tutorial began) instead of leaving the user on Settings.
      if (tutorialId === 'main' && pageName !== 'morning') {
        window.location.href = 'morning.html';
      }
      return;
    }
    var nextStepData = steps[nextStep];
    var currentPage = pageName;

    if (nextStepData.page && nextStepData.page !== currentPage) {
      saveTutorialState(tutorialId, nextStep, _tutorialState.isReplay);
      window.location.href = nextStepData.page + '.html?tutorial=true';
    } else {
      _tutorialState.step = nextStep;
      // Restock tutorial parity: when advancing into Step 2 territory
      // (step index >= 5), trigger the step transition so Step 2 elements
      // are visible and highlightable.
      if (tutorialId === 'restock' && nextStep === 5 && typeof window.restockContinueToPurchases === 'function') {
        window.restockContinueToPurchases();
      }
      renderTutorialStep();
    }
  }

  // ─── Previous Step ───
  function previousTutorial() {
    if (!dom.tutorialOverlay) return;
    var tutorialId = _tutorialState.id || 'main';
    var steps = (tutorials[tutorialId] && tutorials[tutorialId].steps) || [];
    var prevStep = (_tutorialState.step || 0) - 1;
    if (prevStep < 0) return;
    var prevStepData = steps[prevStep];
    var currentPage = pageName;

    // Mirror of advanceTutorial: if the previous step is on a different page,
    // save state and navigate there; otherwise just render the previous step.
    if (prevStepData.page && prevStepData.page !== currentPage) {
      saveTutorialState(tutorialId, prevStep, _tutorialState.isReplay);
      window.location.href = prevStepData.page + '.html?tutorial=true';

    } else {
      _tutorialState.step = prevStep;
      // Restock tutorial parity: when going back into Step 1 territory
      // (step index <= 4), trigger the back transition so Step 1 elements
      // are visible and highlightable.
      if (tutorialId === 'restock' && prevStep <= 4 && typeof window.restockBackToStep1 === 'function') {
        window.restockBackToStep1();
      }
      renderTutorialStep();
    }
  }

  // ─── End Tutorial ───
  function endTutorial() {
    stopHighlightTracking();
    if (!dom.tutorialOverlay) return;
    _tutorialState.active = false;
    dom.tutorialOverlay.style.display = 'none';
    dom.tutorialOverlay.classList.remove('active');
    if (dom.tutorialHighlight) dom.tutorialHighlight.style.display = 'none';
    clearTutorialState();
    // Tutorial auto-starts on every launch (see init morning handler)
    _tutorialState.id = null;
    _tutorialState.step = 0;
  }

  // ─── Launch Tutorial from Selector ───
  function launchTutorial() {
    var select = document.getElementById('tutorialSelector');
    if (!select) return;
    var tutorialId = select.value;
    if (!tutorialId) {
      return;
    }
    var tutorial = tutorials[tutorialId];
    if (!tutorial) return;
    var firstStep = tutorial.steps[0];
    var targetPage = firstStep && firstStep.page ? firstStep.page : (tutorial.page || 'morning');
    saveTutorialState(tutorialId, 0, true);
    window.location.href = targetPage + '.html?tutorial=true';
  }

  // ─── Check Tutorial Resume (call on page init) ───
  function checkTutorialResume() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('tutorial') === 'true') {
      var saved = loadTutorialState();
      if (saved && saved.id) {
        var tutorial = tutorials[saved.id];
        if (tutorial) {
          var stepData = tutorial.steps[saved.step || 0];
          if (stepData && stepData.page && stepData.page !== pageName) {
            window.location.href = stepData.page + '.html?tutorial=true';
            return true;
          }
          return resumeTutorial(saved);
        }
      }
    }
    return false;
  }

  // ============================================
  // SAMPLE DATA
  // ============================================
  function getSampleProducts() {
    // 120-item sari-sari store inventory across the 12 retail categories
    // (pantry staples … paper & sanitary). Quantities use variety (0 / low /
    // plenty) so all three stock statuses (out / low / plenty) show up in demos.
    return [
      // ── Beverages · Soft Drinks (6) ──
      { id:'s1', name:'Coca-Cola Original Taste', category:'beverages', subcategory:'soft_drinks', brand:'Coca-Cola', unit:'bottle', packageSize:'290ml', quantity:20, costPrice:18, sellingPrice:22.5, lowStockThreshold:6 },
      { id:'s2', name:'Pepsi', category:'beverages', subcategory:'soft_drinks', brand:'Pepsi', unit:'bottle', packageSize:'330ml', quantity:20, costPrice:18, sellingPrice:22.5, lowStockThreshold:6 },
      { id:'s3', name:'Royal Tru-Orange', category:'beverages', subcategory:'soft_drinks', brand:'Royal', unit:'bottle', packageSize:'330ml', quantity:0, costPrice:18, sellingPrice:22.5, lowStockThreshold:6 },
      { id:'s4', name:'Sprite', category:'beverages', subcategory:'soft_drinks', brand:'Sprite', unit:'bottle', packageSize:'330ml', quantity:20, costPrice:18, sellingPrice:22.5, lowStockThreshold:6 },
      { id:'s5', name:'Mountain Dew', category:'beverages', subcategory:'soft_drinks', brand:'Mountain Dew', unit:'bottle', packageSize:'330ml', quantity:20, costPrice:18, sellingPrice:22.5, lowStockThreshold:6 },
      { id:'s6', name:'RC Cola', category:'beverages', subcategory:'soft_drinks', brand:'RC Cola', unit:'bottle', packageSize:'330ml', quantity:3, costPrice:15, sellingPrice:18.75, lowStockThreshold:6 },
      // ── Beverages · Bottled Water (6) ──
      { id:'s7', name:'Wilkins Pure', category:'beverages', subcategory:'bottled_water', brand:'Wilkins', unit:'bottle', packageSize:'500ml', quantity:20, costPrice:10, sellingPrice:13, lowStockThreshold:6 },
      { id:'s8', name:'Absolute Purified Water', category:'beverages', subcategory:'bottled_water', brand:'Absolute', unit:'bottle', packageSize:'500ml', quantity:20, costPrice:10, sellingPrice:13, lowStockThreshold:6 },
      { id:'s9', name:'Nature\u2019s Spring', category:'beverages', subcategory:'bottled_water', brand:'Nature\u2019s Spring', unit:'bottle', packageSize:'500ml', quantity:20, costPrice:9, sellingPrice:11.7, lowStockThreshold:6 },
      { id:'s10', name:'Summit Water', category:'beverages', subcategory:'bottled_water', brand:'Summit', unit:'bottle', packageSize:'500ml', quantity:0, costPrice:10, sellingPrice:13, lowStockThreshold:6 },
      { id:'s11', name:'Viva Mineral Water', category:'beverages', subcategory:'bottled_water', brand:'Viva', unit:'bottle', packageSize:'500ml', quantity:4, costPrice:9, sellingPrice:11.7, lowStockThreshold:6 },
      { id:'s12', name:'Aquabest Purified Water', category:'beverages', subcategory:'bottled_water', brand:'Aquabest', unit:'bottle', packageSize:'500ml', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      // ── Beverages · Coffee Mix (6) ──
      { id:'s13', name:'Nescaf\u00e9 Classic', category:'beverages', subcategory:'coffee_mix', brand:'Nescaf\u00e9', unit:'sachet', packageSize:'25g', quantity:20, costPrice:9, sellingPrice:11.7, lowStockThreshold:6 },
      { id:'s14', name:'Great Taste 3-in-1', category:'beverages', subcategory:'coffee_mix', brand:'Great Taste', unit:'sachet', packageSize:'25g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      { id:'s15', name:'Kopiko Brown Coffee', category:'beverages', subcategory:'coffee_mix', brand:'Kopiko', unit:'sachet', packageSize:'25g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      { id:'s16', name:'San Mig Coffee 3-in-1', category:'beverages', subcategory:'coffee_mix', brand:'San Mig Coffee', unit:'sachet', packageSize:'20g', quantity:3, costPrice:7, sellingPrice:9.1, lowStockThreshold:6 },
      { id:'s17', name:'Caf\u00e9 Puro', category:'beverages', subcategory:'coffee_mix', brand:'Caf\u00e9 Puro', unit:'sachet', packageSize:'25g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      { id:'s18', name:'UCC 3-in-1 Coffee', category:'beverages', subcategory:'coffee_mix', brand:'UCC', unit:'sachet', packageSize:'20g', quantity:20, costPrice:10, sellingPrice:13, lowStockThreshold:6 },
      // ── Instant & Dry Goods · Instant Noodles (6) ──
      { id:'s19', name:'Lucky Me! Pancit Canton Original', category:'instant_dry_goods', subcategory:'instant_noodles', brand:'Lucky Me!', unit:'pack', packageSize:'60g', quantity:20, costPrice:11, sellingPrice:13.75, lowStockThreshold:6 },
      { id:'s20', name:'Payless Pancit Canton', category:'instant_dry_goods', subcategory:'instant_noodles', brand:'Payless', unit:'pack', packageSize:'60g', quantity:0, costPrice:9, sellingPrice:11.25, lowStockThreshold:6 },
      { id:'s21', name:'Nissin Ramen', category:'instant_dry_goods', subcategory:'instant_noodles', brand:'Nissin', unit:'pack', packageSize:'55g', quantity:20, costPrice:10, sellingPrice:12.5, lowStockThreshold:6 },
      { id:'s22', name:'QuickChow Pancit Canton', category:'instant_dry_goods', subcategory:'instant_noodles', brand:'QuickChow', unit:'pack', packageSize:'60g', quantity:20, costPrice:9, sellingPrice:11.25, lowStockThreshold:6 },
      { id:'s23', name:'Ho-Mi Instant Noodles', category:'instant_dry_goods', subcategory:'instant_noodles', brand:'Ho-Mi', unit:'pack', packageSize:'55g', quantity:4, costPrice:8, sellingPrice:10, lowStockThreshold:6 },
      { id:'s24', name:'Yakisoba Instant Noodles', category:'instant_dry_goods', subcategory:'instant_noodles', brand:'Yakisoba', unit:'pack', packageSize:'60g', quantity:20, costPrice:11, sellingPrice:13.75, lowStockThreshold:6 },
      // ── Pantry Staples · Rice (6) ──
      { id:'s25', name:'Do\u00f1a Maria Jasponica', category:'pantry_staples', subcategory:'rice', brand:'Do\u00f1a Maria', unit:'sack', packageSize:'5kg', quantity:20, costPrice:360, sellingPrice:414, lowStockThreshold:2 },
      { id:'s26', name:'Dinorado Rice', category:'pantry_staples', subcategory:'rice', brand:'Dinarado', unit:'sack', packageSize:'5kg', quantity:20, costPrice:330, sellingPrice:379.5, lowStockThreshold:2 },
      { id:'s27', name:'Sinandomeng Rice', category:'pantry_staples', subcategory:'rice', brand:'Sinandomeng', unit:'sack', packageSize:'5kg', quantity:20, costPrice:300, sellingPrice:345, lowStockThreshold:2 },
      { id:'s28', name:'Maharlika Rice', category:'pantry_staples', subcategory:'rice', brand:'Maharlika', unit:'sack', packageSize:'5kg', quantity:0, costPrice:320, sellingPrice:368, lowStockThreshold:2 },
      { id:'s29', name:'Jasmine Rice', category:'pantry_staples', subcategory:'rice', brand:'Jasmine', unit:'sack', packageSize:'5kg', quantity:1, costPrice:350, sellingPrice:402.5, lowStockThreshold:2 },
      { id:'s30', name:'Jasmate Rice', category:'pantry_staples', subcategory:'rice', brand:'Jasmate', unit:'sack', packageSize:'5kg', quantity:20, costPrice:340, sellingPrice:391, lowStockThreshold:2 },
      // ── Canned Goods · Sardines (6) ──
      { id:'s31', name:'Ligo Sardines in Tomato Sauce', category:'canned_goods', subcategory:'sardines', brand:'Ligo', unit:'can', packageSize:'155g', quantity:20, costPrice:20, sellingPrice:25, lowStockThreshold:4 },
      { id:'s32', name:'Mega Sardines in Tomato Sauce', category:'canned_goods', subcategory:'sardines', brand:'Mega', unit:'can', packageSize:'155g', quantity:20, costPrice:20, sellingPrice:25, lowStockThreshold:4 },
      { id:'s33', name:'Young\u2019s Town Sardines', category:'canned_goods', subcategory:'sardines', brand:'Young\u2019s Town', unit:'can', packageSize:'155g', quantity:20, costPrice:18, sellingPrice:22.5, lowStockThreshold:4 },
      { id:'s34', name:'555 Sardines', category:'canned_goods', subcategory:'sardines', brand:'555', unit:'can', packageSize:'155g', quantity:20, costPrice:21, sellingPrice:26.25, lowStockThreshold:4 },
      { id:'s35', name:'Argentina Sardines', category:'canned_goods', subcategory:'sardines', brand:'Argentina', unit:'can', packageSize:'155g', quantity:2, costPrice:19, sellingPrice:23.75, lowStockThreshold:4 },
      { id:'s36', name:'Atami Sardines', category:'canned_goods', subcategory:'sardines', brand:'Atami', unit:'can', packageSize:'155g', quantity:20, costPrice:18, sellingPrice:22.5, lowStockThreshold:4 },
      // ── Canned Goods · Tuna (6) ──
      { id:'s37', name:'Century Tuna Flakes', category:'canned_goods', subcategory:'tuna', brand:'Century Tuna', unit:'can', packageSize:'180g', quantity:20, costPrice:34, sellingPrice:42.5, lowStockThreshold:4 },
      { id:'s38', name:'555 Tuna Flakes', category:'canned_goods', subcategory:'tuna', brand:'555', unit:'can', packageSize:'155g', quantity:20, costPrice:28, sellingPrice:35, lowStockThreshold:4 },
      { id:'s39', name:'Mega Tuna Flakes', category:'canned_goods', subcategory:'tuna', brand:'Mega', unit:'can', packageSize:'180g', quantity:20, costPrice:30, sellingPrice:37.5, lowStockThreshold:4 },
      { id:'s40', name:'San Marino Tuna Flakes', category:'canned_goods', subcategory:'tuna', brand:'San Marino', unit:'can', packageSize:'180g', quantity:0, costPrice:29, sellingPrice:36.25, lowStockThreshold:4 },
      { id:'s41', name:'Ligo Tuna Flakes', category:'canned_goods', subcategory:'tuna', brand:'Ligo', unit:'can', packageSize:'180g', quantity:3, costPrice:30, sellingPrice:37.5, lowStockThreshold:4 },
      { id:'s42', name:'Family\u2019s Choice Tuna', category:'canned_goods', subcategory:'tuna', brand:'Family\u2019s Choice', unit:'can', packageSize:'180g', quantity:20, costPrice:27, sellingPrice:33.75, lowStockThreshold:4 },
      // ── Fresh Section · Eggs (6) ──
      { id:'s43', name:'Bounty Fresh Chicken Egg', category:'fresh_section', subcategory:'eggs', brand:'Bounty Fresh', unit:'piece', packageSize:'Large', quantity:20, costPrice:9, sellingPrice:10.8, lowStockThreshold:12 },
      { id:'s44', name:'Magnolia Chicken Egg', category:'fresh_section', subcategory:'eggs', brand:'Magnolia', unit:'piece', packageSize:'Large', quantity:20, costPrice:9.5, sellingPrice:11.4, lowStockThreshold:12 },
      { id:'s45', name:'Sarimanok Chicken Egg', category:'fresh_section', subcategory:'eggs', brand:'Sarimanok', unit:'piece', packageSize:'Large', quantity:8, costPrice:8.5, sellingPrice:10.2, lowStockThreshold:12 },
      { id:'s46', name:'Local Farm Chicken Egg', category:'fresh_section', subcategory:'eggs', brand:'Local Farm', unit:'piece', packageSize:'Medium', quantity:20, costPrice:8, sellingPrice:9.6, lowStockThreshold:12 },
      { id:'s47', name:'Free Range Chicken Egg', category:'fresh_section', subcategory:'eggs', brand:'Free Range Farm', unit:'piece', packageSize:'Large', quantity:20, costPrice:12, sellingPrice:14.4, lowStockThreshold:12 },
      { id:'s48', name:'Organic Chicken Egg', category:'fresh_section', subcategory:'eggs', brand:'Organic Farm', unit:'piece', packageSize:'Large', quantity:20, costPrice:13, sellingPrice:15.6, lowStockThreshold:12 },
      // ── Pantry Staples · Bread (6) ──
      { id:'s49', name:'Gardenia Pinoy Tasty', category:'pantry_staples', subcategory:'bread', brand:'Gardenia', unit:'loaf', packageSize:'400g', quantity:20, costPrice:45, sellingPrice:54, lowStockThreshold:4 },
      { id:'s50', name:'Gardenia Classic White Bread', category:'pantry_staples', subcategory:'bread', brand:'Gardenia', unit:'loaf', packageSize:'400g', quantity:20, costPrice:48, sellingPrice:57.6, lowStockThreshold:4 },
      { id:'s51', name:'Pinoy Tasty White Bread', category:'pantry_staples', subcategory:'bread', brand:'Pinoy Tasty', unit:'loaf', packageSize:'450g', quantity:0, costPrice:40, sellingPrice:48, lowStockThreshold:4 },
      { id:'s52', name:'Marby White Bread', category:'pantry_staples', subcategory:'bread', brand:'Marby', unit:'loaf', packageSize:'400g', quantity:2, costPrice:38, sellingPrice:45.6, lowStockThreshold:4 },
      { id:'s53', name:'Julie\u2019s Pandesal', category:'pantry_staples', subcategory:'bread', brand:'Julie\u2019s', unit:'pack', packageSize:'10pcs', quantity:20, costPrice:30, sellingPrice:36, lowStockThreshold:4 },
      { id:'s54', name:'Local Bakery Pandesal', category:'pantry_staples', subcategory:'bread', brand:'Local Bakery', unit:'pack', packageSize:'10pcs', quantity:20, costPrice:25, sellingPrice:30, lowStockThreshold:4 },
      // ── Snacks · Crackers & Cookies (6) ──
      { id:'s55', name:'Fita Crackers', category:'snacks_sweets', subcategory:'crackers', brand:'Fita', unit:'pack', packageSize:'30g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      { id:'s56', name:'SkyFlakes Crackers', category:'snacks_sweets', subcategory:'crackers', brand:'SkyFlakes', unit:'pack', packageSize:'25g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      { id:'s57', name:'Cream-O Chocolate Sandwich', category:'snacks_sweets', subcategory:'cookies', brand:'Cream-O', unit:'pack', packageSize:'33g', quantity:20, costPrice:9, sellingPrice:11.7, lowStockThreshold:6 },
      { id:'s58', name:'Oreo Original', category:'snacks_sweets', subcategory:'cookies', brand:'Oreo', unit:'pack', packageSize:'27g', quantity:3, costPrice:10, sellingPrice:13, lowStockThreshold:6 },
      { id:'s59', name:'Marie Biscuits', category:'snacks_sweets', subcategory:'crackers', brand:'Marie', unit:'pack', packageSize:'30g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      { id:'s60', name:'Rebisco Crackers', category:'snacks_sweets', subcategory:'crackers', brand:'Rebisco', unit:'pack', packageSize:'32g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:6 },
      // ── Snacks · Chocolates & Candies (6) ──
      { id:'s61', name:'Choc-Nut', category:'snacks_sweets', subcategory:'chocolates', brand:'Choc-Nut', unit:'piece', packageSize:'24g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:8 },
      { id:'s62', name:'Flat Tops Chocolate', category:'snacks_sweets', subcategory:'chocolates', brand:'Flat Tops', unit:'piece', packageSize:'24g', quantity:20, costPrice:7, sellingPrice:9.1, lowStockThreshold:8 },
      { id:'s63', name:'Cloud 9 Chocolate Bar', category:'snacks_sweets', subcategory:'chocolates', brand:'Cloud 9', unit:'piece', packageSize:'27g', quantity:20, costPrice:10, sellingPrice:13, lowStockThreshold:8 },
      { id:'s64', name:'Maxx Candy', category:'snacks_sweets', subcategory:'candies', brand:'Maxx', unit:'piece', packageSize:'single', quantity:20, costPrice:2.5, sellingPrice:3.5, lowStockThreshold:15 },
      { id:'s65', name:'White Rabbit Candy', category:'snacks_sweets', subcategory:'candies', brand:'White Rabbit', unit:'piece', packageSize:'single', quantity:20, costPrice:3, sellingPrice:4.05, lowStockThreshold:15 },
      { id:'s66', name:'Kendi Mint Candy', category:'snacks_sweets', subcategory:'candies', brand:'Kendi Mint', unit:'piece', packageSize:'single', quantity:0, costPrice:2, sellingPrice:2.8, lowStockThreshold:15 },
      // ── Snacks · Chips (6) ──
      { id:'s67', name:'Piattos Cheese', category:'snacks_sweets', subcategory:'chips', brand:'Piattos', unit:'pack', packageSize:'85g', quantity:20, costPrice:30, sellingPrice:37.5, lowStockThreshold:6 },
      { id:'s68', name:'Nova Multigrain Snacks', category:'snacks_sweets', subcategory:'chips', brand:'Nova', unit:'pack', packageSize:'78g', quantity:20, costPrice:30, sellingPrice:37.5, lowStockThreshold:6 },
      { id:'s69', name:'Clover Chips Cheese', category:'snacks_sweets', subcategory:'chips', brand:'Clover Chips', unit:'pack', packageSize:'55g', quantity:20, costPrice:20, sellingPrice:25, lowStockThreshold:6 },
      { id:'s70', name:'Chippy Barbecue', category:'snacks_sweets', subcategory:'chips', brand:'Chippy', unit:'pack', packageSize:'110g', quantity:20, costPrice:25, sellingPrice:31.25, lowStockThreshold:6 },
      { id:'s71', name:'Oishi Prawn Crackers', category:'snacks_sweets', subcategory:'chips', brand:'Oishi', unit:'pack', packageSize:'60g', quantity:3, costPrice:18, sellingPrice:22.5, lowStockThreshold:6 },
      { id:'s72', name:'Mang Juan Espesyal', category:'snacks_sweets', subcategory:'chips', brand:'Mang Juan', unit:'pack', packageSize:'90g', quantity:20, costPrice:25, sellingPrice:31.25, lowStockThreshold:6 },
      // ── Pantry Staples · Salt (6) ──
      { id:'s73', name:'La Filipina Iodized Salt', category:'pantry_staples', subcategory:'salt', brand:'La Filipina', unit:'pack', packageSize:'500g', quantity:20, costPrice:15, sellingPrice:19.5, lowStockThreshold:5 },
      { id:'s74', name:'Diamond Crystal Salt', category:'pantry_staples', subcategory:'salt', brand:'Diamond Crystal', unit:'pack', packageSize:'500g', quantity:20, costPrice:18, sellingPrice:23.4, lowStockThreshold:5 },
      { id:'s75', name:'Morton Iodized Salt', category:'pantry_staples', subcategory:'salt', brand:'Morton', unit:'pack', packageSize:'500g', quantity:20, costPrice:22, sellingPrice:28.6, lowStockThreshold:5 },
      { id:'s76', name:'Local Sea Salt', category:'pantry_staples', subcategory:'salt', brand:'Sea Salt', unit:'pack', packageSize:'500g', quantity:20, costPrice:12, sellingPrice:15.6, lowStockThreshold:5 },
      { id:'s77', name:'Iodized Salt', category:'pantry_staples', subcategory:'salt', brand:'Iodized Salt', unit:'pack', packageSize:'500g', quantity:0, costPrice:13, sellingPrice:16.9, lowStockThreshold:5 },
      { id:'s78', name:'Fine Table Salt', category:'pantry_staples', subcategory:'salt', brand:'Fine Salt', unit:'pack', packageSize:'500g', quantity:20, costPrice:12, sellingPrice:15.6, lowStockThreshold:5 },
      // ── Pantry Staples · Sugar (6) ──
      { id:'s79', name:'Victorias Refined Sugar', category:'pantry_staples', subcategory:'sugar', brand:'Victorias', unit:'pack', packageSize:'1kg', quantity:20, costPrice:80, sellingPrice:96, lowStockThreshold:5 },
      { id:'s80', name:'Central Refined Sugar', category:'pantry_staples', subcategory:'sugar', brand:'Central Azucarera', unit:'pack', packageSize:'1kg', quantity:20, costPrice:78, sellingPrice:93.6, lowStockThreshold:5 },
      { id:'s81', name:'Sweet Crystal Sugar', category:'pantry_staples', subcategory:'sugar', brand:'Sweet Crystal', unit:'pack', packageSize:'1kg', quantity:20, costPrice:75, sellingPrice:90, lowStockThreshold:5 },
      { id:'s82', name:'C&H Sugar', category:'pantry_staples', subcategory:'sugar', brand:'C&H', unit:'pack', packageSize:'1kg', quantity:0, costPrice:95, sellingPrice:114, lowStockThreshold:5 },
      { id:'s83', name:'Domino Sugar', category:'pantry_staples', subcategory:'sugar', brand:'Domino', unit:'pack', packageSize:'1kg', quantity:2, costPrice:90, sellingPrice:108, lowStockThreshold:5 },
      { id:'s84', name:'Brown Sugar', category:'pantry_staples', subcategory:'sugar', brand:'Brown Sugar', unit:'pack', packageSize:'1kg', quantity:20, costPrice:75, sellingPrice:90, lowStockThreshold:5 },
      // ── Personal Care · Shampoo & Conditioner (6) ──
      { id:'s85', name:'Sunsilk Shampoo', category:'personal_care', subcategory:'shampoo', brand:'Sunsilk', unit:'sachet', packageSize:'12ml', quantity:20, costPrice:7, sellingPrice:9.45, lowStockThreshold:8 },
      { id:'s86', name:'Cream Silk Conditioner', category:'personal_care', subcategory:'conditioner', brand:'Cream Silk', unit:'sachet', packageSize:'12ml', quantity:20, costPrice:7, sellingPrice:9.45, lowStockThreshold:8 },
      { id:'s87', name:'Pantene Shampoo', category:'personal_care', subcategory:'shampoo', brand:'Pantene', unit:'sachet', packageSize:'12ml', quantity:20, costPrice:8, sellingPrice:10.8, lowStockThreshold:8 },
      { id:'s88', name:'Head & Shoulders Shampoo', category:'personal_care', subcategory:'shampoo', brand:'Head & Shoulders', unit:'sachet', packageSize:'12ml', quantity:20, costPrice:8, sellingPrice:10.8, lowStockThreshold:8 },
      { id:'s89', name:'Palmolive Shampoo', category:'personal_care', subcategory:'shampoo', brand:'Palmolive', unit:'sachet', packageSize:'12ml', quantity:20, costPrice:6.5, sellingPrice:8.78, lowStockThreshold:8 },
      { id:'s90', name:'Rejoice Shampoo', category:'personal_care', subcategory:'conditioner', brand:'Rejoice', unit:'sachet', packageSize:'12ml', quantity:3, costPrice:7, sellingPrice:9.45, lowStockThreshold:8 },
      // ── Personal Care · Bath Soap (6) ──
      { id:'s91', name:'Safeguard Classic', category:'personal_care', subcategory:'bath_soap', brand:'Safeguard', unit:'bar', packageSize:'60g', quantity:20, costPrice:22, sellingPrice:27.5, lowStockThreshold:6 },
      { id:'s92', name:'Dove Beauty Bar', category:'personal_care', subcategory:'bath_soap', brand:'Dove', unit:'bar', packageSize:'90g', quantity:20, costPrice:45, sellingPrice:56.25, lowStockThreshold:5 },
      { id:'s93', name:'Palmolive Naturals', category:'personal_care', subcategory:'bath_soap', brand:'Palmolive', unit:'bar', packageSize:'90g', quantity:20, costPrice:25, sellingPrice:31.25, lowStockThreshold:6 },
      { id:'s94', name:'Bioderm Soap', category:'personal_care', subcategory:'bath_soap', brand:'Bioderm', unit:'bar', packageSize:'90g', quantity:0, costPrice:20, sellingPrice:25, lowStockThreshold:6 },
      { id:'s95', name:'Silka Papaya Soap', category:'personal_care', subcategory:'bath_soap', brand:'Silka', unit:'bar', packageSize:'65g', quantity:20, costPrice:25, sellingPrice:31.25, lowStockThreshold:6 },
      { id:'s96', name:'Kojic Acid Soap', category:'personal_care', subcategory:'bath_soap', brand:'Kojic', unit:'bar', packageSize:'65g', quantity:4, costPrice:25, sellingPrice:31.25, lowStockThreshold:6 },
      // ── Household & Home Care · Laundry (6) ──
      { id:'s97', name:'Surf Powder Detergent', category:'household_care', subcategory:'laundry', brand:'Surf', unit:'sachet', packageSize:'40g', quantity:20, costPrice:8, sellingPrice:10.4, lowStockThreshold:8 },
      { id:'s98', name:'Ariel Powder Detergent', category:'household_care', subcategory:'laundry', brand:'Ariel', unit:'sachet', packageSize:'40g', quantity:20, costPrice:9, sellingPrice:11.7, lowStockThreshold:8 },
      { id:'s99', name:'Tide Powder Detergent', category:'household_care', subcategory:'laundry', brand:'Tide', unit:'sachet', packageSize:'40g', quantity:20, costPrice:9, sellingPrice:11.7, lowStockThreshold:8 },
      { id:'s100', name:'Champion Powder Detergent', category:'household_care', subcategory:'laundry', brand:'Champion', unit:'sachet', packageSize:'40g', quantity:20, costPrice:7, sellingPrice:9.1, lowStockThreshold:8 },
      { id:'s101', name:'Pride Powder Detergent', category:'household_care', subcategory:'laundry', brand:'Pride', unit:'sachet', packageSize:'40g', quantity:0, costPrice:7, sellingPrice:9.1, lowStockThreshold:8 },
      { id:'s102', name:'Breeze Powder Detergent', category:'household_care', subcategory:'laundry', brand:'Breeze', unit:'sachet', packageSize:'40g', quantity:3, costPrice:9, sellingPrice:11.7, lowStockThreshold:8 },
      // ── Personal Care · Oral Care (6) ──
      { id:'s103', name:'Colgate Toothpaste', category:'personal_care', subcategory:'toothpaste', brand:'Colgate', unit:'tube', packageSize:'50g', quantity:20, costPrice:45, sellingPrice:56.25, lowStockThreshold:5 },
      { id:'s104', name:'Closeup Toothpaste', category:'personal_care', subcategory:'toothpaste', brand:'Closeup', unit:'tube', packageSize:'50g', quantity:20, costPrice:42, sellingPrice:52.5, lowStockThreshold:5 },
      { id:'s105', name:'Hapee Toothpaste', category:'personal_care', subcategory:'toothpaste', brand:'Hapee', unit:'tube', packageSize:'50g', quantity:20, costPrice:35, sellingPrice:43.75, lowStockThreshold:5 },
      { id:'s106', name:'Oral-B Toothbrush', category:'personal_care', subcategory:'toothbrush', brand:'Oral-B', unit:'piece', packageSize:'1pc', quantity:20, costPrice:35, sellingPrice:43.75, lowStockThreshold:5 },
      { id:'s107', name:'Pepsodent Toothpaste', category:'personal_care', subcategory:'toothpaste', brand:'Pepsodent', unit:'tube', packageSize:'50g', quantity:20, costPrice:35, sellingPrice:43.75, lowStockThreshold:5 },
      { id:'s108', name:'Systema Toothbrush', category:'personal_care', subcategory:'toothbrush', brand:'Systema', unit:'piece', packageSize:'1pc', quantity:2, costPrice:30, sellingPrice:37.5, lowStockThreshold:5 },
      // ── Household & Home Care · Mosquito Control (6) ──
      { id:'s109', name:'Katol Mosquito Coil', category:'household_care', subcategory:'mosquito_control', brand:'Katol', unit:'pack', packageSize:'10 coils', quantity:20, costPrice:22, sellingPrice:28.6, lowStockThreshold:5 },
      { id:'s110', name:'Baygon Mosquito Coil', category:'household_care', subcategory:'mosquito_control', brand:'Baygon', unit:'pack', packageSize:'10 coils', quantity:20, costPrice:35, sellingPrice:45.5, lowStockThreshold:5 },
      { id:'s111', name:'Off! Mosquito Repellent', category:'household_care', subcategory:'mosquito_control', brand:'Off!', unit:'sachet', packageSize:'1pc', quantity:20, costPrice:12, sellingPrice:15.6, lowStockThreshold:5 },
      { id:'s112', name:'Raid Mosquito Coil', category:'household_care', subcategory:'mosquito_control', brand:'Raid', unit:'pack', packageSize:'10 coils', quantity:20, costPrice:30, sellingPrice:39, lowStockThreshold:5 },
      { id:'s113', name:'Lion Tiger Mosquito Coil', category:'household_care', subcategory:'mosquito_control', brand:'Lion Tiger', unit:'pack', packageSize:'10 coils', quantity:0, costPrice:20, sellingPrice:26, lowStockThreshold:5 },
      { id:'s114', name:'Local Mosquito Coil', category:'household_care', subcategory:'mosquito_control', brand:'Local Brand', unit:'pack', packageSize:'10 coils', quantity:4, costPrice:18, sellingPrice:23.4, lowStockThreshold:5 },
      // ── Liquor, Wine & Tobacco · Cigarettes (6) ──
      { id:'s115', name:'Marlboro Red', category:'liquor_wine', subcategory:'cigarettes', brand:'Marlboro', unit:'pack', packageSize:'20 sticks', quantity:20, costPrice:140, sellingPrice:154, lowStockThreshold:5 },
      { id:'s116', name:'Fortune Red', category:'liquor_wine', subcategory:'cigarettes', brand:'Fortune', unit:'pack', packageSize:'20 sticks', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s117', name:'Winston Red', category:'liquor_wine', subcategory:'cigarettes', brand:'Winston', unit:'pack', packageSize:'20 sticks', quantity:20, costPrice:130, sellingPrice:143, lowStockThreshold:5 },
      { id:'s118', name:'Camel Blue', category:'liquor_wine', subcategory:'cigarettes', brand:'Camel', unit:'pack', packageSize:'20 sticks', quantity:20, costPrice:130, sellingPrice:143, lowStockThreshold:5 },
      { id:'s119', name:'Philip Morris Red', category:'liquor_wine', subcategory:'cigarettes', brand:'Philip Morris', unit:'pack', packageSize:'20 sticks', quantity:20, costPrice:125, sellingPrice:137.5, lowStockThreshold:5 },
      { id:'s120', name:'Mighty Red', category:'liquor_wine', subcategory:'cigarettes', brand:'Mighty', unit:'pack', packageSize:'20 sticks', quantity:0, costPrice:110, sellingPrice:121, lowStockThreshold:5 },
      // ── Pantry Staples & Cooking · Cooking Oil (3) ──
      { id:'s121', name:'Minola Cooking Oil', category:'pantry_staples', subcategory:'cooking_oil', brand:'Minola', unit:'bottle', packageSize:'1L', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s122', name:'Baguio Oil', category:'pantry_staples', subcategory:'cooking_oil', brand:'Baguio', unit:'bottle', packageSize:'1L', quantity:20, costPrice:110, sellingPrice:121, lowStockThreshold:5 },
      { id:'s123', name:'Palm Oil Cooking Oil', category:'pantry_staples', subcategory:'cooking_oil', brand:'Palm Oil', unit:'bottle', packageSize:'1L', quantity:20, costPrice:115, sellingPrice:126.5, lowStockThreshold:5 },
      // ── Pantry Staples & Cooking · Vinegar (3) ──
      { id:'s124', name:'Datu Puti Vinegar', category:'pantry_staples', subcategory:'vinegar', brand:'Datu Puti', unit:'bottle', packageSize:'1L', quantity:20, costPrice:60, sellingPrice:66, lowStockThreshold:5 },
      { id:'s125', name:'Silver Swan Vinegar', category:'pantry_staples', subcategory:'vinegar', brand:'Silver Swan', unit:'bottle', packageSize:'1L', quantity:20, costPrice:58, sellingPrice:63.8, lowStockThreshold:5 },
      { id:'s126', name:'Mafran Cane Vinegar', category:'pantry_staples', subcategory:'vinegar', brand:'Mafran', unit:'bottle', packageSize:'1L', quantity:20, costPrice:55, sellingPrice:60.5, lowStockThreshold:5 },
      // ── Canned Goods · Corned Beef (3) ──
      { id:'s127', name:'Purefoods Corned Beef', category:'canned_goods', subcategory:'corned_beef', brand:'Purefoods', unit:'can', packageSize:'150g', quantity:20, costPrice:80, sellingPrice:88, lowStockThreshold:5 },
      { id:'s128', name:'Argentina Corned Beef', category:'canned_goods', subcategory:'corned_beef', brand:'Argentina', unit:'can', packageSize:'155g', quantity:20, costPrice:75, sellingPrice:82.5, lowStockThreshold:5 },
      { id:'s129', name:'CDO Corned Beef', category:'canned_goods', subcategory:'corned_beef', brand:'CDO', unit:'can', packageSize:'150g', quantity:20, costPrice:72, sellingPrice:79.2, lowStockThreshold:5 },
      // ── Canned Goods · Meat Loaf (3) ──
      { id:'s130', name:'CDO Meat Loaf Plain', category:'canned_goods', subcategory:'meat_loaf', brand:'CDO', unit:'can', packageSize:'150g', quantity:20, costPrice:50, sellingPrice:55, lowStockThreshold:5 },
      { id:'s131', name:'CDO Meat Loaf Sweet Style', category:'canned_goods', subcategory:'meat_loaf', brand:'CDO', unit:'can', packageSize:'150g', quantity:20, costPrice:50, sellingPrice:55, lowStockThreshold:5 },
      { id:'s132', name:'Purefoods Luncheon Meat', category:'canned_goods', subcategory:'meat_loaf', brand:'Purefoods', unit:'can', packageSize:'150g', quantity:20, costPrice:55, sellingPrice:60.5, lowStockThreshold:5 },
      // ── Canned Goods · Sausage (3) ──
      { id:'s133', name:'Argentina Sausage', category:'canned_goods', subcategory:'sausage', brand:'Argentina', unit:'can', packageSize:'150g', quantity:20, costPrice:45, sellingPrice:49.5, lowStockThreshold:5 },
      { id:'s134', name:'Purefoods Sausage', category:'canned_goods', subcategory:'sausage', brand:'Purefoods', unit:'can', packageSize:'150g', quantity:20, costPrice:48, sellingPrice:52.8, lowStockThreshold:5 },
      { id:'s135', name:'CDO Vienna Sausage', category:'canned_goods', subcategory:'sausage', brand:'CDO', unit:'can', packageSize:'150g', quantity:20, costPrice:46, sellingPrice:50.6, lowStockThreshold:5 },
      // ── Instant & Dry Goods · Cup Noodles (3) ──
      // ── Instant & Dry Goods · Soup Mixes (3) ──
      { id:'s142', name:'Knorr Chicken Soup Mix', category:'instant_dry_goods', subcategory:'soup_mixes', brand:'Knorr', unit:'pack', packageSize:'30g', quantity:20, costPrice:15, sellingPrice:16.5, lowStockThreshold:5 },
      { id:'s143', name:'Knorr Beef Soup Mix', category:'instant_dry_goods', subcategory:'soup_mixes', brand:'Knorr', unit:'pack', packageSize:'30g', quantity:20, costPrice:15, sellingPrice:16.5, lowStockThreshold:5 },
      { id:'s144', name:'Mama Sita\'s Sinigang Mix', category:'instant_dry_goods', subcategory:'soup_mixes', brand:'Mama Sita\'s', unit:'pack', packageSize:'40g', quantity:20, costPrice:20, sellingPrice:22, lowStockThreshold:5 },
      // ── Beverages · Powdered Milk (3) ──
      { id:'s145', name:'Bear Brand Powdered Milk', category:'beverages', subcategory:'powdered_milk', brand:'Bear Brand', unit:'pack', packageSize:'600g', quantity:20, costPrice:380, sellingPrice:418, lowStockThreshold:5 },
      { id:'s146', name:'Nido 3+ Powdered Milk', category:'beverages', subcategory:'powdered_milk', brand:'Nido', unit:'pack', packageSize:'700g', quantity:20, costPrice:420, sellingPrice:462, lowStockThreshold:5 },
      { id:'s147', name:'Nestlé Milkady', category:'beverages', subcategory:'powdered_milk', brand:'Nestlé', unit:'pack', packageSize:'650g', quantity:20, costPrice:400, sellingPrice:440, lowStockThreshold:5 },
      // ── Beverages · Chocolate Drink (3) ──
      { id:'s148', name:'Milo Chocolate Drink', category:'beverages', subcategory:'chocolate_drink', brand:'Milo', unit:'pack', packageSize:'500g', quantity:20, costPrice:280, sellingPrice:308, lowStockThreshold:5 },
      { id:'s149', name:'Ovaltine Chocolate Drink', category:'beverages', subcategory:'chocolate_drink', brand:'Ovaltine', unit:'pack', packageSize:'500g', quantity:20, costPrice:270, sellingPrice:297, lowStockThreshold:5 },
      { id:'s150', name:'Nestlé Nesquik', category:'beverages', subcategory:'chocolate_drink', brand:'Nesquik', unit:'pack', packageSize:'400g', quantity:20, costPrice:260, sellingPrice:286, lowStockThreshold:5 },
      // ── Dairy & Refrigerated · Cheese (3) ──
      { id:'s154', name:'Eden Cheese', category:'dairy_refrigerated', subcategory:'cheese', brand:'Eden', unit:'pack', packageSize:'160g', quantity:20, costPrice:95, sellingPrice:104.5, lowStockThreshold:5 },
      { id:'s155', name:'Magnolia Cheese', category:'dairy_refrigerated', subcategory:'cheese', brand:'Magnolia', unit:'pack', packageSize:'160g', quantity:20, costPrice:90, sellingPrice:99, lowStockThreshold:5 },
      { id:'s156', name:'Quickmelt Cheese', category:'dairy_refrigerated', subcategory:'cheese', brand:'Quickmelt', unit:'pack', packageSize:'150g', quantity:20, costPrice:88, sellingPrice:96.8, lowStockThreshold:5 },
      // ── Dairy & Refrigerated · Butter (3) ──
      { id:'s157', name:'Buttercup', category:'dairy_refrigerated', subcategory:'butter', brand:'Buttercup', unit:'bar', packageSize:'200g', quantity:20, costPrice:65, sellingPrice:71.5, lowStockThreshold:5 },
      { id:'s158', name:'Dari Creme Butter', category:'dairy_refrigerated', subcategory:'butter', brand:'Dari Creme', unit:'bar', packageSize:'200g', quantity:20, costPrice:60, sellingPrice:66, lowStockThreshold:5 },
      { id:'s159', name:'Anchor Butter', category:'dairy_refrigerated', subcategory:'butter', brand:'Anchor', unit:'bar', packageSize:'250g', quantity:20, costPrice:240, sellingPrice:264, lowStockThreshold:5 },
      // ── Dairy & Refrigerated · Margarine (3) ──
      { id:'s160', name:'Star Margarine', category:'dairy_refrigerated', subcategory:'margarine', brand:'Star', unit:'bar', packageSize:'200g', quantity:20, costPrice:45, sellingPrice:49.5, lowStockThreshold:5 },
      { id:'s161', name:'Dari Creme Margarine', category:'dairy_refrigerated', subcategory:'margarine', brand:'Dari Creme', unit:'bar', packageSize:'200g', quantity:20, costPrice:42, sellingPrice:46.2, lowStockThreshold:5 },
      { id:'s162', name:'Reyes Margarine', category:'dairy_refrigerated', subcategory:'margarine', brand:'Reyes', unit:'bar', packageSize:'200g', quantity:20, costPrice:40, sellingPrice:44, lowStockThreshold:5 },
      // ── Dairy & Refrigerated · Chilled Meats (3) ──
      { id:'s163', name:'Purefoods Vienna Sausage', category:'dairy_refrigerated', subcategory:'chilled_meats', brand:'Purefoods', unit:'pack', packageSize:'125g', quantity:20, costPrice:40, sellingPrice:44, lowStockThreshold:5 },
      { id:'s164', name:'CDO Chicken Hotdog', category:'dairy_refrigerated', subcategory:'chilled_meats', brand:'CDO', unit:'pack', packageSize:'500g', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s165', name:'Purefoods Star Hotdog', category:'dairy_refrigerated', subcategory:'chilled_meats', brand:'Purefoods', unit:'pack', packageSize:'500g', quantity:20, costPrice:130, sellingPrice:143, lowStockThreshold:5 },
      // ── Fresh Section · Fresh Meat (3) ──
      { id:'s166', name:'Pork Belly', category:'fresh_section', subcategory:'fresh_meat', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:280, sellingPrice:308, lowStockThreshold:5 },
      { id:'s167', name:'Chicken Leg Quarter', category:'fresh_section', subcategory:'fresh_meat', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:180, sellingPrice:198, lowStockThreshold:5 },
      { id:'s168', name:'Beef Sirloin', category:'fresh_section', subcategory:'fresh_meat', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:420, sellingPrice:462, lowStockThreshold:5 },
      // ── Fresh Section · Fresh Seafood (3) ──
      { id:'s169', name:'Tilapia', category:'fresh_section', subcategory:'fresh_seafood', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:150, sellingPrice:165, lowStockThreshold:5 },
      { id:'s170', name:'Galunggong', category:'fresh_section', subcategory:'fresh_seafood', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:160, sellingPrice:176, lowStockThreshold:5 },
      { id:'s171', name:'Sugpo Shrimp', category:'fresh_section', subcategory:'fresh_seafood', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:450, sellingPrice:495, lowStockThreshold:5 },
      // ── Liquor, Wine & Tobacco · Beer (3) ──
      { id:'s178', name:'San Miguel Pale Pilsen', category:'liquor_wine', subcategory:'beer', brand:'San Miguel', unit:'bottle', packageSize:'330mL', quantity:20, costPrice:55, sellingPrice:60.5, lowStockThreshold:5 },
      { id:'s179', name:'Red Horse Beer', category:'liquor_wine', subcategory:'beer', brand:'Red Horse', unit:'bottle', packageSize:'500mL', quantity:20, costPrice:65, sellingPrice:71.5, lowStockThreshold:5 },
      { id:'s180', name:'San Mig Light', category:'liquor_wine', subcategory:'beer', brand:'San Miguel', unit:'bottle', packageSize:'330mL', quantity:20, costPrice:55, sellingPrice:60.5, lowStockThreshold:5 },
      // ── Liquor, Wine & Tobacco · Gin (3) ──
      { id:'s181', name:'Ginebra San Miguel', category:'liquor_wine', subcategory:'gin', brand:'Ginebra', unit:'bottle', packageSize:'350mL', quantity:20, costPrice:95, sellingPrice:104.5, lowStockThreshold:5 },
      { id:'s182', name:'Ginebra Premium Gin', category:'liquor_wine', subcategory:'gin', brand:'Ginebra', unit:'bottle', packageSize:'350mL', quantity:20, costPrice:130, sellingPrice:143, lowStockThreshold:5 },
      { id:'s183', name:'Ginebra Flavors', category:'liquor_wine', subcategory:'gin', brand:'Ginebra', unit:'bottle', packageSize:'350mL', quantity:20, costPrice:140, sellingPrice:154, lowStockThreshold:5 },
      // ── Liquor, Wine & Tobacco · Brandy (3) ──
      { id:'s184', name:'Fundador Brandy', category:'liquor_wine', subcategory:'brandy', brand:'Fundador', unit:'bottle', packageSize:'350mL', quantity:20, costPrice:180, sellingPrice:198, lowStockThreshold:5 },
      { id:'s185', name:'Emperador Brandy', category:'liquor_wine', subcategory:'brandy', brand:'Emperador', unit:'bottle', packageSize:'350mL', quantity:20, costPrice:150, sellingPrice:165, lowStockThreshold:5 },
      { id:'s186', name:'Generoso Brandy', category:'liquor_wine', subcategory:'brandy', brand:'Generoso', unit:'bottle', packageSize:'350mL', quantity:20, costPrice:140, sellingPrice:154, lowStockThreshold:5 },
      // ── Personal Care · Lotion (3) ──
      { id:'s190', name:'Vaseline Body Lotion', category:'personal_care', subcategory:'lotion', brand:'Vaseline', unit:'bottle', packageSize:'200mL', quantity:20, costPrice:180, sellingPrice:198, lowStockThreshold:5 },
      { id:'s191', name:'Jergens Body Lotion', category:'personal_care', subcategory:'lotion', brand:'Jergens', unit:'bottle', packageSize:'200mL', quantity:20, costPrice:220, sellingPrice:242, lowStockThreshold:5 },
      { id:'s192', name:'Nivea Body Lotion', category:'personal_care', subcategory:'lotion', brand:'Nivea', unit:'bottle', packageSize:'200mL', quantity:20, costPrice:240, sellingPrice:264, lowStockThreshold:5 },
      // ── Personal Care · Cosmetics (3) ──
      { id:'s193', name:'Ever Bilena Lipstick', category:'personal_care', subcategory:'cosmetics', brand:'Ever Bilena', unit:'piece', packageSize:'1 pc', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s194', name:'Nichido Pressed Powder', category:'personal_care', subcategory:'cosmetics', brand:'Nichido', unit:'piece', packageSize:'1 pc', quantity:20, costPrice:180, sellingPrice:198, lowStockThreshold:5 },
      { id:'s195', name:'Ever Bilena Face Powder', category:'personal_care', subcategory:'cosmetics', brand:'Ever Bilena', unit:'piece', packageSize:'1 pc', quantity:20, costPrice:150, sellingPrice:165, lowStockThreshold:5 },
      // ── Household & Home Care · Fabric Softener (3) ──
      { id:'s196', name:'Downy Fabric Conditioner', category:'household_care', subcategory:'fabric_softener', brand:'Downy', unit:'sachet', packageSize:'1L', quantity:20, costPrice:150, sellingPrice:165, lowStockThreshold:5 },
      { id:'s197', name:'Comfort Fabric Conditioner', category:'household_care', subcategory:'fabric_softener', brand:'Comfort', unit:'sachet', packageSize:'1L', quantity:20, costPrice:145, sellingPrice:159.5, lowStockThreshold:5 },
      { id:'s198', name:'Surf Fabric Conditioner', category:'household_care', subcategory:'fabric_softener', brand:'Surf', unit:'sachet', packageSize:'1L', quantity:20, costPrice:140, sellingPrice:154, lowStockThreshold:5 },
      // ── Household & Home Care · Dishwashing (3) ──
      { id:'s199', name:'Joy Dishwashing Liquid', category:'household_care', subcategory:'dishwashing', brand:'Joy', unit:'sachet', packageSize:'170mL', quantity:20, costPrice:30, sellingPrice:33, lowStockThreshold:5 },
      { id:'s200', name:'Surf Dishwashing Liquid', category:'household_care', subcategory:'dishwashing', brand:'Surf', unit:'sachet', packageSize:'170mL', quantity:20, costPrice:28, sellingPrice:30.8, lowStockThreshold:5 },
      { id:'s201', name:'Zonrox Dishwashing', category:'household_care', subcategory:'dishwashing', brand:'Zonrox', unit:'sachet', packageSize:'170mL', quantity:20, costPrice:29, sellingPrice:31.9, lowStockThreshold:5 },
      // ── Household & Home Care · Cleaners (3) ──
      { id:'s202', name:'Zonrox Bleach', category:'household_care', subcategory:'cleaners', brand:'Zonrox', unit:'bottle', packageSize:'1L', quantity:20, costPrice:85, sellingPrice:93.5, lowStockThreshold:5 },
      // ── Baby Care · Diapers (3) ──
      { id:'s208', name:'Pampers Diapers Medium', category:'baby_care', subcategory:'diapers', brand:'Pampers', unit:'pack', packageSize:'30 pcs', quantity:20, costPrice:280, sellingPrice:308, lowStockThreshold:5 },
      { id:'s209', name:'EQ Diapers Medium', category:'baby_care', subcategory:'diapers', brand:'EQ', unit:'pack', packageSize:'30 pcs', quantity:20, costPrice:260, sellingPrice:286, lowStockThreshold:5 },
      { id:'s210', name:'Baby Love Diapers', category:'baby_care', subcategory:'diapers', brand:'Baby Love', unit:'pack', packageSize:'30 pcs', quantity:20, costPrice:240, sellingPrice:264, lowStockThreshold:5 },
      // ── Baby Care · Baby Wipes (3) ──
      { id:'s211', name:'Pampers Baby Wipes', category:'baby_care', subcategory:'baby_wipes', brand:'Pampers', unit:'pack', packageSize:'48 pcs', quantity:20, costPrice:80, sellingPrice:88, lowStockThreshold:5 },
      { id:'s212', name:'EQ Baby Wipes', category:'baby_care', subcategory:'baby_wipes', brand:'EQ', unit:'pack', packageSize:'48 pcs', quantity:20, costPrice:70, sellingPrice:77, lowStockThreshold:5 },
      { id:'s213', name:'Baby Care Wipes', category:'baby_care', subcategory:'baby_wipes', brand:'Baby Care', unit:'pack', packageSize:'40 pcs', quantity:20, costPrice:65, sellingPrice:71.5, lowStockThreshold:5 },
      // ── Baby Care · Baby Toiletries (3) ──
      { id:'s214', name:'Johnson\'s Baby Lotion', category:'baby_care', subcategory:'baby_toiletries', brand:'Johnson\'s', unit:'bottle', packageSize:'200mL', quantity:20, costPrice:180, sellingPrice:198, lowStockThreshold:5 },
      { id:'s215', name:'Johnson\'s Baby Powder', category:'baby_care', subcategory:'baby_toiletries', brand:'Johnson\'s', unit:'bottle', packageSize:'200g', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s216', name:'Cetaphil Baby Wash', category:'baby_care', subcategory:'baby_toiletries', brand:'Cetaphil', unit:'bottle', packageSize:'400mL', quantity:20, costPrice:280, sellingPrice:308, lowStockThreshold:5 },
      // ── Paper & Sanitary · Tissue (3) ──
      { id:'s217', name:'CDO Facial Tissue', category:'paper_sanitary', subcategory:'tissue', brand:'CDO', unit:'pack', packageSize:'100 pcs', quantity:20, costPrice:40, sellingPrice:44, lowStockThreshold:5 },
      { id:'s218', name:'Kleenex Tissues', category:'paper_sanitary', subcategory:'tissue', brand:'Kleenex', unit:'pack', packageSize:'100 pcs', quantity:20, costPrice:60, sellingPrice:66, lowStockThreshold:5 },
      { id:'s219', name:'Scott Tissues', category:'paper_sanitary', subcategory:'tissue', brand:'Scott', unit:'pack', packageSize:'100 pcs', quantity:20, costPrice:55, sellingPrice:60.5, lowStockThreshold:5 },
      // ── Paper & Sanitary · Paper Towels (3) ──
      { id:'s220', name:'Velvex Paper Towel', category:'paper_sanitary', subcategory:'paper_towels', brand:'Velvex', unit:'piece', packageSize:'1 roll', quantity:20, costPrice:45, sellingPrice:49.5, lowStockThreshold:5 },
      { id:'s221', name:'Scott Paper Towel', category:'paper_sanitary', subcategory:'paper_towels', brand:'Scott', unit:'piece', packageSize:'1 roll', quantity:20, costPrice:60, sellingPrice:66, lowStockThreshold:5 },
      { id:'s222', name:'Bounty Paper Towel', category:'paper_sanitary', subcategory:'paper_towels', brand:'Bounty', unit:'piece', packageSize:'1 roll', quantity:20, costPrice:65, sellingPrice:71.5, lowStockThreshold:5 },
      // ── Paper & Sanitary · Sanitary Pads (3) ──
      { id:'s223', name:'Nurse Beauty Sanitary Pads', category:'paper_sanitary', subcategory:'sanitary_pads', brand:'Nurse Beauty', unit:'pack', packageSize:'10 pcs', quantity:20, costPrice:25, sellingPrice:27.5, lowStockThreshold:5 },
      { id:'s224', name:'Modess Sanitary Pads', category:'paper_sanitary', subcategory:'sanitary_pads', brand:'Modess', unit:'pack', packageSize:'10 pcs', quantity:20, costPrice:55, sellingPrice:60.5, lowStockThreshold:5 },
      { id:'s225', name:'Whisper Sanitary Pads', category:'paper_sanitary', subcategory:'sanitary_pads', brand:'Whisper', unit:'pack', packageSize:'10 pcs', quantity:20, costPrice:50, sellingPrice:55, lowStockThreshold:5 },

      { id:'s203', name:'Mr. Muscle Cleaner', category:'household_care', subcategory:'cleaners', brand:'Mr. Muscle', unit:'bottle', packageSize:'500mL', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s204', name:'Lysol Disinfectant', category:'household_care', subcategory:'cleaners', brand:'Lysol', unit:'bottle', packageSize:'1L', quantity:20, costPrice:150, sellingPrice:165, lowStockThreshold:5 },
      // ── Household & Home Care · Trash Bags (3) ──
      { id:'s205', name:'Champion Trash Bags', category:'household_care', subcategory:'trash_bags', brand:'Champion', unit:'pack', packageSize:'14 pcs', quantity:20, costPrice:60, sellingPrice:66, lowStockThreshold:5 },
      { id:'s206', name:'Green Trash Bags', category:'household_care', subcategory:'trash_bags', brand:'Green', unit:'pack', packageSize:'14 pcs', quantity:20, costPrice:55, sellingPrice:60.5, lowStockThreshold:5 },
      { id:'s207', name:'Ecobag Trash Bags', category:'household_care', subcategory:'trash_bags', brand:'Ecobag', unit:'pack', packageSize:'14 pcs', quantity:20, costPrice:58, sellingPrice:63.8, lowStockThreshold:5 },

      // ── Liquor, Wine & Tobacco · Wine (3) ──
      { id:'s187', name:'Moscato d\'Asti', category:'liquor_wine', subcategory:'wine', brand:'Moscato', unit:'bottle', packageSize:'750mL', quantity:20, costPrice:320, sellingPrice:352, lowStockThreshold:5 },
      { id:'s188', name:'Sangria Red Wine', category:'liquor_wine', subcategory:'wine', brand:'Sangria', unit:'bottle', packageSize:'750mL', quantity:20, costPrice:280, sellingPrice:308, lowStockThreshold:5 },
      { id:'s189', name:'Chardonnay White Wine', category:'liquor_wine', subcategory:'wine', brand:'Chardonnay', unit:'bottle', packageSize:'750mL', quantity:20, costPrice:300, sellingPrice:330, lowStockThreshold:5 },

      // ── Fresh Section · Fruits (3) ──
      { id:'s172', name:'Lakatan Banana', category:'fresh_section', subcategory:'fruits', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:70, sellingPrice:77, lowStockThreshold:5 },
      { id:'s173', name:'Carabao Mango', category:'fresh_section', subcategory:'fruits', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s174', name:'Red Apple', category:'fresh_section', subcategory:'fruits', brand:'Imported', unit:'kg', packageSize:'1kg', quantity:20, costPrice:180, sellingPrice:198, lowStockThreshold:5 },
      // ── Fresh Section · Vegetables (3) ──
      { id:'s175', name:'Kangkong', category:'fresh_section', subcategory:'vegetables', brand:'Local', unit:'bundle', packageSize:'1 bundle', quantity:20, costPrice:20, sellingPrice:22, lowStockThreshold:5 },
      { id:'s176', name:'Ampalaya', category:'fresh_section', subcategory:'vegetables', brand:'Local', unit:'kg', packageSize:'1kg', quantity:20, costPrice:60, sellingPrice:66, lowStockThreshold:5 },
      { id:'s177', name:'Sitaw', category:'fresh_section', subcategory:'vegetables', brand:'Local', unit:'bundle', packageSize:'1 bundle', quantity:20, costPrice:25, sellingPrice:27.5, lowStockThreshold:5 },

      // ── Beverages · Juice (3) ──
      { id:'s151', name:'Zesto Orange Juice', category:'beverages', subcategory:'juice', brand:'Zesto', unit:'bottle', packageSize:'1L', quantity:20, costPrice:65, sellingPrice:71.5, lowStockThreshold:5 },
      { id:'s152', name:'Tang Orange', category:'beverages', subcategory:'juice', brand:'Tang', unit:'pack', packageSize:'500g', quantity:20, costPrice:120, sellingPrice:132, lowStockThreshold:5 },
      { id:'s153', name:'Sunkist Apple Juice', category:'beverages', subcategory:'juice', brand:'Sunkist', unit:'bottle', packageSize:'1L', quantity:20, costPrice:70, sellingPrice:77, lowStockThreshold:5 },

      { id:'s136', name:'Nissin Cup Noodles Beef', category:'instant_dry_goods', subcategory:'cup_noodles', brand:'Nissin', unit:'piece', packageSize:'65g', quantity:20, costPrice:25, sellingPrice:27.5, lowStockThreshold:5 },
      { id:'s137', name:'Lucky Me! Cup Noodles', category:'instant_dry_goods', subcategory:'cup_noodles', brand:'Lucky Me!', unit:'piece', packageSize:'55g', quantity:20, costPrice:18, sellingPrice:19.8, lowStockThreshold:5 },
      { id:'s138', name:'Payless Cup Noodles', category:'instant_dry_goods', subcategory:'cup_noodles', brand:'Payless', unit:'piece', packageSize:'55g', quantity:20, costPrice:15, sellingPrice:16.5, lowStockThreshold:5 },
      // ── Instant & Dry Goods · Pasta (3) ──
      { id:'s139', name:'Royal Spaghetti', category:'instant_dry_goods', subcategory:'pasta', brand:'Royal', unit:'pack', packageSize:'500g', quantity:20, costPrice:35, sellingPrice:38.5, lowStockThreshold:5 },
      { id:'s140', name:'San Remo Spaghetti', category:'instant_dry_goods', subcategory:'pasta', brand:'San Remo', unit:'pack', packageSize:'500g', quantity:20, costPrice:40, sellingPrice:44, lowStockThreshold:5 },
      { id:'s141', name:'Del Monte Spaghetti', category:'instant_dry_goods', subcategory:'pasta', brand:'Del Monte', unit:'pack', packageSize:'500g', quantity:20, costPrice:38, sellingPrice:41.8, lowStockThreshold:5 },

    ];
  }

  // ============================================
  // PERSISTENCE
  // ============================================
  function saveState() {
    try {
      localStorage.setItem('sss_v3_settings', JSON.stringify(state.settings));
      localStorage.setItem('sss_v3_products', JSON.stringify(state.products));
      localStorage.setItem('sss_v3_sales', JSON.stringify(state.sales));
      localStorage.setItem('sss_v3_debts', JSON.stringify(state.debts));
      localStorage.setItem('sss_v3_history', JSON.stringify(state.history));
      localStorage.setItem('sss_v3_dayOpen', JSON.stringify(state.dayOpen));
      localStorage.setItem('sss_v3_dayDate', JSON.stringify(state.dayDate));
      localStorage.setItem('sss_v3_dayArchived', JSON.stringify(state.dayArchived));
      localStorage.setItem('sss_v3_todayExpenses', JSON.stringify(state.todayExpenses));
      localStorage.setItem('sss_v3_todayEarnings', JSON.stringify(state.todayEarnings));
      localStorage.setItem('sss_v3_expenseLog', JSON.stringify(state.expenseLog));
    } catch(e) { /* ignore */ }
  }

  function loadState() {
    try {
      var s;
      s = localStorage.getItem('sss_v3_settings');
      if (s) state.settings = JSON.parse(s);
      s = localStorage.getItem('sss_v3_products');
      if (s) state.products = JSON.parse(s);
      s = localStorage.getItem('sss_v3_sales');
      if (s) state.sales = JSON.parse(s);
      s = localStorage.getItem('sss_v3_debts');
      if (s) state.debts = JSON.parse(s);
      s = localStorage.getItem('sss_v3_history');
      if (s) state.history = JSON.parse(s);
      s = localStorage.getItem('sss_v3_dayOpen');
      if (s !== null) state.dayOpen = JSON.parse(s);
      s = localStorage.getItem('sss_v3_dayDate');
      if (s !== null) state.dayDate = JSON.parse(s);
      s = localStorage.getItem('sss_v3_dayArchived');
      if (s !== null) state.dayArchived = JSON.parse(s);
      s = localStorage.getItem('sss_v3_todayExpenses');
      if (s !== null) state.todayExpenses = JSON.parse(s);
      s = localStorage.getItem('sss_v3_todayEarnings');
      if (s !== null) state.todayEarnings = JSON.parse(s);
      s = localStorage.getItem('sss_v3_expenseLog');
      if (s !== null) state.expenseLog = JSON.parse(s);
    } catch(e) { /* use defaults */ }

    // V2.71: normalize the expense log (older saves have no field at all)
    if (!state.expenseLog || !Array.isArray(state.expenseLog)) state.expenseLog = [];

    // Seed sample products if none exist, or migrate from the old 17-item
    // dataset (ids start with 'p') to the new 120-item dataset (ids start with 's').
    if (!state.products || state.products.length === 0) {
      state.products = getSampleProducts();
    } else if (state.products[0] && /^p\d+$/.test(state.products[0].id)) {
      state.products = getSampleProducts();
    } else {
      // R1+R3 fix: detect stale s* DB (missing fields, unknown category, or a
      // subcategory that doesn't belong to its category) and repair it in place
      // (merge-and-correct). Wherever a stored sample row carries an invalid or
      // missing category/subcategory we restore the correct 12-key value from
      // the same-id sample so the taxonomy drill-down always matches; other
      // descriptive fields are only back-filled when missing so user edits and
      // genuinely custom (non-sample) products are preserved.
      try {
        var _sample = getSampleProducts();
        var _hasStale = false;
        var _catSet = {};
        PRODUCT_CATEGORIES.forEach(function(k){ _catSet[k]=true; });
        _catSet[''] = true;
        // Valid subcategory membership per category (used to spot mis-tagged rows).
        var _subByCat = {};
        Object.keys(PRODUCT_SUBCATEGORIES).forEach(function(cat){
          var m = {}; _subByCat[cat]=m;
          PRODUCT_SUBCATEGORIES[cat].forEach(function(sk){ m[sk]=true; });
        });
        for (var _i=0; _i < state.products.length; _i++) {
          var _p = state.products[_i];
          if (_p.category===undefined || _p.subcategory===undefined || _p.brand===undefined || _p.unit===undefined || _p.packageSize===undefined) { _hasStale=true; break; }
          if (_p.category && !_catSet[_p.category]) { _hasStale=true; break; }
          // Subcategory must exist AND belong to the product's category.
          if (_p.subcategory && _p.category && !(_subByCat[_p.category] && _subByCat[_p.category][_p.subcategory])) { _hasStale=true; break; }
        }
        if (!_hasStale && state.products.length>0 && state.products.length < Math.floor(_sample.length*0.3)) {
          var _idSet={}; state.products.forEach(function(p){ _idSet[p.id]=true; });
          var _missing=0; _sample.forEach(function(p){ if(!_idSet[p.id]) _missing++; });
          if (_missing > _sample.length*0.7) _hasStale=true;
        }
        if (_hasStale) {
          var _byId={}; state.products.forEach(function(p){ _byId[p.id]=p; });
          var _merged=[];
          var _repaired = false;
          _sample.forEach(function(sp){
            if (_byId[sp.id]) {
              var _ep=_byId[sp.id];
              var _before = (_ep.category||'') + '|' + (_ep.subcategory||'');
              // Category: restore when missing OR not a valid 12-key value.
              if (!_ep.category || (_ep.category && !_catSet[_ep.category])) _ep.category = sp.category;
              // Subcategory: restore when missing OR not valid within the (corrected) category.
              if (!_ep.subcategory || (_subByCat[_ep.category] && !_subByCat[_ep.category][_ep.subcategory])) _ep.subcategory = sp.subcategory;
              // Back-fill remaining descriptive fields only when missing.
              if (_ep.brand===undefined) _ep.brand=sp.brand;
              if (_ep.unit===undefined) _ep.unit=sp.unit;
              if (_ep.packageSize===undefined) _ep.packageSize=sp.packageSize;
              var _after = (_ep.category||'') + '|' + (_ep.subcategory||'');
              if (_before !== _after) _repaired = true;
              _merged.push(_ep); delete _byId[sp.id];
            } else { _merged.push(sp); }
          });
          Object.keys(_byId).forEach(function(k){ _merged.push(_byId[k]); });
          state.products=_merged;
          // Only write back when a stale row actually got corrected.
          if (_repaired) {
            try{ localStorage.setItem('sss_v3_products', JSON.stringify(state.products)); }catch(e){}
          }
        }
      } catch(e){}
      // R1+R4 fix: append new sample products (s121-s225) that were added to the
      // 225-product catalog but are absent from an existing (non-stale) s* store.
      // The merge-above only runs when the store is "stale", so a healthy 120-item
      // store never received the newly introduced rows. This step ONLY appends the
      // newly-added sample rows (ids s121+) that are missing; it never re-adds an
      // old product a user deliberately deleted (those ids are <= s120) and never
      // overwrites user edits or custom products already present.
      try {
        var __sample = getSampleProducts();
        var __have = {};
        state.products.forEach(function(p){ if (p && p.id) __have[p.id]=true; });
        var __newAdded = false;
        __sample.forEach(function(sp){
          var __n = sp.id && /^s(\d+)$/.exec(sp.id);
          if (!__n) return;
          if (Number(__n[1]) > 120 && !__have[sp.id]) {
            state.products.push(sp);
            __have[sp.id] = true;
            __newAdded = true;
          }
        });
        if (__newAdded) {
          try{ localStorage.setItem('sss_v3_products', JSON.stringify(state.products)); }catch(e){}
        }
      } catch(e){}
    }

    // ── Legacy debt migration: ensure createdAt, updatedAt, transactions ──
    if (state.debts) {
      state.debts.forEach(function(d) {
        if (!d.createdAt) d.createdAt = new Date().toISOString();
        if (!d.updatedAt) d.updatedAt = d.createdAt;
        if (!d.transactions) {
          d.transactions = [{
            id: genId(),
            date: d.createdAt,
            type: 'debt',
            description: 'Initial',
            amount: d.amount
          }];
        }
      });
    }
  }

  // ============================================
  // TOAST
  // ============================================
  function showToast(message, type) {
    if (!dom.toastContainer) return;
    type = type || 'success';
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  // ============================================
  // CONFIRM MODAL (replaces browser confirm())
  // ============================================
  /**
   * Shows a styled confirmation modal (replaces browser confirm()).
   * Returns a Promise that resolves to true (OK) or false (Cancel).
   */
  function showConfirmModal(message, title, okText, cancelText) {
    return new Promise(function(resolve) {
      var overlay = document.getElementById('confirmOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.id = 'confirmOverlay';
        overlay.innerHTML =
          '<div class="confirm-modal">' +
            '<div class="confirm-modal-icon">⚠️</div>' +
            '<div class="confirm-modal-title" id="confirmTitle"></div>' +
            '<div class="confirm-modal-desc" id="confirmDesc"></div>' +
            '<div class="confirm-modal-actions">' +
              '<button class="btn btn-secondary" id="confirmCancelBtn"></button>' +
              '<button class="btn btn-danger" id="confirmOkBtn"></button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(overlay);
      }
      var titleEl = document.getElementById('confirmTitle');
      var descEl = document.getElementById('confirmDesc');
      var okBtn = document.getElementById('confirmOkBtn');
      var cancelBtn = document.getElementById('confirmCancelBtn');
      if (titleEl) titleEl.textContent = title || '';
      if (descEl) descEl.textContent = message;
      if (okBtn) okBtn.textContent = okText || 'OK';
      if (cancelBtn) cancelBtn.textContent = cancelText || t('cancel');
      overlay.classList.add('open');
      function cleanup(result) {
        overlay.classList.remove('open');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onBg);
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onBg(e) { if (e.target === overlay) cleanup(false); }
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onBg);
    });
  }

  // ============================================
  // MOBILE-ONLY MODAL
  // ============================================
  var _mobileOnlyOverlay = null;

  function showMobileOnlyModal(titleKey, descKey) {
    if (!_mobileOnlyOverlay) {
      _mobileOnlyOverlay = document.createElement('div');
      _mobileOnlyOverlay.className = 'mobile-only-overlay';
      _mobileOnlyOverlay.id = 'mobileOnlyOverlay';
      _mobileOnlyOverlay.onclick = function(e) {
        if (e.target === _mobileOnlyOverlay) closeMobileOnlyModal();
      };
      document.body.appendChild(_mobileOnlyOverlay);
    }
    _mobileOnlyOverlay.innerHTML =
      '<div class="mobile-only-modal">' +
        '<div class="mobile-only-icon">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>' +
            '<line x1="12" y1="18" x2="12.01" y2="18"/>' +
          '</svg>' +
        '</div>' +
        '<div class="mobile-only-title">' + t(titleKey) + '</div>' +
        '<div class="mobile-only-desc">' + t(descKey) + '</div>' +
        '<button class="btn btn-primary btn-full" onclick="closeMobileOnlyModal()">' + t('mobileOnlyOk') + '</button>' +
      '</div>';
    _mobileOnlyOverlay.classList.add('open');
  }

  function closeMobileOnlyModal() {
    if (_mobileOnlyOverlay) _mobileOnlyOverlay.classList.remove('open');
  }

  // SETUP
  // ============================================
  function completeSetup() {
    var name = dom.setupStoreName ? dom.setupStoreName.value.trim() : '';
    var owner = dom.setupOwnerName ? dom.setupOwnerName.value.trim() : '';
    var lang = getSelectedLang(dom.setupLanguage);
    if (!name) name = 'Aking Tindahan';
    if (!owner) owner = 'May-ari';
    state.settings.storeName = name;
    state.settings.ownerName = owner;
    state.settings.language = lang;
    state.settings.hasCompletedSetup = true;
    saveState();
    if (dom.setupOverlay) dom.setupOverlay.classList.remove('open');
    updateHeader();
    showToast(t('saved'));
    // Redirect to morning page
    window.location.href = 'morning.html';
  }

  // ============================================
  // HEADER
  // ============================================
  // v2.37 (morning page only): time-of-day greeting helper
  function greetingForTime() {
    // Dev time override (0-23) shadows the real clock so the time-based
    // greeting can be tested at any hour (Developer Panel → Day State)
    var h = (devTimeOverride !== null) ? devTimeOverride : new Date().getHours();
    if (h < 12) return 'greetingMorning';
    if (h < 18) return 'greetingAfternoon';
    return 'greetingEvening';
  }

  function updateHeader() {
    // Pages with a header page title (Morning/Day, v2.37): render the title
    // from the element's own data-i18n key; other pages keep the greeting
    if (dom.headerPageTitle) {
      var titleKey = dom.headerPageTitle.getAttribute('data-i18n') || 'pageMorning';
      dom.headerPageTitle.textContent = t(titleKey);
      return;
    }
    if (dom.headerGreeting) {
      var name = state.settings.ownerName || '';
      dom.headerGreeting.textContent = t('greeting') + ' ' + name + ' \ud83d\udc4b';
    }
  }

  // ============================================
  // MORNING CHECK
  // ============================================
  function renderMorningCheck() {
    if (!dom.morningGreeting) return;
    var name = state.settings.ownerName || '';
    dom.morningGreeting.textContent = t(greetingForTime()) + ', ' + name + ' \ud83d\udc4b';
    if (dom.morningSubtitle) dom.morningSubtitle.textContent = t('morningSubtitle');

    var lowItems = getLowStockItems();
    if (lowItems.length > 0) {
      // Show out-of-stock first, then low-stock; only display top 2.
      var sorted = lowItems.slice().sort(function(a, b) {
        var sa = getStockStatus(a) === 'out' ? 0 : 1;
        var sb = getStockStatus(b) === 'out' ? 0 : 1;
        return sa - sb;
      });
      var shown = sorted.slice(0, 2);
      var moreCount = lowItems.length - shown.length;
      var warnHtml = shown.map(function(p) {
        var status = getStockStatus(p);
        var icon = status === 'out' ? '\ud83d\udd34' : '\u26a0\ufe0f';
        var label = status === 'out' ? t('noStock') : p.quantity + ' left';
        return icon + ' ' + p.name + ' \u2014 ' + label;
      }).join('<br>');
      if (moreCount > 0) {
        warnHtml += '<br><span style="color:var(--text-muted);font-size:var(--text-xs);">+' + moreCount + ' more</span>';
      }
      if (dom.morningStockTitle) dom.morningStockTitle.textContent = '\u26a0\ufe0f ' + t('stockWarn', { n: lowItems.length });
      if (dom.morningStockDesc) dom.morningStockDesc.innerHTML = warnHtml;
    } else {
      if (dom.morningStockTitle) dom.morningStockTitle.textContent = '\u2705 ' + t('stockOk');
      if (dom.morningStockDesc) dom.morningStockDesc.textContent = t('stockOkDesc');
    }

    var totalDebt = getTotalDebt();
    var debtCount = state.debts.filter(function(d) { return d.remainingBalance > 0; }).length;
    if (dom.morningDebtTitle) dom.morningDebtTitle.textContent = '\ud83d\udcb0 ' + t('debtTotal', { amount: formatCurrency(totalDebt) });
    if (dom.morningDebtDesc) dom.morningDebtDesc.textContent = t('debtTotalDesc', { n: debtCount });

    var yEarnings = getYesterdayEarnings();
    if (yEarnings !== null && dom.morningYesterdayCard) {
      dom.morningYesterdayCard.style.display = '';
      if (dom.morningYesterdayTitle) dom.morningYesterdayTitle.textContent = t('yesterday', { amount: formatCurrency(yEarnings) });
      if (dom.morningYesterdayDesc) dom.morningYesterdayDesc.textContent = t('yesterdayDesc');
    } else if (dom.morningYesterdayCard) {
      dom.morningYesterdayCard.style.display = 'none';
    }

    // ── Overdue store banner (store left open across business days) ──
    var staleOpen = isStaleOpenDay();
    var overdueCard = document.getElementById('morningOverdueCard');
    if (overdueCard) {
      if (staleOpen) {
        overdueCard.style.display = '';
        var ovTitle = document.getElementById('morningOverdueTitle');
        var ovDesc = document.getElementById('morningOverdueDesc');
        var ovBtn = document.getElementById('morningOverdueReviewBtn');
        if (ovTitle) ovTitle.textContent = '\u26a0\ufe0f ' + t('overdueTitle');
        if (ovDesc) ovDesc.textContent = t('overdueDesc', {
          date: formatDate(new Date(state.dayDate + 'T00:00:00')),
          n: getDaysOpen()
        });
        if (ovBtn) ovBtn.textContent = t('overdueReview');
      } else {
        overdueCard.style.display = 'none';
      }
    }

    // Determine which button to show based on state
    if (staleOpen) {
      // Previous day was never closed → offer to close it and start today
      if (dom.btnStartDay) {
        dom.btnStartDay.innerHTML = '<span>' + t('overdueCloseStart') + '</span>';
        dom.btnStartDay.onclick = closeStaleDayAndStartToday;
      }
    } else if (state.dayOpen) {
      // Day is currently open → show Close Store
      if (dom.btnStartDay) {
        dom.btnStartDay.innerHTML = '<span>' + t('closeDay') + ' \ud83c\udf19</span>';
        dom.btnStartDay.onclick = showClosingScreen;
      }
    } else if (!state.dayOpen && state.dayDate === todayStr() && !state.dayArchived) {
      // Day was closed today but not archived AND has sales → show Edit Closing
      if (dom.btnStartDay) {
        dom.btnStartDay.innerHTML = '<span>\uD83D\uDCDD Edit Today\'s Closing</span>';
        dom.btnStartDay.onclick = reopenClosing;
      }
    } else {
      // Default: Start the Day
      if (dom.btnStartDay) {
        dom.btnStartDay.innerHTML = '<span>' + t('startDay') + '</span>';
        dom.btnStartDay.onclick = startDay;
      }
    }
    // Restock reminder
    var restockCard = document.getElementById('morningRestockCard');
    if (restockCard) {
      var days = getDaysSinceLastRestock();
      if (days < 0 || days === 0 || days === 1) {
        restockCard.style.display = 'none';
      } else {
        restockCard.style.display = '';
        var restockTitle = document.getElementById('morningRestockTitle');
        var restockDesc = document.getElementById('morningRestockDesc');
        if (restockTitle) restockTitle.textContent = '🚚 Restock Reminder';
        if (restockDesc) restockDesc.textContent = days + ' day(s) since restock. Tap to check inventory!';
      }
    }
    // ML urgent-restock card (Stage 4) — top restocks to buy, 7-day window.
    var fcCard = document.getElementById('morningForecastCard');
    if (fcCard) {
      var urgentHtml = '';
      if (window.ForecastEngine) {
        try {
          var fcSales = window.ForecastEngine.buildAllSalesFromWeb(state);
          var urgent = window.ForecastEngine.urgentRestocks(state.products, fcSales, todayStr(), 7, 5);
          urgentHtml = forecastUrgentCardHtml(urgent, 'forecastRestockSoonTitle', 'forecastRestockSoonDesc');
        } catch(e) { urgentHtml = ''; }
      }
      fcCard.innerHTML = urgentHtml;
      fcCard.style.display = urgentHtml ? '' : 'none';
    }
    updateHeader();
  }

  // ============================================
  // START DAY
  // ============================================
  function startDay() {
    if (state.dayOpen) {
      showToast(t('dayAlreadyOpen'));
      return;
    }
    // If starting a day on an earlier date than the last business day, archive old sales.
    // Uses `<` (not `!==`) so a device clock moved backward never archives a "future" day.
    if (state.dayDate && state.dayDate < todayStr()) {
      archiveDaySales();
    }
    state.dayDate = todayStr();
    state.dayArchived = false;
    state.dayOpen = true;
    state.todayExpenses = 0;
    state.todayEarnings = 0;
    saveState();
    window.location.href = 'day.html';
  }

  function showMorningCheck() {
    window.location.href = 'morning.html';
  }

  // ============================================
  // OVERDUE STORE (left open across business days)
  // ============================================
  function closeStaleDayAndStartToday() {
    if (!isStaleOpenDay()) return;
    // Dev-override safety: with an override active, this archives the previous
    // day's sales into REAL persisted history. Warn that closing the tab before
    // clearing the override makes the change permanent (no snapshot to restore).
    if (devDateOverride && !confirm(t('overdueDevConfirm'))) return;
    // Save the previous day's sales to history (nothing is lost)
    archiveDaySales();
    // Open a fresh day for today
    state.dayDate = todayStr();
    state.dayArchived = false;
    state.dayOpen = true;
    state.todayExpenses = 0;
    state.todayEarnings = 0;
    saveState();
    showToast(t('overdueArchivedToast'));
    // Small delay so the confirmation toast is visible before navigating
    setTimeout(function() { window.location.href = 'day.html'; }, 900);
  }

  // Show the previous (stale) day's sales so the owner can see what was recorded
  function openOverdueReview() {
    if (!state.dayDate) return;
    var staleDate = state.dayDate;
    var staleSales = state.sales.filter(function(s) { return s.date === staleDate; });
    // If the stale day was already archived (e.g. dev-panel Start New Day),
    // fall back to the archived sales copy kept in history.
    if (staleSales.length === 0 && state.history) {
      var h = state.history.find(function(x) { return x.date === staleDate; });
      if (h && h.archivedSales) staleSales = h.archivedSales;
    }
    var listEl = document.getElementById('overdueReviewList');
    var totalEl = document.getElementById('overdueReviewTotal');
    if (listEl) {
      if (staleSales.length === 0) {
        listEl.innerHTML = '<div class="empty-state" style="padding:12px 0;">' + t('overdueReviewEmpty') + '</div>';
      } else {
        listEl.innerHTML = staleSales.map(function(s) {
          return '<div class="closing-item">' +
            '<span class="closing-item-name">' + s.productName + ' \u00d7 ' + (s.quantity || 1) + '</span>' +
            '<span class="closing-item-value success">' + formatCurrency(s.amount) + '</span>' +
          '</div>';
        }).join('');
      }
    }
    var total = staleSales.reduce(function(sum, s) { return sum + (s.amount || 0); }, 0);
    if (totalEl) totalEl.textContent = t('overdueReviewTotal') + ': ' + formatCurrency(total);
    var ov = document.getElementById('overdueReviewOverlay');
    if (ov) ov.classList.add('open');
  }

  function closeOverdueReview() {
    var ov = document.getElementById('overdueReviewOverlay');
    if (ov) ov.classList.remove('open');
  }

  // ============================================
  // DAY MODE
  // ============================================
  function renderDayMode() {
    if (!dom.dayDate) return;
    // Show the simulated date when a dev date override is active
    dom.dayDate.textContent = formatDate(devDateOverride ? new Date(devDateOverride + 'T00:00:00') : new Date());

    var earnings = getTodayEarnings() + state.todayEarnings;
    var items = getTodayItemsSold();
    var utang = getTodayUtang();

    if (dom.dayEarnings) dom.dayEarnings.textContent = formatCurrency(earnings);
    if (dom.dayItemsSold) dom.dayItemsSold.textContent = items;
    if (dom.dayUtang) dom.dayUtang.textContent = formatCurrency(utang);
    if (dom.dayExpensesTotal) dom.dayExpensesTotal.textContent = formatCurrency(getTodayExpensesTotal());

    if (dom.dayTransactionList) {
      var todaySales = getTodaySales();
      if (todaySales.length === 0) {
        dom.dayTransactionList.innerHTML = '<div class="empty-state">' + t('noTransactions') + '</div>';
      } else {
        dom.dayTransactionList.innerHTML = todaySales.slice().reverse().map(function(s) {
          var isDebt = !!s.customerName;
          var timeAgo = '';
          if (s.createdAt) {
            var mins = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 60000);
            if (mins < 1) timeAgo = 'ngayon lang';
            else if (mins < 60) timeAgo = mins + 'm';
            else timeAgo = Math.floor(mins / 60) + 'h';
          }
          return '<div class="transaction-item">' +
            '<div class="transaction-icon ' + (isDebt ? 'debt' : 'sale') + '">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                (isDebt
                  ? '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/>'
                  : '<polyline points="20 6 9 17 4 12"/>') +
              '</svg>' +
            '</div>' +
            '<div class="transaction-info">' +
              '<div class="transaction-name">' + (s.productName || 'Unknown') + '</div>' +
              '<div class="transaction-meta">' + timeAgo +
                (isDebt ? ' <span class="transaction-customer">' + s.customerName + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<div class="transaction-amount' + (isDebt ? ' debt-amount' : '') + '">' +
              formatCurrency(s.amount) +
            '</div>' +
          '</div>';
        }).join('');
      }
    }
  }

  // ============================================
  // TOGGLE DAY TRANSACTIONS
  // ============================================
  function toggleDayTransactions() {
    var el = document.getElementById('dayTransactions');
    if (el) el.classList.toggle('collapsed');
  }

  // ============================================
  // SALE SHEET
  // ============================================
  /** Tapped an out-of-stock suggestion — inform only, no selection (v2.58). */
  function selectProductOutOfStock() {
    showToast(t('noStock'), 'error');
  }

  // Multi-item checkout state (v2.63): the in-progress cart and its payment
  // method. These are session-only — they never persist across a reload, and a
  // completed transaction clears them. Sale records store the shared
  // transactionId + paymentMethod for the whole group.
  var saleCart = [];
  var salePayment = 'cash'; // 'cash' | 'credit'

  /** v2.64: the checkout is its own page — the "Benta" action navigates to it. */
  // Overdue guard (web v2.35 parity, same as showClosingScreen/navigateToDayMode):
  // a closed store OR an open-but-stale day (left open from a previous calendar
  // day) must NOT leave for checkout.html — block here with the existing alert
  // instead of bouncing through the checkout page's init guard (v2.64 regression:
  // the Sell button used to reach checkout before being redirected back).
  function openSaleSheet() {
    if (!state.dayOpen || isStaleOpenDay()) {
      showToast(state.dayOpen ? t('overdueRedirect') : t('dayNotOpen'));
      return;
    }
    closePaymentSheet();
    if (pageName === 'checkout') {
      // Already on the checkout page: start a fresh session in place — but
      // never silently drop an in-progress cart.
      if (saleCart.length > 0) {
        showConfirmModal(t('discardCartMsg'), t('discardCart')).then(function(ok) {
          if (!ok) return;
          resetSaleForm();
          if (dom.saleProductName) dom.saleProductName.focus();
        });
        return;
      }
      resetSaleForm();
      if (dom.saleProductName) dom.saleProductName.focus();
      return;
    }
    window.location.href = 'checkout.html';
  }

  /** Resets the checkout form to a fresh session (used on checkout.html load). */
  function resetSaleForm() {
    saleCart = [];
    salePayment = 'cash';
    state.selectedProduct = null;
    if (dom.saleProductName) dom.saleProductName.value = '';
    if (dom.saleQty) dom.saleQty.value = '1';
    if (dom.saleCustomer) dom.saleCustomer.value = '';
    if (dom.saleTotalAmount) dom.saleTotalAmount.textContent = '\u20b10.00';
    if (dom.saleStockHint) dom.saleStockHint.textContent = '';
    if (dom.productSuggestions) dom.productSuggestions.classList.remove('open');
    if (dom.customerSuggestions) dom.customerSuggestions.classList.remove('open');
    hideCreditWarn('saleCreditWarn');
    if (dom.saleAllowAnyway) dom.saleAllowAnyway.style.display = 'none';
    setSalePayment('cash');
    renderSaleCart();
    // Disable qty-selector until a product is selected
    var qtySelector = document.querySelector('.qty-selector');
    if (qtySelector) qtySelector.classList.add('disabled');
  }

  function closeSaleSheet() {
    // On the standalone checkout page, "close" means go back to Day.
    // Never silently drop an in-progress multi-item cart (v2.63).
    if (pageName === 'checkout') {
      leaveCheckout('day.html');
      return;
    }
    // Legacy callers (e.g. openPaymentSheet) still close the old overlay if present.
    hideCreditWarn('saleCreditWarn');
    if (dom.saleAllowAnyway) dom.saleAllowAnyway.style.display = 'none';
    if (dom.saleSheetOverlay) dom.saleSheetOverlay.classList.remove('open');
  }

  /** v2.64: navigate away from the checkout page, guarding an in-progress cart. */
  function leaveCheckout(dest) {
    if (saleCart.length > 0) {
      showConfirmModal(t('discardCartMsg'), t('discardCart')).then(function(ok) {
        if (!ok) return;
        window.location.href = dest;
      });
      return;
    }
    window.location.href = dest;
  }

  window.checkoutSelectedCategory = '';
  window.checkoutSelectedSubcategory = '';
  var checkoutSelectedCategory = window.checkoutSelectedCategory;
  var checkoutSelectedSubcategory = window.checkoutSelectedSubcategory;
  window.__checkoutFilter = {
    getCategory: function(){ return checkoutSelectedCategory; },
    getSub: function(){ return checkoutSelectedSubcategory; },
    setCategory: function(v){ checkoutSelectedCategory = v; window.checkoutSelectedCategory = v; },
    setSub: function(v){ checkoutSelectedSubcategory = v; window.checkoutSelectedSubcategory = v; }
  };
  window.clearCheckoutProductSelection = function(silent){
    var _prev='';
    try{ _prev = state.selectedProduct && state.selectedProduct.name || ''; }catch(e){}
    try{ state.selectedProduct = null; }catch(e){}
    try{
      if(dom.saleProductName){
        var _cur = dom.saleProductName.value;
        var _focused=false;
        try{ _focused=(document.activeElement===dom.saleProductName); }catch(e){}
        var _sm=false;
        try{ var _sc=document.getElementById('checkoutSearchControl'); _sm=_sc && _sc.classList.contains('search-mode'); }catch(e){}
        if(silent && _cur && _focused && _sm && (!_prev || _cur!==_prev)){
        } else { dom.saleProductName.value=''; }
        if(silent && _focused && _sm){ try{ dom.saleProductName.focus(); }catch(e){} }
      }
    }catch(e){}
    try{ if(dom.saleStockHint) dom.saleStockHint.textContent = ''; }catch(e){}
    try{ if(dom.saleQty) dom.saleQty.value = '1'; }catch(e){}
    try{ if(dom.productSuggestions && !silent) dom.productSuggestions.classList.remove('open'); }catch(e){}
    try{ var qs=document.querySelector('.qty-selector'); if(qs) qs.classList.add('disabled'); }catch(e){}
    try{ updateSaleTotal(); }catch(e){}
  };

  // Shared bilingual hay builder — single source for checkout + inventory search.
  // Covers name + categoryEn/Fil + subcategoryEn/Fil + brand + unitEn/Fil + packageSize.
  // Keeps checkout suggestions === inventory list for same q/cat/sub (bilingual "pampalasa"/"condiments").
  function buildProductSearchHay(p) {
    var hay = p.name ? p.name.toLowerCase() : '';
    if (p.category) {
      var _ck = p.category;
      var _catMap = {pantry_staples:'catPantryStaples',canned_goods:'catCannedGoods',instant_dry_goods:'catInstantDryGoods',snacks_sweets:'catSnacksSweets',beverages:'catBeverages',dairy_refrigerated:'catDairyRefrigerated',fresh_section:'catFreshSection',liquor_wine:'catLiquorWine',personal_care:'catPersonalCare',household_care:'catHouseholdCare',baby_care:'catBabyCare',paper_sanitary:'catPaperSanitary'};
      var _catKey = _catMap[_ck] || 'catOther';
      hay += ' ' + _ck.toLowerCase();
      try { if (strings.en[_catKey]) hay += ' ' + strings.en[_catKey].toLowerCase(); } catch(e){}
      try { if (strings.fil[_catKey]) hay += ' ' + strings.fil[_catKey].toLowerCase(); } catch(e){}
      try { var _cur = productCategoryLabel(_ck).toLowerCase(); if (_cur && hay.indexOf(_cur)===-1) hay += ' ' + _cur; } catch(e){}
    }
    if (p.subcategory) {
      var _sk = p.subcategory;
      var _subMap = {rice:'subRice',cooking_oil:'subCookingOil',sugar:'subSugar',salt:'subSalt',vinegar:'subVinegar',bread:'subBread',sardines:'subSardines',corned_beef:'subCornedBeef',tuna:'subTuna',meat_loaf:'subMeatLoaf',sausage:'subSausage',instant_noodles:'subInstantNoodles',cup_noodles:'subCupNoodles',pasta:'subPasta',soup_mixes:'subSoupMixes',chips:'subChips',crackers:'subCrackers',candies:'subCandies',chocolates:'subChocolates',cookies:'subCookies',coffee_mix:'subCoffeeMix',powdered_milk:'subPowderedMilk',chocolate_drink:'subChocolateDrink',juice:'subJuice',soft_drinks:'subSoftDrinks',bottled_water:'subBottledWater',cheese:'subCheese',butter:'subButter',margarine:'subMargarine',chilled_meats:'subChilledMeats',fresh_meat:'subFreshMeat',fresh_seafood:'subFreshSeafood',fruits:'subFruits',vegetables:'subVegetables',eggs:'subEggs',beer:'subBeer',gin:'subGin',brandy:'subBrandy',wine:'subWine',cigarettes:'subCigarettes',shampoo:'subShampoo',conditioner:'subConditioner',bath_soap:'subBathSoap',toothpaste:'subToothpaste',toothbrush:'subToothbrush',lotion:'subLotion',cosmetics:'subCosmetics',laundry:'subLaundry',fabric_softener:'subFabricSoftener',dishwashing:'subDishwashing',cleaners:'subCleaners',trash_bags:'subTrashBags',mosquito_control:'subMosquitoControl',diapers:'subDiapers',baby_wipes:'subBabyWipes',baby_toiletries:'subBabyToiletries',tissue:'subTissue',paper_towels:'subPaperTowels',sanitary_pads:'subSanitaryPads'};
      var _subKey = _subMap[_sk];
      hay += ' ' + _sk.toLowerCase();
      if (_subKey) {
        try { if (strings.en[_subKey]) hay += ' ' + strings.en[_subKey].toLowerCase(); } catch(e){}
        try { if (strings.fil[_subKey]) hay += ' ' + strings.fil[_subKey].toLowerCase(); } catch(e){}
      }
      try { var _curSub = productSubcategoryLabel(_sk).toLowerCase(); if (_curSub && hay.indexOf(_curSub)===-1) hay += ' ' + _curSub; } catch(e){}
    }
    if (p.brand) hay += ' ' + p.brand.toLowerCase();
    if (p.unit) {
      var _uk = p.unit;
      var _unitMap = {piece:'unitPiece',sachet:'unitSachet',pack:'unitPack',box:'unitBox',bottle:'unitBottle',can:'unitCan',kg:'unitKg',g:'unitG',L:'unitL',mL:'unitMl',bundle:'unitBundle',dozen:'unitDozen',sack:'unitSack',loaf:'unitLoaf',tube:'unitTube',bar:'unitBar',sticks:'unitSticks'};
      var _unitKey = _unitMap[_uk] || _uk;
      hay += ' ' + _uk.toLowerCase();
      try { if (strings.en[_unitKey]) hay += ' ' + strings.en[_unitKey].toLowerCase(); } catch(e){}
      try { if (strings.fil[_unitKey]) hay += ' ' + strings.fil[_unitKey].toLowerCase(); } catch(e){}
      try { var _curU = productUnitLabel(_uk).toLowerCase(); if (_curU && hay.indexOf(_curU)===-1) hay += ' ' + _curU; } catch(e){}
    }
    if (p.packageSize) hay += ' ' + p.packageSize.toLowerCase();
    return hay;
  }

  function getCheckoutFilteredProducts(query, category, subcategory) {
    // allow direct window mutations to feed closure (bridge)
    try { if (!category && !subcategory && typeof window.checkoutSelectedCategory === 'string') { category = window.checkoutSelectedCategory; subcategory = window.checkoutSelectedSubcategory; checkoutSelectedCategory = category; checkoutSelectedSubcategory = subcategory; } } catch(e){}
    var byCategory;
    if (subcategory) byCategory = state.products.filter(function(p){ return p.subcategory === subcategory; });
    else if (category) byCategory = state.products.filter(function(p){ return p.category === category; });
    else byCategory = state.products;
    if (!query) return byCategory;
    var q = query.toLowerCase();
    return byCategory.filter(function(p){ return buildProductSearchHay(p).includes(q); });
  }
  function onProductSearch() {
    // sync checkout window -> closure (morph bridge)
    try { if (typeof window.checkoutSelectedCategory === 'string') checkoutSelectedCategory = window.checkoutSelectedCategory; if (typeof window.checkoutSelectedSubcategory === 'string') checkoutSelectedSubcategory = window.checkoutSelectedSubcategory; } catch(e){}
    if (!dom.saleProductName || !dom.productSuggestions) return;
    var query = dom.saleProductName.value.toLowerCase().trim();
    var hasCategory = !!(checkoutSelectedCategory || checkoutSelectedSubcategory);
    if (!query && !hasCategory) {
      dom.productSuggestions.classList.remove('open');
      return;
    }
    var matches = getCheckoutFilteredProducts(query, checkoutSelectedCategory, checkoutSelectedSubcategory);
    // Stage 5 — Checkout vs Inventory vs Native trichotomy:
    // Inventory (renderManageInventory): no cap, alpha sort localeCompare.
    // Checkout (here): cap 8 + outOfStockLast, matching the native CheckoutScreen
    // suggestions card (filteredProducts … .take(8)), which shows no overflow row.
    matches.sort(function(a, b) {
      var ao = a.quantity <= 0 ? 1 : 0;
      var bo = b.quantity <= 0 ? 1 : 0;
      return (ao - bo) || a.name.localeCompare(b.name);
    });
    matches = matches.slice(0, 8);
    if (matches.length === 0) {
      dom.productSuggestions.classList.remove('open');
      return;
    }
    // Row markup mirrors the native suggestions card: name, brand·size subline,
    // a colour-coded stock line (⛔ / ⚠️ N left / ✅ N left) and the price.
    dom.productSuggestions.innerHTML = matches.map(function(p) {
      var status = getStockStatus(p);
      var out = status === 'out';
      var low = status === 'low';
      var click = out ? 'window.selectProductOutOfStock()' : 'window.selectProduct(\'' + p.id + '\')';
      var subline = productSubline(p);
      var stock = out
        ? '<div class="product-suggestion-stock out">\u26d4 ' + t('noStock') + '</div>'
        : '<div class="product-suggestion-stock ' + (low ? 'low' : 'ok') + '">' +
            (low ? '\u26a0\ufe0f ' : '\u2705 ') + p.quantity + ' left</div>';
      return '<div class="product-suggestion-item' + (out ? ' disabled' : '') + '" onclick="' + click + '">' +
        '<div class="product-suggestion-info">' +
          '<div class="product-suggestion-name">' + p.name + '</div>' +
          (subline ? '<div class="product-suggestion-brand">' + subline + '</div>' : '') +
          stock +
        '</div>' +
        '<div class="product-suggestion-price">' + formatCurrency(p.sellingPrice) + '</div>' +
      '</div>';
    }).join('');
    dom.productSuggestions.classList.add('open');
  }

  function selectProduct(id) {
    var product = state.products.find(function(p) { return p.id === id; });
    if (!product) return;
    // Defensive: never select an out-of-stock product (v2.58)
    if (product.quantity <= 0) {
      showToast(t('noStock'), 'error');
      return;
    }
    state.selectedProduct = product;
    if (dom.saleProductName) dom.saleProductName.value = product.name;
    if (dom.productSuggestions) dom.productSuggestions.classList.remove('open');
    try { if (window.__checkoutCloseDropdown) window.__checkoutCloseDropdown(); } catch(e){}
    // Enable qty-selector now that a product is selected
    var qtySelector = document.querySelector('.qty-selector');
    if (qtySelector) qtySelector.classList.remove('disabled');
    updateSaleTotal();
  }

  function adjustQty(delta) {
    if (!state.selectedProduct) return;
    if (!dom.saleQty) return;
    var qty = parseInt(dom.saleQty.value) || 1;
    qty = Math.max(1, qty + delta);
    // Clamp to available stock so the + button can't exceed inventory (Issue 3 fix)
    qty = Math.min(qty, state.selectedProduct.quantity);
    dom.saleQty.value = qty;
    updateSaleTotal();
  }

  function onQtyChange() {
    if (!state.selectedProduct || !dom.saleQty) return;
    var qty = parseInt(dom.saleQty.value) || 1;
    // Clamp to valid range: 1 to available stock
    qty = Math.max(1, Math.min(qty, state.selectedProduct.quantity));
    dom.saleQty.value = qty;
    updateSaleTotal();
  }

  function updateSaleTotal() {
    var product = state.selectedProduct;
    var qty = parseInt(dom.saleQty ? dom.saleQty.value : 1) || 1;
    if (product) {
      var total = product.sellingPrice * qty;
      if (dom.saleStockHint) {
        if (product.quantity <= 0) {
          dom.saleStockHint.textContent = '\ud83d\udd34 ' + t('noStock');
        } else if (qty > product.quantity) {
          dom.saleStockHint.textContent = '\u26a0\ufe0f ' + t('stockHint', { qty: product.quantity }) + ' \u2014 ' + t('noStock');
        } else {
          dom.saleStockHint.textContent = '\u2705 ' + t('stockHint', { qty: product.quantity }) + ' \u00b7 ' + t('lineSubtotal') + ': ' + formatCurrency(total);
        }
      }
    } else {
      if (dom.saleStockHint) dom.saleStockHint.textContent = '';
    }
    updateCreditWarn();
  }

  /** Balance badge for customer suggestions: "₱bal / ₱limit" color-coded by utilization (v2.56). */
  function suggestionBalanceHtml(name, balance) {
    var limit = getEffectiveCreditLimit(name);
    var cls = 'customer-suggestion-balance';
    if (limit > 0 && balance > 0) {
      cls += balance >= limit ? ' over' : (balance >= limit * 0.8 ? ' near' : '');
    } else if (balance === 0) {
      cls += ' settled';
    }
    var txt;
    if (limit > 0) {
      txt = formatCurrency(balance) + ' / ' + formatCurrency(limit);
    } else {
      txt = balance > 0
        ? t('debtTotal', { amount: formatCurrency(balance) })
        : '\u2714\uFE0F ' + t('payBalance', { amount: formatCurrency(0) });
    }
    return '<span class="' + cls + '">' + txt + '</span>';
  }

  function onCustomerSearch() {
    updateCreditWarn();
    if (!dom.saleCustomer || !dom.customerSuggestions) return;
    var query = dom.saleCustomer.value.toLowerCase().trim();
    if (!query) {
      dom.customerSuggestions.classList.remove('open');
      return;
    }
    var names = {};
    state.debts.forEach(function(d) { names[d.customerName] = true; });
    state.sales.forEach(function(s) { if (s.customerName) names[s.customerName] = true; });
    var matches = Object.keys(names).filter(function(n) {
      return n.toLowerCase().includes(query);
    }).slice(0, 5);

    if (matches.length === 0) {
      dom.customerSuggestions.classList.remove('open');
      return;
    }

    // Build debt balance lookup map
    var debtBalances = {};
    state.debts.forEach(function(d) {
      if (d.remainingBalance > 0) {
        debtBalances[d.customerName] = (debtBalances[d.customerName] || 0) + d.remainingBalance;
      }
    });

    dom.customerSuggestions.innerHTML = matches.map(function(name) {
      var balance = debtBalances[name] || 0;
      return '<div class="customer-suggestion-item" onclick="window.selectCustomer(\'' + name.replace(/'/g, "\\'") + '\')">' +
        '<span class="customer-suggestion-name">' + name + '</span>' +
        suggestionBalanceHtml(name, balance) +
        '</div>';
    }).join('');
    dom.customerSuggestions.classList.add('open');
  }

  function selectCustomer(name) {
    if (dom.saleCustomer) dom.saleCustomer.value = name;
    if (dom.customerSuggestions) dom.customerSuggestions.classList.remove('open');
    updateCreditWarn();
  }

  // ── Credit-limit warnings (v2.56) ────────────────────────────────────
  /** Warning key by status: over limit → over/at-limit message, else near. */
  function creditWarnKey(cs) {
    return cs.overLimit ? (cs.total > cs.limit ? 'creditWarnOver' : 'creditWarnAtLimit') : 'creditWarnNear';
  }

  function creditWarnMessage(key, cs, name) {
    if (key === 'creditWarnNear') return t('creditWarnNear', { limit: formatCurrency(cs.limit) });
    if (key === 'creditWarnAtLimit') return t('creditWarnAtLimit', { name: esc(name), limit: formatCurrency(cs.limit) });
    return t('creditWarnOver', { name: esc(name), total: formatCurrency(cs.total), limit: formatCurrency(cs.limit) });
  }

  function showCreditWarn(elId, key, cs, name) {
    var el = dom[elId];
    if (!el) return;
    el.innerHTML = creditWarnMessage(key, cs, name);
    el.style.display = 'block';
  }

  function hideCreditWarn(elId) {
    var el = dom[elId];
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  }

  /** Live warning for the Day sale sheet — recomputed as cart/customer/payment change. */
  function updateCreditWarn() {
    if (!dom.saleCreditWarn) return;
    if (dom.saleAllowAnyway) dom.saleAllowAnyway.style.display = 'none';
    if (salePayment !== 'credit') { hideCreditWarn('saleCreditWarn'); return; }
    var customer = dom.saleCustomer ? dom.saleCustomer.value.trim() : '';
    if (!customer) { hideCreditWarn('saleCreditWarn'); return; }
    // The warning is based on the whole transaction total, not one line.
    var amount = getCartTotal();
    var cs = getCreditStatus(customer, amount);
    if (cs.overLimit) {
      showCreditWarn('saleCreditWarn', creditWarnKey(cs), cs, customer);
      if (dom.saleAllowAnyway) dom.saleAllowAnyway.style.display = 'block';
    } else if (cs.nearLimit) {
      showCreditWarn('saleCreditWarn', 'creditWarnNear', cs, customer);
    } else {
      hideCreditWarn('saleCreditWarn');
    }
  }

  // ── Multi-item checkout (v2.63) ──────────────────────────────────────
  /** Line preview subtotal for the currently selected product. */
  function addToCart() {
    var product = state.selectedProduct;
    if (!product) {
      try{
        var hasFilter = !!(checkoutSelectedCategory || checkoutSelectedSubcategory || window.checkoutSelectedCategory || window.checkoutSelectedSubcategory);
        if(hasFilter){
          if(typeof onProductSearch==='function') onProductSearch();
          try{ var _ps=document.getElementById('productSuggestions'); if(_ps && !_ps.classList.contains('open')){ _ps.classList.add('open'); setTimeout(function(){ try{ _ps.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(_){} },60); } else if(_ps){ setTimeout(function(){ try{ _ps.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(_){} },60); } }catch(_){}
          var lbl='';
          try{ var sub=window.checkoutSelectedSubcategory||checkoutSelectedSubcategory; var cat=window.checkoutSelectedCategory||checkoutSelectedCategory; if(sub) lbl=productSubcategoryLabel(sub); else if(cat) lbl=productCategoryLabel(cat); }catch(e){}
          if(lbl) {
            try{
              var _q2 = (dom.saleProductName && dom.saleProductName.value || '').toLowerCase().trim();
              var _c2 = checkoutSelectedCategory || window.checkoutSelectedCategory || '';
              var _s2 = checkoutSelectedSubcategory || window.checkoutSelectedSubcategory || '';
              var _m2 = typeof getCheckoutFilteredProducts==='function' ? getCheckoutFilteredProducts(_q2, _c2, _s2) : [];
              if(_m2 && _m2.length===0){ showToast(t('noProductsInList', {label: lbl}), 'error'); return; }
            }catch(e){}
            showToast(t('selectFromList', {label: lbl}), 'error');
            return;
          }
        }
      }catch(e){}
      showToast(t('selectProductFirst'), 'error');
      return;
    }
    var qty = parseInt(dom.saleQty ? dom.saleQty.value : 1) || 1;
    if (qty <= 0) {
      showToast('Ilagay ang tamang dami.', 'error');
      return;
    }
    if (qty > product.quantity) {
      showToast('Only ' + product.quantity + ' available', 'error');
      return;
    }
    // Merge with an existing cart line for the same product (never exceed stock)
    var existing = saleCart.find(function(l) { return l.productId === product.id; });
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.quantity);
    } else {
      saleCart.push({
        productId: product.id,
        name: product.name,
        brand: product.brand || '',
        unit: product.unit || '',
        packageSize: product.packageSize || '',
        price: product.sellingPrice,
        costPrice: product.costPrice || 0,
        qty: qty
      });
    }
    // Reset the picker so the next item can be added
    state.selectedProduct = null;
    if (dom.saleProductName) dom.saleProductName.value = '';
    if (dom.saleQty) dom.saleQty.value = '1';
    if (dom.saleStockHint) dom.saleStockHint.textContent = '';
    if (dom.productSuggestions) dom.productSuggestions.classList.remove('open');
    var qtySelector = document.querySelector('.qty-selector');
    if (qtySelector) qtySelector.classList.add('disabled');
    renderSaleCart();
    showToast(t('addedToCart'));
  }

  function cartAdjustQty(index, delta) {
    var line = saleCart[index];
    if (!line) return;
    var product = state.products.find(function(p) { return p.id === line.productId; });
    var max = product ? product.quantity : line.qty;
    line.qty = Math.max(1, Math.min(line.qty + delta, max));
    renderSaleCart();
  }

  function cartRemoveLine(index) {
    saleCart.splice(index, 1);
    renderSaleCart();
    showToast(t('itemRemoved'));
  }

  function getCartTotal() {
    return saleCart.reduce(function(sum, l) { return sum + (l.price * l.qty); }, 0);
  }

  /** Renders the cart list, count badge, empty state, and the transaction total. */
  function renderSaleCart() {
    if (!dom.saleCartSection) return;
    var hasItems = saleCart.length > 0;
    dom.saleCartSection.style.display = 'block';
    if (dom.saleCartEmpty) dom.saleCartEmpty.style.display = hasItems ? 'none' : 'block';
    if (dom.saleCartList) dom.saleCartList.style.display = hasItems ? 'block' : 'none';
    if (dom.saleCartCount) dom.saleCartCount.textContent = saleCart.length;
    if (dom.saleCartList) {
      dom.saleCartList.innerHTML = saleCart.map(function(line, i) {
        var sub = '';
        if (line.brand) {
          sub = esc(line.brand);
          if (line.packageSize) sub += ' \u00b7 ' + esc(line.packageSize);
          else if (line.unit && line.unit !== 'piece') sub += ' \u00b7 ' + esc(productUnitLabel(line.unit));
        }
        return '<div class="sale-cart-line">' +
          '<div class="sale-cart-line-info">' +
            '<div class="sale-cart-line-name">' + esc(line.name) + '</div>' +
            (sub ? '<div class="sale-cart-line-sub">' + sub + '</div>' : '') +
            '<div class="sale-cart-line-price">' + formatCurrency(line.price) + ' ' + t('eachLabel') + '</div>' +
          '</div>' +
          '<div class="sale-cart-line-qty">' +
            '<button class="qty-btn" onclick="cartAdjustQty(' + i + ', -1)">\u2212</button>' +
            '<input type="number" class="qty-input qty-input-editable" value="' + line.qty + '" min="1" onchange="cartSetQty(' + i + ', this.value)">' +
            '<button class="qty-btn" onclick="cartAdjustQty(' + i + ', 1)">+</button>' +
          '</div>' +
          '<div class="sale-cart-line-subtotal">' + formatCurrency(line.price * line.qty) + '</div>' +
          '<button class="sale-cart-line-remove" onclick="cartRemoveLine(' + i + ')" title="' + t('itemRemoved') + '">\u2715</button>' +
        '</div>';
      }).join('');
    }
    if (dom.saleTotalAmount) dom.saleTotalAmount.textContent = formatCurrency(getCartTotal());
    updateCreditWarn();
  }

  function cartSetQty(index, value) {
    var line = saleCart[index];
    if (!line) return;
    var qty = parseInt(value) || 1;
    var product = state.products.find(function(p) { return p.id === line.productId; });
    line.qty = Math.max(1, Math.min(qty, product ? product.quantity : qty));
    renderSaleCart();
  }

  /** Switches the payment method (Cash / Credit) and toggles the customer field. */
  function setSalePayment(method) {
    salePayment = method === 'credit' ? 'credit' : 'cash';
    if (dom.salePayCash) dom.salePayCash.classList.toggle('active', salePayment === 'cash');
    if (dom.salePayCredit) dom.salePayCredit.classList.toggle('active', salePayment === 'credit');
    if (dom.saleCustomerWrap) dom.saleCustomerWrap.style.display = salePayment === 'credit' ? 'block' : 'none';
    if (dom.salePhoneWrap) dom.salePhoneWrap.style.display = salePayment === 'credit' ? 'block' : 'none';
    if (dom.saleCustomer && salePayment === 'cash') {
      dom.saleCustomer.value = '';
      if (dom.customerSuggestions) dom.customerSuggestions.classList.remove('open');
    }
    if (dom.salePhone && salePayment === 'cash') dom.salePhone.value = '';
    hideCreditWarn('saleCreditWarn');
    if (dom.saleAllowAnyway) dom.saleAllowAnyway.style.display = 'none';
    updateCreditWarn();
  }

  /** Completes the whole cart as one transaction (v2.63). */
  function completeSale(force) {
    if (saleCart.length === 0) {
      showToast(t('cartEmpty'), 'error');
      return;
    }
    var customer = '';
    if (salePayment === 'credit') {
      customer = dom.saleCustomer ? dom.saleCustomer.value.trim() : '';
      if (!customer) {
        showToast(t('noCustomerCredit'), 'error');
        return;
      }
    }
    var total = getCartTotal();

    // Credit-limit gate (v2.56): block the whole transaction with a warning;
    // "Allow anyway" re-invokes completeSale(true) as a deliberate override.
    if (customer && !force) {
      var cs = getCreditStatus(customer, total);
      if (cs.overLimit) {
        var warnKey = creditWarnKey(cs);
        showCreditWarn('saleCreditWarn', warnKey, cs, customer);
        if (dom.saleAllowAnyway) dom.saleAllowAnyway.style.display = 'block';
        showToast(creditWarnMessage(warnKey, cs, customer), 'error');
        return;
      }
    }

    var transactionId = genId();
    var now = new Date().toISOString();

    // Per-line sale records, grouped by a shared transactionId + paymentMethod.
    saleCart.forEach(function(line) {
      var product = state.products.find(function(p) { return p.id === line.productId; });
      var amount = line.price * line.qty;
      state.sales.push({
        id: genId(),
        transactionId: transactionId,
        paymentMethod: salePayment,
        date: todayStr(),
        createdAt: now,
        productName: line.name,
        productId: line.productId,
        quantity: line.qty,
        amount: amount,
        costPrice: line.costPrice,
        profit: (line.price - line.costPrice) * line.qty,
        customerName: customer || null
      });
      if (product) product.quantity = Math.max(0, product.quantity - line.qty);
    });

    // One debt entry for the whole transaction, with a per-line ledger.
    if (customer) {
      var existingDebt = state.debts.find(function(d) {
        return d.customerName.toLowerCase() === customer.toLowerCase() && d.remainingBalance > 0;
      });
      var ledger = saleCart.map(function(line) {
        return {
          id: genId(), date: now, type: 'debt',
          description: line.name + (line.qty > 1 ? ' \u00d7 ' + line.qty : ''),
          amount: line.price * line.qty
        };
      });
      if (existingDebt) {
        existingDebt.amount += total;
        existingDebt.remainingBalance += total;
        existingDebt.updatedAt = now;
        // Save phone if provided and debt doesn't have one yet
        var phoneVal3 = dom.salePhone ? dom.salePhone.value.trim() : '';
        if (phoneVal3 && !existingDebt.phone) existingDebt.phone = phoneVal3;
        if (!existingDebt.transactions) existingDebt.transactions = [];
        ledger.forEach(function(e) { existingDebt.transactions.push(e); });
      } else {
        var phoneVal4 = dom.salePhone ? dom.salePhone.value.trim() : '';
        state.debts.push({
          id: genId(), customerName: customer, amount: total,
          remainingBalance: total, createdAt: now, updatedAt: now,
          phone: phoneVal4, transactions: ledger
        });
      }
    }

    saveState();
    renderDayMode();
    renderMorningCheck();
    showToast(t('saleCompleted'));

    // Ready for the next customer — fresh session, stay on the page
    resetSaleForm();
  }

  // ============================================
  // CLOSING SCREEN
  // ============================================
  function showClosingScreen() {
    if (!state.dayOpen || isStaleOpenDay()) {
      showToast(state.dayOpen ? t('overdueRedirect') : t('dayNotOpen'));
      return;
    }
    // Redirect to closing page
    window.location.href = 'closing.html';
  }

  /** Navigate to day mode — guards against accessing day without starting the day */
  function navigateToDayMode() {
    if (!state.dayOpen || isStaleOpenDay()) {
      showToast(state.dayOpen ? t('overdueRedirect') : t('dayNotOpen'));
      return;
    }
    window.location.href = 'day.html';
  }

  function renderClosingScreen() {
    // Detect edit mode from URL param
    var isEdit = window.location.search.indexOf('edit=true') >= 0;

    var todaySales = getTodaySales();
    if (dom.closingSoldItems) {
      if (todaySales.length === 0) {
        dom.closingSoldItems.innerHTML = '<div class="empty-state" style="padding:12px 0;">' + t('noSales') + '</div>';
      } else {
        dom.closingSoldItems.innerHTML = todaySales.map(function(s) {
          return '<div class="closing-item">' +
            '<span class="closing-item-name">' + s.productName + ' \u00d7 ' + s.quantity + '</span>' +
            '<span class="closing-item-value success">' + formatCurrency(s.amount) + '</span>' +
          '</div>';
        }).join('');
      }
    }

    var lowItems = state.products.filter(function(p) { return getStockStatus(p) === 'low'; })
      .slice().sort(function(a, b) { return a.quantity - b.quantity; });
    var outItems = state.products.filter(function(p) { return getStockStatus(p) === 'out'; })
      .slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
    var displayItems = lowItems.concat(outItems).slice(0, 5);
    if (dom.closingLowStock) {
      if (displayItems.length === 0) {
        dom.closingLowStock.innerHTML = '<div class="empty-state" style="padding:12px 0;">' + t('allStockOk') + '</div>';
      } else {
        dom.closingLowStock.innerHTML = displayItems.map(function(p) {
          var status = getStockStatus(p);
          var cls = status === 'out' ? 'danger' : 'warning';
          return '<div class="closing-item">' +
            '<span class="closing-item-name">' + p.name + '</span>' +
            '<span class="closing-item-value ' + cls + '">' +
              p.quantity + ' left' +
            '</span>' +
          '</div>';
        }).join('');
      }
    }

    var activeDebts = state.debts.filter(function(d) { return d.remainingBalance > 0; });
    if (dom.closingDebts) {
      if (activeDebts.length === 0) {
        dom.closingDebts.innerHTML = '<div class="empty-state" style="padding:12px 0;">' + t('noDebts') + '</div>';
      } else {
        dom.closingDebts.innerHTML = activeDebts.map(function(d) {
          return '<div class="closing-item">' +
            '<span class="closing-item-name">' + d.customerName + '</span>' +
            '<span class="closing-item-value danger">' + formatCurrency(d.remainingBalance) + '</span>' +
          '</div>';
        }).join('');
      }
    }

    var weekly = getWeeklySales();
    if (dom.closingWeeklySales) dom.closingWeeklySales.textContent = formatCurrency(weekly.total);
    if (dom.closingTopSeller) dom.closingTopSeller.textContent = weekly.topSeller || '\u2014';

    if (dom.closingActualSales) dom.closingActualSales.value = state.todayEarnings || '';
    updateClosingTotal();

    // In edit mode, change the complete button text
    if (isEdit && dom.btnCompleteDay) {
      dom.btnCompleteDay.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>\u270F\uFE0F Update Closing</span>';
    }
  }

  function updateClosingTotal() {
    if (!dom.closingActualSales || !dom.closingRecordedSales || !dom.closingSalesDiff || !dom.closingTotalToday) return;
    var recordedSales = getTodayEarnings() + (state.todayEarnings || 0);
    var actualSales = parseFloat(dom.closingActualSales.value) || 0;
    var diff = actualSales - recordedSales;
    var profit = getTodayProfit();
    var expenses = getTodayExpensesTotal();
    var netProfit = profit - expenses;
    dom.closingRecordedSales.textContent = formatCurrency(recordedSales);
    dom.closingSalesDiff.textContent = (diff >= 0 ? '+' : '') + formatCurrency(diff);
    dom.closingSalesDiff.style.color = diff === 0 ? 'var(--text-muted)' : (diff > 0 ? 'var(--primary)' : 'var(--danger)');
    dom.closingTotalToday.textContent = formatCurrency(profit);
    // V2.71: store expenses + Net Profit rows (gross profit stays unchanged)
    if (dom.closingExpensesToday) dom.closingExpensesToday.textContent = formatCurrency(expenses);
    if (dom.closingNetProfit) {
      dom.closingNetProfit.textContent = formatCurrency(netProfit);
      dom.closingNetProfit.style.color = netProfit < 0 ? 'var(--danger)' : 'var(--primary)';
    }
    var restockInfo = document.getElementById('closingRestockText');
    if (restockInfo) {
      var days = getDaysSinceLastRestock();
      if (days < 0) restockInfo.textContent = 'Last restock: none yet';
      else if (days === 0) restockInfo.textContent = 'Restocked today!';
      else restockInfo.textContent = 'Last restock: ' + days + ' day(s) ago';
    }
  }

  function backToDay() {
    window.location.href = 'day.html';
  }

  // ============================================
  // COMPLETE DAY
  // ============================================
  function completeDay() {
    if (!state.dayOpen) return;

    var recordedSales = getTodayEarnings();
    var actualSales = parseFloat(dom.closingActualSales ? dom.closingActualSales.value : 0) || 0;
    var expenses = getTodayExpensesTotal();
    state.todayExpenses = expenses;
    state.todayEarnings = actualSales;

    var totalItemsSold = getTodayItemsSold();
    var totalUtang = getTodayUtang();
    var diff = actualSales - recordedSales;
    var profit = getTodayProfit();
    var netProfit = profit - expenses;

    // Update or create today's history entry (overwrite if exists)
    var todayHistoryIndex = -1;
    for (var i = 0; i < state.history.length; i++) {
      if (state.history[i].date === todayStr()) {
        todayHistoryIndex = i;
        break;
      }
    }
    var historyEntry = {
      date: todayStr(),
      earnings: actualSales,
      recordedSales: recordedSales,
      actualSales: actualSales,
      salesDiff: diff,
      expenses: expenses,
      netProfit: netProfit,
      profit: profit,
      itemsSold: totalItemsSold,
      utangTotal: totalUtang,
      salesCount: getTodaySales().length
    };
    if (todayHistoryIndex >= 0) {
      state.history[todayHistoryIndex] = historyEntry;
    } else {
      state.history.push(historyEntry);
    }

    state.dayOpen = false;
    state.dayArchived = false; // keep data available for editing
    saveState();

    if (dom.summaryOverlay) dom.summaryOverlay.classList.add('open');
    var name = state.settings.ownerName || '';
    if (dom.summaryText) dom.summaryText.textContent = t('dayCompleteSub', { name: name });

    if (dom.summaryDetails) {
      dom.summaryDetails.innerHTML =
        '<div class="summary-detail-row"><span>' + t('closingRecordedSales') + '</span><span>' + formatCurrency(recordedSales) + '</span></div>' +
        '<div class="summary-detail-row"><span>' + t('closingActualSales') + '</span><span>' + formatCurrency(actualSales) + '</span></div>' +
        (diff !== 0 ? '<div class="summary-detail-row"><span>' + t('closingSalesDiff') + '</span><span style="color:' + (diff > 0 ? 'var(--primary)' : 'var(--danger)') + ';">' + (diff > 0 ? '+' : '') + formatCurrency(diff) + '</span></div>' : '') +
        '<div class="summary-detail-row"><span>' + t('closingProfitLabel') + '</span><span>' + formatCurrency(profit) + '</span></div>' +
        '<div class="summary-detail-row"><span>' + t('closingExpensesToday') + '</span><span style="color:var(--danger);">' + formatCurrency(expenses) + '</span></div>' +
        '<div class="summary-detail-row" style="border-top:1px solid var(--border);padding-top:8px;font-weight:700;"><span>' + t('closingNetProfit') + '</span><span style="color:' + (netProfit < 0 ? 'var(--danger)' : 'var(--primary)') + ';">' + formatCurrency(netProfit) + '</span></div>' +
        '<div class="summary-detail-row"><span>Items Sold</span><span>' + totalItemsSold + '</span></div>' +
        (totalUtang > 0 ? '<div class="summary-detail-row"><span>Unpaid Debt</span><span style="color:var(--danger);">' + formatCurrency(totalUtang) + '</span></div>' : '');
    }
  }

  function closeDayAndShowMorning() {
    if (dom.summaryOverlay) dom.summaryOverlay.classList.remove('open');
    state.dayOpen = false;
    // Keep todayExpenses/todayEarnings intact so user can re-open and edit
    saveState();
    window.location.href = 'morning.html';
  }

  // ─── Re-open Closing for Editing ───
  function reopenClosing() {
    // Restore the day state from history so closing inputs are pre-filled
    var todayEntry = null;
    for (var i = 0; i < state.history.length; i++) {
      if (state.history[i].date === todayStr()) {
        todayEntry = state.history[i];
        break;
      }
    }
    if (todayEntry) {
      state.todayExpenses = todayEntry.expenses || 0;
      state.todayEarnings = todayEntry.actualSales || 0;
    }
    state.dayDate = todayStr();
    state.dayOpen = true;
    state.dayArchived = false;
    saveState();
    window.location.href = 'closing.html?edit=true';
  }

  // ─── Archive Day Sales ───
  function archiveDaySales() {
    if (!state.dayDate) return;
    // Attach today's sales data to the history entry for that date
    var salesForDate = state.sales.filter(function(s) { return s.date === state.dayDate; });
    if (salesForDate.length > 0) {
      var found = false;
      for (var i = 0; i < state.history.length; i++) {
        if (state.history[i].date === state.dayDate) {
          state.history[i].archivedSales = JSON.parse(JSON.stringify(salesForDate));
          found = true;
          break;
        }
      }
      if (!found) {
        state.history.push({
          date: state.dayDate,
          archivedSales: JSON.parse(JSON.stringify(salesForDate)),
          earnings: 0,
          recordedSales: 0,
          actualSales: 0,
          salesDiff: 0,
          expenses: getExpensesTotalFor(state.dayDate),
          profit: 0,
          itemsSold: 0,
          utangTotal: 0,
          salesCount: salesForDate.length
        });
      }
    }
    // Remove those sales from the active array
    state.sales = state.sales.filter(function(s) { return s.date !== state.dayDate; });
    state.dayArchived = true;
    saveState();
  }

  // ============================================
  // MANAGE STORE
  // ============================================
  // (toggleManageStore and switchManageTab removed — now using separate pages)

  // Inventory category filter ('' = all). Persisted so the filter survives
  // page navigation within the tab (matches the report-period pattern).
  var inventoryCatFilter = '';
  // Inventory subcategory drill-down ('' = all within the selected category).
  // Set by the search-control dropdown; cleared whenever the category chip changes.
  var inventorySubcatFilter = '';
  function loadInventoryCatFilter() {
    try { inventoryCatFilter = sessionStorage.getItem('sss_v3_inventoryCat') || ''; } catch(e) { inventoryCatFilter = ''; }
    try { inventorySubcatFilter = sessionStorage.getItem('sss_v3_inventorySubcat') || ''; } catch(e) { inventorySubcatFilter = ''; }
  }
  function saveInventoryCatFilter() {
    try {
      if (inventoryCatFilter) sessionStorage.setItem('sss_v3_inventoryCat', inventoryCatFilter);
      else sessionStorage.removeItem('sss_v3_inventoryCat');
      if (inventorySubcatFilter) sessionStorage.setItem('sss_v3_inventorySubcat', inventorySubcatFilter);
      else sessionStorage.removeItem('sss_v3_inventorySubcat');
    } catch(e) {}
  }

  // Category chip row above the inventory list (selection over typing).
  // Default: horizontal scroll with first 6 categories visible + "More ▾".
  // Expanded: all categories wrap onto multiple lines.
  var CAT_CHIP_VISIBLE_DEFAULT = 6; // 'All' + first 5 categories
  var catFiltersExpanded = false;

  function renderInventoryCatFilters() {
    if (!dom.inventoryCatFilters) return;
    var allKeys = [''].concat(PRODUCT_CATEGORIES);
    var isExpanded = catFiltersExpanded;
    dom.inventoryCatFilters.className = 'cat-chips' + (isExpanded ? ' expanded' : '');

    var chips = '';
    var visibleCount = isExpanded ? allKeys.length : Math.min(CAT_CHIP_VISIBLE_DEFAULT, allKeys.length);
    for (var i = 0; i < visibleCount; i++) {
      var k = allKeys[i];
      var label = k === '' ? t('catAll') : productCategoryLabel(k);
      var activeClass = inventoryCatFilter === k ? ' active' : '';
      chips += '<button class="cat-chip' + activeClass + '" onclick="setInventoryCatFilter(\'' + k + '\')">' + label + '</button>';
    }
    if (allKeys.length > CAT_CHIP_VISIBLE_DEFAULT) {
      var moreLabel = isExpanded ? t('catLess') : t('catMore');
      chips += '<button class="cat-chip-more" onclick="toggleCatFilters()">' + moreLabel + '</button>';
    }
    dom.inventoryCatFilters.innerHTML = chips;
  }

  function toggleCatFilters() {
    catFiltersExpanded = !catFiltersExpanded;
    renderInventoryCatFilters();
  }

  // Collapsible sections on closing page
  var collapsedSections = {};
  window.toggleCollapse = function(sectionId) {
    collapsedSections[sectionId] = !collapsedSections[sectionId];
    var isCollapsed = collapsedSections[sectionId];
    var arrow = document.getElementById(sectionId + 'Toggle');
    var content = document.getElementById('closing' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    if (arrow) {
      var svg = arrow.querySelector('.collapse-arrow');
      if (svg) svg.classList.toggle('open', !isCollapsed);
    }
    if (content) {
      if (isCollapsed) {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.offsetHeight; // force reflow
        content.classList.add('collapsed');
      } else {
        content.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(function() { content.style.maxHeight = ''; }, 250);
      }
    }
  }

  // Collapsible settings sections
  window.toggleSettingsSection = function(titleEl) {
    var section = titleEl.closest('.settings-section');
    if (section) {
      section.classList.toggle('collapsed');
      var arrow = titleEl.querySelector('.collapse-arrow');
      if (arrow) arrow.classList.toggle('open', !section.classList.contains('collapsed'));
    }
  }

  // Prevent mouse-wheel from horizontally scrolling the chip row on desktop.
  // In collapsed mode the row is overflow-x:auto but we don't want a vertical
  // mouse-wheel scroll to be hijacked as a horizontal scroll.  We allow
  // horizontal only when deltaX > deltaY (trackpad two-finger horizontal swipe).
  if (dom.inventoryCatFilters) {
    dom.inventoryCatFilters.addEventListener('wheel', function(e) {
      if (catFiltersExpanded) return; // expanded = wrap layout, no scroll
      var verticalIntent = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      if (verticalIntent) {
        // User wants to scroll the page — block the container from capturing it.
        e.preventDefault();
      }
    }, { passive: false });
  }

  function setInventoryCatFilter(cat) {
    inventoryCatFilter = cat;
    // A new category chip invalidates the previous subcategory drill-down.
    inventorySubcatFilter = '';
    saveInventoryCatFilter();
    renderInventoryCatFilters();
    renderManageInventory();
  }

  // Subcategory drill-down from the search-control dropdown (checkout parity).
  function setInventorySubcatFilter(subcat) {
    inventorySubcatFilter = subcat || '';
    saveInventoryCatFilter();
    renderManageInventory();
  }

  // ─── Demand Forecast sort (offline ML) ───
  // When enabled, the inventory list is ordered by learned restock urgency
  // (predictedDaysUntilOut ascending — out-of-stock / soon-to-run-out first)
  // instead of by name. Persisted so the choice survives page navigation
  // within the tab, matching the category-filter pattern.
  var inventoryForecastSort = false;
  function loadInventoryForecastSort() {
    // Read from localStorage (long-lived) first; fall back to sessionStorage for
    // back-compat with the old tab-only preference.
    try {
      inventoryForecastSort = localStorage.getItem('sss_v3_inventoryForecastSort') === '1';
    } catch(e) {}
    if (inventoryForecastSort === false) {
      try {
        inventoryForecastSort = sessionStorage.getItem('sss_v3_inventoryForecastSort') === '1';
      } catch(e) {}
    }
  }
  function saveInventoryForecastSort() {
    try {
      // Write to localStorage (survives full browser close/reload) and sessionStorage
      // (back-compat). Use '' removal on both so a full reset clears both keys.
      if (inventoryForecastSort) {
        localStorage.setItem('sss_v3_inventoryForecastSort', '1');
        sessionStorage.setItem('sss_v3_inventoryForecastSort', '1');
      } else {
        localStorage.removeItem('sss_v3_inventoryForecastSort');
        sessionStorage.removeItem('sss_v3_inventoryForecastSort');
      }
    } catch(e) {}
  }
  function toggleInventoryForecastSort() {
    inventoryForecastSort = !inventoryForecastSort;
    saveInventoryForecastSort();
    renderManageInventory();
  }
  window.toggleInventoryForecastSort = toggleInventoryForecastSort;

  // Renders the "Sort by Forecast" toggle row shown above the inventory list.
  function renderInventoryForecastToggle() {
    if (!dom.inventoryListToolbar) return;
    var on = !!inventoryForecastSort;
    dom.inventoryListToolbar.innerHTML =
      '<button class="inventory-sort-toggle' + (on ? ' active' : '') + '" onclick="toggleInventoryForecastSort()" type="button">' +
        '\ud83d\udd2e <span>' + t('forecastSortOff') + '</span>' +
      '</button>';
  }

  // Forecast badge for one product — mirrors the mobile ForecastBadge.kt:
  //   INSUFFICIENT / no-demand  -> gray "Collecting data…" / "No demand"
  //   out-of-stock / out-today  -> red
  //   days <= 3 red, <= 7 amber, else green ("{n}d left • Avg x/day")
  function forecastBadgeHtml(result) {
    if (!result) return '';
    var engine = window.ForecastEngine;
    var confInsufficient = (engine && engine.CONF && engine.CONF.INSUFFICIENT) || 'INSUFFICIENT';
    var minAvg = (engine && engine.MIN_AVG_THRESHOLD) || 0.15;
    var days = result.predictedDaysUntilOut;
    var html;
    if (result.confidence === confInsufficient) {
      html = '<span class="inv-forecast-badge fc-gray">' + t('forecastInsufficientData') + '</span>';
    } else if (result.avgDaily < minAvg) {
      html = '<span class="inv-forecast-badge fc-gray">' + t('forecastNoDemand') + '</span>';
    } else if (result.currentStock <= 0) {
      html = '<span class="inv-forecast-badge fc-red">' + t('forecastOutOfStock') + '</span>';
    } else if (days == null) {
      html = '<span class="inv-forecast-badge fc-gray">' + t('forecastNoDemand') + '</span>';
    } else if (days === 0) {
      html = '<span class="inv-forecast-badge fc-red">' + t('forecastOutToday') + '</span>';
    } else {
      var daysText = t('forecastDaysLeftShort').replace('{n}', days);
      var avgText = t('forecastAvgPerDay').replace('{n}', result.avgDaily.toFixed(1));
      var cls = days <= 3 ? 'fc-red' : (days <= 7 ? 'fc-amber' : 'fc-green');
      html = '<span class="inv-forecast-badge ' + cls + '">' + daysText + ' \u2022 ' + avgText + '</span>';
    }
    return '\ud83d\udd2e ' + html;
  }

  // Urgency rank for sorting — a numeric, monotonic "risk" key derived from the
  // forecast. Lower = more urgent (appears first). Non-demanded / cold-start
  // items are deprioritised behind any item that will actually run out.
  function forecastUrgencyRank(result) {
    if (!result) return 1e9;
    if (result.currentStock <= 0) return 0;                        // out of stock
    if (result.predictedDaysUntilOut == null) return 1e9;          // no demand / collecting
    return result.predictedDaysUntilOut;                           // days until out (ascending)
  }

  // Numeric rank for stock status — mirrors mobile StocksScreen.kt statusRank:
  //   out-of-stock(0) < LOW(1) < PLENTY(2) — lower ranks sort first.
  function stkRank(status) {
    if (status === 'out')  return 0;
    if (status === 'low')  return 1;
    return 2; // 'plenty' or unknown
  }

  // ────────────────────────────────────────────────────────────────
  // Stage 4 — Forecast detail card (Product Detail) + urgent-restock
  // cards (Morning 7d / Reports 14d). Reuses the real engine; safe
  // no-ops whenever forecast.js isn't loaded or the engine throws.
  // ────────────────────────────────────────────────────────────────
  function _fcConfChip(conf) {
    if (conf === 'HIGH') return { label: t('forecastConfidenceHigh'), color: '#16a34a', bg: '#f0fdf4' };
    if (conf === 'MEDIUM') return { label: t('forecastConfidenceMedium'), color: '#d97706', bg: '#fffbeb' };
    if (conf === 'LOW') return { label: t('forecastConfidenceLow'), color: '#475569', bg: '#f8fafc' };
    return { label: t('forecastInsufficientData'), color: '#64748b', bg: '#f1f5f9' };
  }

  function _fcBarColor(days) {
    if (days != null && days <= 3) return '#dc2626';   // red   (<=3d)
    if (days != null && days <= 7) return '#d97706';   // amber (<=7d)
    return '#16a34a';                                  // green
  }

  // Mini 7-bar history sparkline from result.dailyHistory (oldest → newest).
  function _fcMiniBarsHtml(result) {
    var hist = result.dailyHistory || [];
    var dates = result.dailyDates || [];
    var max = 0, i;
    for (i = 0; i < hist.length; i++) if (hist[i] > max) max = hist[i];
    var barColor = _fcBarColor(result.predictedDaysUntilOut);
    var bars = '';
    for (i = 0; i < 7; i++) {
      var v = (i < hist.length) ? hist[i] : 0;
      var h = (max > 0 && v > 0) ? Math.max(5, Math.round((v / max) * 100)) : 5;
      var op = v === 0 ? 0.15 : 0.9;
      var label = (i < dates.length) ? dates[i].slice(5).replace('-', '/') : '';
      bars += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;" title="' + (label || '') + '">' +
        '<div style="width:100%;max-width:18px;height:' + h + 'px;background:' + barColor + ';opacity:' + op + ';border-radius:3px;"></div>' +
        (i === 0 || i === 6 ? '<span style="font-size:9px;color:#94a3b8;">' + esc(label) + '</span>' : '<span style="font-size:9px;">&nbsp;</span>') +
      '</div>';
    }
    return '<div style="display:flex;align-items:flex-end;gap:4px;height:52px;padding:8px 0;">' + bars + '</div>';
  }

  // Stats row: Avg / EMA / Trend (each to 1 decimal).
  function _fcStatRowHtml(result) {
    function st(label, val) {
      return '<div style="flex:1;text-align:center;"><div style="font-size:var(--text-xs);color:#94a3b8;">' + label + '</div>' +
        '<div style="font-weight:700;color:#1e293b;font-size:var(--text-sm);">' + val.toFixed(1) + '</div></div>';
    }
    return '<div style="display:flex;background:#f8fafc;border-radius:10px;padding:8px 4px;margin-top:4px;">' +
      st(t('forecastAvgLabel'), result.avgDaily) +
      st(t('forecastEmaLabel'), result.emaDaily) +
      st(t('forecastTrendLabel'), result.trendDaily) +
    '</div>';
  }

  // Whether the engine has enough demand to show a real prediction.
  function _fcHasPrediction(result, engine) {
    if (!result) return false;
    var minAvg = (engine && engine.MIN_AVG_THRESHOLD != null) ? engine.MIN_AVG_THRESHOLD : 0.15;
    return result.confidence !== 'INSUFFICIENT' && result.avgDaily >= minAvg;
  }

  // Full ForecastDetailCard HTML used by Product Detail.
  function forecastDetailCardHtml(result, product) {
    if (!result || !window.ForecastEngine) return '';
    var engine = window.ForecastEngine;
    var chip = _fcConfChip(result.confidence);

    var predHtml;
    if (!_fcHasPrediction(result, engine)) {
      predHtml = '<div style="background:#f1f5f9;border-radius:10px;padding:10px;text-align:center;">' +
        '<div style="font-weight:700;color:#475569;font-size:var(--text-sm);">' + t('forecastInsufficientData') + '</div>' +
        '<div style="font-size:var(--text-xs);color:#94a3b8;margin-top:2px;">' + t('forecastInsufficientHint') + '</div></div>';
    } else {
      var days = result.predictedDaysUntilOut;
      var daysText;
      if (days == null) daysText = t('forecastNoDemand');
      else if (days === 0) daysText = t('forecastOutToday');
      else daysText = t('forecastDaysLeftFull', { n: days });
      var daysColor = _fcBarColor(days);
      predHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px;background:#f8fafc;border-radius:10px;">' +
        '<div><div style="font-size:var(--text-xs);color:#94a3b8;">' + t('forecastAvgLabel') + ' ' + result.avgDaily.toFixed(1) + '/day</div>' +
        '<div style="font-weight:700;color:' + daysColor + ';font-size:var(--text-md);">' + daysText + '</div></div>' +
        '<div style="text-align:right;"><div style="font-size:var(--text-xs);color:#94a3b8;">' + t('forecastSuggestedRestock', { n: result.suggestedRestockQty }) + '</div>' +
        '<div style="font-weight:700;color:#16a34a;">' + t('forecastFor7Days') + '</div></div>' +
      '</div>';
    }

    var methodLine = t('forecastMethod') + ' \u00b7 ' + t('forecastHistory');

    return '<div style="background:linear-gradient(135deg,#f0f9ff,#eff6ff);border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<div style="font-weight:700;color:#1e3a8a;">\ud83d\udd2e ' + t('forecastDetailTitle') + '</div>' +
        '<span style="font-size:var(--text-xs);font-weight:700;color:' + chip.color + ';background:' + chip.bg + ';padding:3px 8px;border-radius:999px;text-transform:uppercase;">' + chip.label + '</span>' +
      '</div>' +
      '<div style="font-size:var(--text-xs);color:#64748b;margin-bottom:4px;">' + methodLine + '</div>' +
      _fcMiniBarsHtml(result) +
      _fcStatRowHtml(result) +
      predHtml +
      '<div style="margin-top:10px;display:flex;gap:8px;">' +
        '<a href="restock.html" class="btn btn-primary" style="flex:1;text-decoration:none;font-size:var(--text-sm);">\ud83d\ude9a ' + t('restockBtn') + '</a>' +
      '</div>' +
      '<div style="margin-top:10px;font-size:10px;color:#94a3b8;text-align:center;">' + t('forecastHowItWorks') + '</div>' +
    '</div>';
  }

  // Item row shared by Morning (7d) and Reports (14d) urgent cards.
  function _fcUrgentRowHtml(item) {
    var r = item.result;
    var days = r.predictedDaysUntilOut;
    var daysText, dot;
    if (days === 0)            { daysText = t('forecastUrgentOutToday');   dot = '#dc2626'; }
    else if (r.currentStock <= 0) { daysText = t('forecastUrgentOutOfStock'); dot = '#dc2626'; }
    else                       { daysText = t('forecastDaysLeftShort', { n: days }); dot = (days <= 3) ? '#dc2626' : '#d97706'; }
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;">' +
      '<span style="width:9px;height:9px;border-radius:50%;background:' + dot + ';flex-shrink:0;"></span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:var(--text-sm);color:#1e293b;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(r.productName || item.product.name) + '</div>' +
        '<div style="font-size:var(--text-xs);color:#94a3b8;">' + daysText + ' \u00b7 ' + t('forecastAvgPerDay', { n: r.avgDaily.toFixed(1) }) + '</div></div>' +
      '<span style="font-size:var(--text-xs);font-weight:700;color:#16a34a;white-space:nowrap;">+' + r.suggestedRestockQty + '</span>' +
    '</div>';
  }

  // Urgent-restock card body (list of urgent rows) + header hint.
  function forecastUrgentCardHtml(list, titleKey, descKey) {
    if (!list || list.length === 0) return '';
    var rows = list.map(_fcUrgentRowHtml).join('');
    return '<div style="background:linear-gradient(135deg,#fff7ed,#fffbeb);border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:12px;">' +
      '<div style="font-weight:700;color:#7c2d12;margin-bottom:2px;">' + t(titleKey) + '</div>' +
      '<div style="font-size:var(--text-xs);color:#b45309;margin-bottom:6px;">' + t(descKey) + '</div>' +
      rows +
    '</div>';
  }


  function renderManageInventory() {
    if (!dom.manageInventoryList) return;
    var query = dom.manageStockSearch ? dom.manageStockSearch.value.toLowerCase() : '';
    var products = state.products;
    if (query) {
      products = products.filter(function(p){ return buildProductSearchHay(p).includes(query); });
    }
    // Category filter ('' = all) — products without a category only match 'all'.
    if (inventoryCatFilter) {
      products = products.filter(function(p) { return p.category === inventoryCatFilter; });
    }
    // Subcategory drill-down ('' = all within the category).
    if (inventorySubcatFilter) {
      products = products.filter(function(p) { return p.subcategory === inventorySubcatFilter; });
    }
    // Offline demand forecast (Stage 2). Safe no-op when forecast.js isn't
    // loaded or the engine is unavailable — the inventory renders as before.
    var forecasts = null;
    if (window.ForecastEngine) {
      try {
        var allSales = window.ForecastEngine.buildAllSalesFromWeb(state);
        forecasts = window.ForecastEngine.forecastAll(products, allSales, todayStr());
      } catch(e) { forecasts = null; }
    }

    products = products.slice();
    if (inventoryForecastSort && forecasts) {
      // Sort by learned restock urgency (not quantity / not name).
      products.sort(function(a, b) {
        var ra = forecastUrgencyRank(forecasts[a.id]);
        var rb = forecastUrgencyRank(forecasts[b.id]);
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name); // stable tie-break
      });
    } else {
      // Default = stock status → quantity ascending → name (mobile StocksScreen parity).
      // stkRank: out=0, low=1, plenty=2.
      products.sort(function(a, b) {
        var sa = getStockStatus(a);
        var sb = getStockStatus(b);
        var ra = stkRank(sa);
        var rb = stkRank(sb);
        if (ra !== rb) return ra - rb;
        if (a.quantity !== b.quantity) return a.quantity - b.quantity;
        return a.name.localeCompare(b.name); // stable tie-break
      });
    }

    renderInventoryForecastToggle();

    if (products.length === 0) {
      dom.manageInventoryList.innerHTML = '<div class="empty-state">' + t('noProducts') + '</div>';
      return;
    }

    dom.manageInventoryList.innerHTML = products.map(function(p) {
      var status = getStockStatus(p);
      var icon = status === 'plenty' ? '\u2705' : (status === 'low' ? '\u26a0\ufe0f' : '\ud83d\udd34');
      var margin = p.costPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.costPrice) * 100) : 0;
      var subline = productSubline(p);
      var badge = forecasts ? forecastBadgeHtml(forecasts[p.id]) : '';
      return '<div class="inv-manage-item" onclick="location.href=\'product_detail.html?id=' + p.id + '\'" style="cursor:pointer;">' +
        '<div class="inv-manage-icon ' + status + '">' + icon + '</div>' +
        '<div class="inv-manage-info">' +
          '<div class="inv-manage-name">' + p.name + '</div>' +
          (badge ? badge : '') +
          (subline ? '<div class="inv-manage-sub">' + subline + '</div>' : '') +
          '<div class="inv-manage-detail">Stock: ' + p.quantity + ' | +' + margin + '% | ' + formatCurrency(p.sellingPrice) + '</div>' +
        '</div>' +
        '<div class="inv-manage-actions">' +
          '<button class="inv-manage-btn" onclick="window.editProduct(\'' + p.id + '\')">\u270f\ufe0f</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }


  function editProduct(id) {
    var product = state.products.find(function(p) { return p.id === id; });
    if (!product) return;
    state.editProductId = id;
    // Save the edit ID to localStorage so add_product.html can load it
    try { localStorage.setItem('sss_v3_editProductId', id); } catch(e) {}
    // Navigate to add_product.html for editing
    window.location.href = 'add_product.html';
  }

  // Reset every Add Stock field to its fresh-add default (used by
  // openAddProduct and by the bfcache pageshow handler — Chrome's back/forward
  // cache restores the whole page DOM including typed values, which
  // autocomplete="off" cannot prevent).
  function resetAddProductFields() {
    state.editProductId = null;
    if (dom.addProductTitle) dom.addProductTitle.textContent = t('addStock');
    if (dom.productName) dom.productName.value = '';
    if (dom.productQty) dom.productQty.value = '10';
    if (dom.productCost) dom.productCost.value = '';
    if (dom.productPrice) dom.productPrice.value = '';
    if (dom.productMarkup) dom.productMarkup.value = getDefaultMarkup();
    if (dom.productMarkupHint) dom.productMarkupHint.textContent = '';
    if (dom.productLowStock) dom.productLowStock.value = getGlobalLowStockThreshold();
    if (dom.productCategory) dom.productCategory.value = '';
    if (dom.productBrand) dom.productBrand.value = '';
    if (dom.productUnit) dom.productUnit.value = 'piece';
    if (dom.productPackageSize) dom.productPackageSize.value = '';
    updateMarkupHint();
  }

  // Refresh the Brand / Package Size datalist suggestions from the current
  // inventory (getUsedBrands / getUsedPackageSizes).
  function populateProductDatalists() {
    if (dom.productBrandList) {
      dom.productBrandList.innerHTML = getUsedBrands().map(function(b) {
        return '<option value="' + esc(b) + '"></option>';
      }).join('');
    }
    if (dom.productPackageSizeList) {
      dom.productPackageSizeList.innerHTML = getUsedPackageSizes().map(function(s) {
        return '<option value="' + esc(s) + '"></option>';
      }).join('');
    }
  }

  // Prefill the Add Stock form from an existing product (edit mode).
  // A stale edit ID is cleared so the form stays in fresh-add mode.
  function fillProductFormFromEdit(editId) {
    if (!editId) return;
    var product = state.products.find(function(p) { return p.id === editId; });
    if (!product) {
      state.editProductId = null;
      try { localStorage.removeItem('sss_v3_editProductId'); } catch(e) {}
      return;
    }
    state.editProductId = editId;
    if (dom.addProductTitle) dom.addProductTitle.textContent = 'Edit Stock';
    if (dom.productName) dom.productName.value = product.name;
    if (dom.productQty) dom.productQty.value = product.quantity;
    if (dom.productCost) dom.productCost.value = product.costPrice;
    if (dom.productPrice) dom.productPrice.value = product.sellingPrice;
    if (dom.productMarkup && product.costPrice > 0) {
      var actualMarkup = Math.round(((product.sellingPrice / product.costPrice) - 1) * 100);
      dom.productMarkup.value = (actualMarkup >= 0) ? actualMarkup : getDefaultMarkup();
    }
    if (dom.productLowStock && typeof product.lowStockThreshold === 'number' && product.lowStockThreshold >= 0) {
      dom.productLowStock.value = product.lowStockThreshold;
    }
    if (dom.productCategory) dom.productCategory.value = product.category || '';
    if (dom.productBrand) dom.productBrand.value = product.brand || '';
    if (dom.productUnit) dom.productUnit.value = product.unit || 'piece';
    if (dom.productPackageSize) dom.productPackageSize.value = product.packageSize || '';
    updateMarkupHint();
  }

  function openAddProduct() {
    resetAddProductFields();
    // (overlay replaced by separate add_product.html page)
  }

  function closeAddProduct() {
    state.editProductId = null;
  }

  function updateMarkupHint() {
    if (!dom.productCost || !dom.productMarkup || !dom.productMarkupHint) return;
    var cost = parseFloat(dom.productCost.value) || 0;
    var markup = parseFloat(dom.productMarkup.value) || 0;
    var suggested = calcMarkupSuggestion(cost, markup);
    if (suggested) {
      var amount = suggested - cost;
      dom.productMarkupHint.textContent = t('markupHint', { cost: formatCurrency(cost), pct: markup, amount: formatCurrency(amount), price: formatCurrency(suggested) });
      if (dom.productPrice && !_userEditedPrice) {
        _suppressPriceListener = true;
        dom.productPrice.value = suggested.toFixed(2);
        _suppressPriceListener = false;
      }
      // Show/hide the markup helper block
      if (dom.markupSuggestion && cost > 0 && markup > 0) {
        dom.markupSuggestion.style.display = 'block';
        if (dom.markupHint) dom.markupHint.textContent = t('markupBoxHint', { cost: formatCurrency(cost), pct: markup, amount: formatCurrency(amount) });
        if (dom.markupSuggestedPrice) dom.markupSuggestedPrice.textContent = formatCurrency(suggested);
      } else if (dom.markupSuggestion) {
        dom.markupSuggestion.style.display = 'none';
      }
    } else {
      dom.productMarkupHint.textContent = '';
      if (dom.markupSuggestion) dom.markupSuggestion.style.display = 'none';
    }
  }

  function saveProduct() {
    var name = dom.productName ? dom.productName.value.trim() : '';
    var qty = parseInt(dom.productQty ? dom.productQty.value : 0) || 0;
    var cost = parseFloat(dom.productCost ? dom.productCost.value : 0) || 0;
    var price = parseFloat(dom.productPrice ? dom.productPrice.value : 0) || 0;
    // Product details — optional structured attributes (units, brands, categories)
    var category = dom.productCategory ? dom.productCategory.value : '';
    var brand = dom.productBrand ? dom.productBrand.value.trim() : '';
    var unit = dom.productUnit ? dom.productUnit.value : '';
    var packageSize = dom.productPackageSize ? dom.productPackageSize.value.trim() : '';
    // Per-product low-stock alert threshold; empty falls back to the global
    // Settings threshold (matching the mobile Add Stock field).
    var lowStock = dom.productLowStock ? parseInt(dom.productLowStock.value, 10) : null;
    if (!(typeof lowStock === 'number' && !isNaN(lowStock) && lowStock >= 0)) lowStock = getGlobalLowStockThreshold();

    if (!name) { showToast('Ilagay ang pangalan ng produkto.', 'error'); return; }
    if (qty <= 0) { showToast('Ilagay ang tamang dami.', 'error'); return; }
    if (cost <= 0 || price <= 0) { showToast('Ilagay ang tamang presyo.', 'error'); return; }

    if (state.editProductId) {
      var product = state.products.find(function(p) { return p.id === state.editProductId; });
      if (product) { product.name = name; product.quantity = qty; product.costPrice = cost; product.sellingPrice = price; product.lowStockThreshold = lowStock; product.category = category; product.brand = brand; product.unit = unit; product.packageSize = packageSize; }
    } else {
      state.products.push({ id: genId(), name: name, quantity: qty, costPrice: cost, sellingPrice: price, lowStockThreshold: lowStock, category: category, brand: brand, unit: unit, packageSize: packageSize });
    }

    saveState();
    try { localStorage.removeItem('sss_v3_editProductId'); } catch(e) {}
    showToast(t('productSaved'));
    // Redirect back to inventory
    window.location.href = 'inventory.html';
  }

  // ============================================
  // MANAGE DEBTS
  // ============================================
  // ─── Date formatting helper ───
  function formatDateSafe(isoString) {
    if (!isoString) return '';
    try {
      var d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      var now = new Date();
      var diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      // Use the locale for month/day
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch(e) { return ''; }
  }

  function renderManageDebts() {
    if (!dom.manageDebtsList) return;
    var total = getTotalDebt();
    if (dom.manageTotalDebt) dom.manageTotalDebt.textContent = formatCurrency(total);

    var activeDebts = state.debts.filter(function(d) { return d.remainingBalance > 0; });
    var paidDebts = state.debts.filter(function(d) { return d.remainingBalance <= 0; });

    // ── Active debts ──
    if (activeDebts.length === 0) {
      dom.manageDebtsList.innerHTML = '<div class="empty-state">\u2705 ' + t('noDebtItems') + '</div>';
    } else {
      dom.manageDebtsList.innerHTML = activeDebts.map(function(d) {
        var activityLabel = '';
        if (d.updatedAt) {
          var formatted = formatDateSafe(d.updatedAt);
          if (formatted) activityLabel = 'Last: ' + formatted;
        }
        return '<div class="debt-manage-item" onclick="location.href=\'debtor_detail.html?id=' + d.id + '\'" style="cursor:pointer;">' +
          '<div class="debt-manage-info">' +
            '<div class="debt-manage-name">' + d.customerName + '</div>' +
            '<div class="debt-manage-meta">' + activityLabel + '</div>' +
          '</div>' +
          '<div class="debt-manage-amount">' + formatCurrency(d.remainingBalance) + '</div>' +
          '<button class="debt-manage-pay-btn" onclick="event.stopPropagation(); location.href=\'record_payment.html?id=' + d.id + '\'">' + t('payBtnLabel') + '</button>' +
        '</div>';
      }).join('');
    }

    // ── Paid debts collapsible ──
    var paidContainer = document.getElementById('paidDebtsContainer');
    if (!paidContainer) return;
    if (paidDebts.length === 0) {
      paidContainer.style.display = 'none';
      return;
    }
    paidContainer.style.display = 'block';
    var paidCountEl = document.getElementById('paidDebtsCount');
    if (paidCountEl) paidCountEl.textContent = paidDebts.length;

    var paidList = document.getElementById('paidDebtsList');
    if (!paidList) return;
    paidList.innerHTML = paidDebts.map(function(d) {
      var settledDate = '';
      // Find the payment that settled it (the one that brought balance to 0)
      if (d.transactions && d.transactions.length > 0) {
        var payments = d.transactions.filter(function(t) { return t.type === 'payment'; });
        if (payments.length > 0) {
          settledDate = formatDateSafe(payments[payments.length - 1].date);
        }
      }
      return '<div class="debt-manage-item paid-item">' +
        '<div class="debt-manage-info">' +
          '<div class="debt-manage-name">' + d.customerName + '</div>' +
          '<div class="debt-manage-meta">\u2714\uFE0F Fully settled' +
            (settledDate ? ' \u2022 ' + settledDate : '') +
          '</div>' +
        '</div>' +
        '<div class="debt-manage-amount" style="color:var(--primary);font-size:var(--text-sm);">' +
          'Was ' + formatCurrency(d.amount) +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ============================================
  // PAYMENT SHEET
  // ============================================
  // ============================================
  // DEBT DETAIL OVERLAY
  // ============================================
  function openDebtDetail(debtId) {
    var overlay = document.getElementById('debtDetailOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add('open');
    renderDebtDetail(debtId);
  }

  function closeDebtDetail() {
    var overlay = document.getElementById('debtDetailOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('open');
  }

  function renderDebtDetail(debtId) {
    var debt = state.debts.find(function(d) { return d.id === debtId; });
    if (!debt) return;

    // Ensure legacy migration for this debt
    if (!debt.createdAt) debt.createdAt = new Date().toISOString();
    if (!debt.updatedAt) debt.updatedAt = debt.createdAt;
    if (!debt.transactions) {
      debt.transactions = [{
        id: genId(),
        date: debt.createdAt,
        type: 'debt',
        description: 'Initial',
        amount: debt.amount
      }];
    }

    // ── Customer name ──
    var nameEl = document.getElementById('debtDetailName');
    if (nameEl) nameEl.textContent = debt.customerName;

    // ── Balance card ──
    var balanceEl = document.getElementById('debtDetailBalance');
    if (balanceEl) {
      balanceEl.textContent = formatCurrency(debt.remainingBalance);
      balanceEl.className = 'debt-detail-balance';
      if (debt.remainingBalance <= 0) balanceEl.classList.add('settled');
      else balanceEl.classList.add('outstanding');
    }

    var settledBadge = document.getElementById('debtDetailSettledBadge');
    if (settledBadge) {
      settledBadge.style.display = debt.remainingBalance <= 0 ? 'block' : 'none';
    }

    var createdLabel = document.getElementById('debtDetailCreated');
    if (createdLabel) {
      var createdDate = formatDateSafe(debt.createdAt);
      createdLabel.textContent = createdDate ? 'Created: ' + createdDate : '';
    }

    // ── Record Payment button ──
    var payBtn = document.getElementById('debtDetailPayBtn');
    if (payBtn) {
      payBtn.style.display = debt.remainingBalance > 0 ? 'flex' : 'none';
      payBtn.setAttribute('data-debt-id', debt.id);
    }

    // ── Revenue conversion: total collected ──
    var totalEl = document.getElementById('debtDetailTotal');
    if (totalEl) totalEl.textContent = formatCurrency(debt.amount);

    var collectedEl = document.getElementById('debtDetailCollected');
    if (collectedEl) {
      var collected = debt.amount - debt.remainingBalance;
      collectedEl.textContent = formatCurrency(collected);
    }

    // ── Transaction history — chronological with running balance ──
    var historyList = document.getElementById('debtDetailHistory');
    if (!historyList) return;

    // Collect all transactions and sort by date
    var allEntries = [];
    if (debt.transactions && debt.transactions.length > 0) {
      allEntries = debt.transactions.slice().sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
      });
    } else {
      // Fallback: create initial debt entry
      allEntries.push({ id: genId(), date: debt.createdAt, type: 'debt', description: 'Initial', amount: debt.amount });
    }

    // Compute running balance
    var runningBalance = 0;
    var html = '';
    allEntries.forEach(function(entry) {
      if (entry.type === 'debt') {
        runningBalance += entry.amount;
      } else if (entry.type === 'payment') {
        runningBalance -= entry.amount;
      }

      var entryDate = formatDateSafe(entry.date);
      var icon = entry.type === 'debt' ? '\ud83d\udfe2' : '\ud83d\udfe0';
      var typeLabel = entry.type === 'debt' ? 'Added' : 'Payment';
      var desc = entry.description || (entry.type === 'payment' ? 'Payment received' : 'Debt recorded');

      html += '<div class="debt-history-row">' +
        '<div class="debt-history-icon">' + icon + '</div>' +
        '<div class="debt-history-info">' +
          '<div class="debt-history-desc">' + desc + '</div>' +
          '<div class="debt-history-date">' + entryDate + ' \u2022 ' + typeLabel + '</div>' +
        '</div>' +
        '<div class="debt-history-amount ' + (entry.type === 'debt' ? 'added' : 'paid') + '">' +
          (entry.type === 'debt' ? '+' : '-') + formatCurrency(entry.amount) +
        '</div>' +
        '<div class="debt-history-running">' + formatCurrency(runningBalance) + '</div>' +
      '</div>';
    });

    historyList.innerHTML = html;
  }

  // ============================================
  // PAID DEBTS COLLAPSIBLE
  // ============================================
  function togglePaidDebts() {
    var section = document.getElementById('paidDebtsSection');
    if (section) section.classList.toggle('collapsed');
  }

  function openPaymentSheet(debtId) {
    var debt = state.debts.find(function(d) { return d.id === debtId; });
    if (!debt) return;
    state.paymentDebtId = debtId;
    closeSaleSheet();
    if (dom.paymentCustomerName) dom.paymentCustomerName.textContent = debt.customerName;
    if (dom.paymentCustomerBalance) dom.paymentCustomerBalance.textContent = t('payBalance', { amount: formatCurrency(debt.remainingBalance) });
    if (dom.paymentAmount) dom.paymentAmount.value = '';
    if (dom.paymentRemaining) dom.paymentRemaining.textContent = formatCurrency(debt.remainingBalance);
    if (dom.paymentSheetOverlay) dom.paymentSheetOverlay.classList.add('open');
  }

  function closePaymentSheet() {
    if (dom.paymentSheetOverlay) dom.paymentSheetOverlay.classList.remove('open');
    state.paymentDebtId = null;
  }

  function updatePaymentPreview() {
    var debt = state.debts.find(function(d) { return d.id === state.paymentDebtId; });
    if (!debt || !dom.paymentAmount || !dom.paymentRemaining) return;
    var amount = parseFloat(dom.paymentAmount.value) || 0;
    var remaining = Math.max(0, debt.remainingBalance - amount);
    dom.paymentRemaining.textContent = formatCurrency(remaining);
  }

  function savePayment() {
    var debt = state.debts.find(function(d) { return d.id === state.paymentDebtId; });
    if (!debt) return;
    var amount = parseFloat(dom.paymentAmount ? dom.paymentAmount.value : 0) || 0;
    if (amount <= 0) { showToast('Ilagay ang tamang halaga.', 'error'); return; }
    if (amount > debt.remainingBalance) { showToast('Ang halaga ay lumampas sa natitirang balanse.', 'error'); return; }

    if (!debt.transactions) debt.transactions = [];
    debt.transactions.push({ id: genId(), date: new Date().toISOString(), type: 'payment', amount: amount });
    debt.remainingBalance -= amount;
    debt.updatedAt = new Date().toISOString();

    saveState();
    closePaymentSheet();
    closeDebtDetail();
    renderManageDebts();
    renderMorningCheck();
    showToast(t('paymentSaved'));
  }

  // ============================================
  // NEW DEBT
  // ============================================
  function openNewDebt() {
    if (dom.newDebtCustomer) dom.newDebtCustomer.value = '';
    if (dom.newDebtAmount) dom.newDebtAmount.value = '';
    if (dom.newDebtSuggestions) dom.newDebtSuggestions.classList.remove('open');
    // (overlay replaced by separate new_debt.html page)
  }

  function onNewDebtCustomerSearch() {
    updateNewDebtCreditWarn();
    if (!dom.newDebtCustomer || !dom.newDebtSuggestions) return;
    var query = dom.newDebtCustomer.value.toLowerCase().trim();
    if (!query) {
      dom.newDebtSuggestions.classList.remove('open');
      return;
    }
    var names = {};
    state.debts.forEach(function(d) { names[d.customerName] = true; });
    state.sales.forEach(function(s) { if (s.customerName) names[s.customerName] = true; });
    var matches = Object.keys(names).filter(function(n) {
      return n.toLowerCase().includes(query);
    }).slice(0, 5);

    if (matches.length === 0) {
      dom.newDebtSuggestions.classList.remove('open');
      return;
    }

    // Build debt balance lookup map
    var debtBalances = {};
    state.debts.forEach(function(d) {
      if (d.remainingBalance > 0) {
        debtBalances[d.customerName] = (debtBalances[d.customerName] || 0) + d.remainingBalance;
      }
    });

    dom.newDebtSuggestions.innerHTML = matches.map(function(name) {
      var balance = debtBalances[name] || 0;
      return '<div class="customer-suggestion-item" onclick="window.selectNewDebtCustomer(\'' + name.replace(/'/g, "\\'") + '\')">' +
        '<span class="customer-suggestion-name">' + name + '</span>' +
        suggestionBalanceHtml(name, balance) +
        '</div>';
    }).join('');
    dom.newDebtSuggestions.classList.add('open');
  }

  function selectNewDebtCustomer(name) {
    if (dom.newDebtCustomer) dom.newDebtCustomer.value = name;
    if (dom.newDebtSuggestions) dom.newDebtSuggestions.classList.remove('open');
    updateNewDebtCreditWarn();
  }

  /** Live warning for the New Debt form — recomputed as name/amount change. */
  function updateNewDebtCreditWarn() {
    if (!dom.newDebtCreditWarn) return;
    if (dom.newDebtAllowAnyway) dom.newDebtAllowAnyway.style.display = 'none';
    var customer = dom.newDebtCustomer ? dom.newDebtCustomer.value.trim() : '';
    if (!customer) { hideCreditWarn('newDebtCreditWarn'); return; }
    var amount = parseFloat(dom.newDebtAmount ? dom.newDebtAmount.value : 0) || 0;
    var cs = getCreditStatus(customer, amount);
    if (cs.overLimit) {
      showCreditWarn('newDebtCreditWarn', creditWarnKey(cs), cs, customer);
      if (dom.newDebtAllowAnyway) dom.newDebtAllowAnyway.style.display = 'block';
    } else if (cs.nearLimit) {
      showCreditWarn('newDebtCreditWarn', 'creditWarnNear', cs, customer);
    } else {
      hideCreditWarn('newDebtCreditWarn');
    }
  }

  function closeNewDebt() {
  }

  function saveNewDebt(force) {
    var customer = dom.newDebtCustomer ? dom.newDebtCustomer.value.trim() : '';
    var amount = parseFloat(dom.newDebtAmount ? dom.newDebtAmount.value : 0) || 0;

    if (!customer) { showToast('Ilagay ang pangalan ng kostumer.', 'error'); return; }
    if (amount <= 0) { showToast('Ilagay ang tamang halaga.', 'error'); return; }

    // Credit-limit gate (v2.56): block with a warning; "Allow anyway" re-invokes force.
    if (!force) {
      var cs = getCreditStatus(customer, amount);
      if (cs.overLimit) {
        // Alert when the entry is at/over the customer's credit limit (v2.57)
        var warnKey = creditWarnKey(cs);
        showCreditWarn('newDebtCreditWarn', warnKey, cs, customer);
        if (dom.newDebtAllowAnyway) dom.newDebtAllowAnyway.style.display = 'block';
        showToast(creditWarnMessage(warnKey, cs, customer), 'error');
        return;
      }
    }

    var existingDebt = state.debts.find(function(d) {
      return d.customerName.toLowerCase() === customer.toLowerCase() && d.remainingBalance > 0;
    });
    if (existingDebt) {
      existingDebt.amount += amount;
      existingDebt.remainingBalance += amount;
      existingDebt.updatedAt = new Date().toISOString();
      // Save phone if provided and debt doesn't have one yet
      var phoneVal2 = dom.newDebtPhone ? dom.newDebtPhone.value.trim() : '';
      if (phoneVal2 && !existingDebt.phone) existingDebt.phone = phoneVal2;
      if (!existingDebt.transactions) existingDebt.transactions = [];
      existingDebt.transactions.push({ id: genId(), date: new Date().toISOString(), type: 'debt', description: 'Manual', amount: amount });
    } else {
      var phoneVal = dom.newDebtPhone ? dom.newDebtPhone.value.trim() : '';
      state.debts.push({
        id: genId(), customerName: customer, amount: amount, remainingBalance: amount,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        phone: phoneVal,
        transactions: [{ id: genId(), date: new Date().toISOString(), type: 'debt', description: 'Manual', amount: amount }]
      });
    }

    // Also record a specific sale so Debt Today on the Day page picks it up
    state.sales.unshift({
      id: genId(),
      date: todayStr(),
      productName: 'Manual debt: ' + customer,
      amount: amount,
      quantity: 1,
      customerName: customer,
      profit: 0
    });

    saveState();
    closeNewDebt();
    hideCreditWarn('newDebtCreditWarn');
    if (dom.newDebtAllowAnyway) dom.newDebtAllowAnyway.style.display = 'none';
    showToast(t('debtSaved'));
    // Redirect back to debts page. replace() so Back after saving skips the
    // just-exited form instead of revisiting it (v2.51 history unification).
    window.location.replace('debts.html');
  }

  // ============================================
  // LANGUAGE CHIP HELPERS
  // ============================================
  function getSelectedLang(container) {
    var btn = container && container.querySelector('.lang-chip-btn.active');
    return btn ? btn.dataset.lang : 'fil';
  }
  function setActiveLang(container, lang) {
    if (!container) return;
    container.querySelectorAll('.lang-chip-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
  }
  function setLanguage(lang) {
    setActiveLang(dom.settingsLanguage, lang);
    saveSettings();
  }
  function setSetupLanguage(lang) {
    setActiveLang(dom.setupLanguage, lang);
    state.settings.language = lang;
    applyTranslations();
  }

  // ============================================
  // SETTINGS
  // ============================================
  function saveSettings() {
    if (dom.settingsLanguage) state.settings.language = getSelectedLang(dom.settingsLanguage);
    if (dom.settingsStoreName) state.settings.storeName = dom.settingsStoreName.value.trim() || state.settings.storeName;
    if (dom.settingsOwnerName) state.settings.ownerName = dom.settingsOwnerName.value.trim() || state.settings.ownerName;
    if (dom.settingsDefaultMarkup) {
      var mk = parseInt(dom.settingsDefaultMarkup.value, 10);
      if (!isNaN(mk) && mk >= 0) state.settings.defaultMarkup = Math.min(mk, 200);
    }
    if (dom.settingsLowStockThreshold) {
      var lt = parseInt(dom.settingsLowStockThreshold.value, 10);
      if (!isNaN(lt) && lt >= 0) state.settings.lowStockThreshold = lt;
    }
    if (dom.settingsDefaultCreditLimit) {
      var cl = parseInt(dom.settingsDefaultCreditLimit.value, 10);
      if (!isNaN(cl) && cl >= 0) state.settings.defaultCreditLimit = Math.min(cl, 10000);
    }
    saveState();
    // Apply translations to all data-i18n elements on this page
    applyTranslations();
    applyTextSize();
    renderMorningCheck();
    showToast(t('saved'));
  }

  // ============================================
  // DATA MANAGEMENT
  // ============================================
  function resetData() {
    showConfirmModal(t('confirmReset'), '', t('resetDataBtn')).then(function(ok) {
      if (!ok) return;
      state.products = getSampleProducts();
      state.sales = [];
      state.debts = [];
      state.history = [];
      state.dayOpen = false;
      state.todayExpenses = 0;
      state.todayEarnings = 0;
      state.expenseLog = [];
      state.settings.launchCount = 0;
      try { localStorage.removeItem('sss_v3_reportPeriod'); } catch(e) {}
      saveState();
      renderMorningCheck();
      renderManageInventory();
      renderManageDebts();
      showToast(t('dataReset'));
    });
  }

  function exportData() {
    var exportObj = {
      settings: state.settings, products: state.products,
      sales: state.sales, debts: state.debts, history: state.history,
      expenseLog: state.expenseLog || [],
      exportedAt: new Date().toISOString()
    };
    var dataStr = JSON.stringify(exportObj, null, 2);
    var blob = new Blob([dataStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'tindago-data-' + todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported!');
  }

  // ============================================
  // DEVELOPER PANEL (Shift+N)
  // ============================================
  function buildDevPanel() {
    var panel = document.createElement('div');
    panel.className = 'dev-panel-overlay';
    panel.id = 'devPanelOverlay';
    panel.innerHTML =
      '<div class="dev-panel">' +
        '<div class="dev-panel-header">' +
          '<h2 style="font-size:18px;font-weight:700;color:#e2e8f0;">Developer Panel</h2>' +
          '<button class="dev-panel-close" onclick="toggleDevPanel()">\u2715</button>' +
        '</div>' +
        '<div class="dev-panel-content">' +
          '<div class="dev-panel-section">' +
            '<div class="dev-panel-section-title">Sales &amp; Data</div>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'resetTodaySales\')">Reset Today\'s Sales</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'generateTestSale\')">Generate Test Sale Entry</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'addSampleDebts\')">Add Sample Debts</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'exportCsv\')">Export All Data (CSV)</button>' +
          '</div>' +
          '<div class="dev-panel-section">' +
            '<div class="dev-panel-section-title">Restock</div>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'clearRestockData\')">Clear Restock Data</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'setRestockDate\')">Set Restock Date to Today</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'viewRestockLog\')">View Restock Log</button>' +
          '</div>' +
          '<div class="dev-panel-section">' +
            '<div class="dev-panel-section-title">Day State</div>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'toggleDayOpen\')">Toggle Day Open/Close</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'startNewDay\')">Start New Day (Archive + Open)</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'archiveDaySales\')">Archive Today\'s Sales</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'setDateOverride\')">Set Date Override (temp)</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'clearDateOverride\')">Clear Date Override</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'setTimeOverride\')">Set Time Override (temp)</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'clearTimeOverride\')">Clear Time Override</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'resetTutorial\')">Reset Tutorial State</button>' +
          '</div>' +
          '<div class="dev-panel-section">' +
            '<div class="dev-panel-section-title">Inventory</div>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'clearInventory\')">Clear All Inventory</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'seedProducts\')">Seed Sample Products</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'bulkAddItems\')">Bulk Add Items</button>' +
          '</div>' +
          '<div class="dev-panel-section">' +
            '<div class="dev-panel-section-title">Advanced</div>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'viewRawState\')">View Raw State (JSON)</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'exportData\')">Export All Data</button>' +
            '<button class="dev-panel-btn" onclick="handleDevAction(\'importData\')">Import Data</button>' +
            '<button class="dev-panel-btn dev-panel-btn-danger" onclick="handleDevAction(\'resetAll\')">Reset All Application Data</button>' +
          '</div>' +
          '<div class="dev-panel-section">' +
            '<div class="dev-panel-section-title">Clear Specific Data</div>' +
            '<div id="devPanelCheckboxes">' +
              '<label class="dev-panel-checkbox"><input type="checkbox" id="devChkProducts"> Products</label>' +
              '<label class="dev-panel-checkbox"><input type="checkbox" id="devChkSales"> Sales</label>' +
              '<label class="dev-panel-checkbox"><input type="checkbox" id="devChkDebts"> Debts</label>' +
              '<label class="dev-panel-checkbox"><input type="checkbox" id="devChkHistory"> History</label>' +
              '<label class="dev-panel-checkbox"><input type="checkbox" id="devChkExpenses"> Expenses</label>' +
              '<label class="dev-panel-checkbox"><input type="checkbox" id="devChkSettings"> Settings</label>' +
            '</div>' +
            '<button class="dev-panel-btn dev-panel-btn-danger" onclick="handleDevAction(\'clearSelected\')">Clear Selected Datasets</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);
  }

  function toggleDevPanel() {
    var panel = document.getElementById('devPanelOverlay');
    if (!panel) { buildDevPanel(); panel = document.getElementById('devPanelOverlay'); }
    panel.classList.toggle('open');
  }

  function handleDevAction(action) {
    switch(action) {
      case 'resetTodaySales':
        state.sales = state.sales.filter(function(s) { return s.date !== todayStr(); });
        saveState(); showToast('Today\'s sales reset.');
        break;
      case 'generateTestSale':
        if (state.products.length === 0) { showToast('No products to test with.', 'error'); return; }
        var p = state.products[Math.floor(Math.random() * state.products.length)];
        var qty = Math.floor(Math.random() * 3) + 1;
        var amount = p.sellingPrice * qty;
        state.sales.push({
          id: genId(), date: todayStr(), createdAt: new Date().toISOString(),
          productName: p.name, productId: p.id, quantity: qty, amount: amount,
          costPrice: p.costPrice || 0,
          profit: (p.sellingPrice - (p.costPrice || 0)) * qty,
          customerName: null
        });
        saveState(); showToast('Test sale: ' + p.name + ' x' + qty + ' = ' + formatCurrency(amount));
        break;
      case 'addSampleDebts':
        var names = ['Maria Santos', 'Juan Dela Cruz', 'Pedro Reyes', 'Ana Gonzales', 'Jose Rizal', 'Elena Bautista', 'Carlos Medina'];
        names.forEach(function(n) {
          var amt = Math.round((Math.random() * 200 + 50) * 100) / 100;
          state.debts.push({
            id: genId(), customerName: n, amount: amt, remainingBalance: amt,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            transactions: [{ id: genId(), date: new Date().toISOString(), type: 'debt', description: 'Sample debt', amount: amt }]
          });
        });
        saveState(); showToast('7 sample debts added.');
        break;
      case 'clearInventory':
        state.products = [];
        saveState(); showToast('Inventory cleared.');
        break;
      case 'seedProducts':
        state.products = getSampleProducts();
        saveState(); showToast('Sample products loaded.');
        break;
      case 'bulkAddItems':
        var count = prompt('How many items to add? (1-50)', '10');
        count = parseInt(count) || 10;
        if (count < 1) count = 1; if (count > 50) count = 50;
        for (var i = 0; i < count; i++) {
          var cost = Math.round((Math.random() * 90 + 5) * 100) / 100;
          var markup = 1 + (Math.random() * 0.5 + 0.1);
          state.products.push({
            id: genId(), name: 'Test Item ' + (state.products.length + 1),
            quantity: Math.floor(Math.random() * 50) + 1,
            costPrice: cost, sellingPrice: Math.round(cost * markup * 100) / 100
          });
        }
        saveState(); showToast(count + ' items added.');
        break;
      case 'viewRawState':
        var summary = 'Products: ' + state.products.length + '\nSales: ' + state.sales.length + '\nDebts: ' + state.debts.length + '\nHistory: ' + state.history.length + '\nExpenses: ' + (state.expenseLog || []).length + '\nDay Open: ' + state.dayOpen + '\n\nFirst 3 products:\n';
        state.products.slice(0, 3).forEach(function(p) { summary += '- ' + p.name + ' (' + p.quantity + ' @ ' + formatCurrency(p.sellingPrice) + ')\n'; });
        alert(summary);
        break;
      case 'exportData':
        exportData();
        break;
      case 'importData':
        (function() {
          var input = document.createElement('input');
          input.type = 'file'; input.accept = '.json';
          input.onchange = function(e) {
            var reader = new FileReader();
            reader.onload = function(ev) {
              try {
                var data = JSON.parse(ev.target.result);
                if (data.products) state.products = data.products;
                if (data.sales) state.sales = data.sales;
                if (data.debts) state.debts = data.debts;
                if (data.history) state.history = data.history;
                if (data.expenseLog) state.expenseLog = data.expenseLog;
                if (data.settings) state.settings = data.settings;
                if (data.dayOpen !== undefined) state.dayOpen = data.dayOpen;
                saveState(); showToast('Data imported successfully!');
              } catch(err) { showToast('Invalid JSON file.', 'error'); }
            };
            reader.readAsText(input.files[0]);
          };
          input.click();
        })();
        break;
      case 'resetAll':
        showConfirmModal('Reset ALL application data? This cannot be undone.', '', 'Reset All').then(function(ok) {
        if (!ok) return;
        state.products = getSampleProducts();
        state.sales = []; state.debts = []; state.history = [];
        state.dayOpen = false; state.todayExpenses = 0; state.todayEarnings = 0;
        state.expenseLog = [];
        state.settings.hasCompletedSetup = false;
        state.settings.launchCount = 0;
        devDateOverride = null; // factory reset also clears the temporary dev override
        devTimeOverride = null; // ...and the temporary dev time override
        devStateSnapshot = null;
        try { sessionStorage.removeItem('sss_v3_devDateOverride'); } catch(e) {}
        try { sessionStorage.removeItem('sss_v3_devSnapshot'); } catch(e) {}
        try { sessionStorage.removeItem('sss_v3_devTimeOverride'); } catch(e) {}
        saveState();
        window.location.href = 'index.html';
        });
        break;
      case 'clearSelected':
        (function() {
          var msg = [];
          if (document.getElementById('devChkProducts') && document.getElementById('devChkProducts').checked) { state.products = getSampleProducts(); msg.push('Products'); }
          if (document.getElementById('devChkSales') && document.getElementById('devChkSales').checked) { state.sales = []; msg.push('Sales'); }
          if (document.getElementById('devChkDebts') && document.getElementById('devChkDebts').checked) { state.debts = []; msg.push('Debts'); }
          if (document.getElementById('devChkHistory') && document.getElementById('devChkHistory').checked) { state.history = []; msg.push('History'); }
          if (document.getElementById('devChkExpenses') && document.getElementById('devChkExpenses').checked) { state.expenseLog = []; msg.push('Expenses'); }
          if (document.getElementById('devChkSettings') && document.getElementById('devChkSettings').checked) { state.settings = { language: 'fil', storeName: 'Aking Tindahan', ownerName: 'May-ari', hasCompletedSetup: true, defaultMarkup: 20, lowStockThreshold: 5, defaultCreditLimit: 500 }; msg.push('Settings'); }
          if (msg.length > 0) { saveState(); showToast('Cleared: ' + msg.join(', ')); }
          else { showToast('No datasets selected.', 'error'); }
        })();
        break;
      case 'exportCsv':
        (function() {
          var csv = 'TindaGo - Data Export\n';
          csv += 'Exported: ' + new Date().toISOString() + '\n\n';
          csv += '=== PRODUCTS ===\n';
          csv += 'Name,Quantity,Cost,Sell Price,Markup\n';
          state.products.forEach(function(p) {
            var margin = p.costPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.costPrice * 100).toFixed(1) + '%' : 'N/A';
            csv += p.name + ',' + p.quantity + ',' + p.costPrice + ',' + p.sellingPrice + ',' + margin + '\n';
          });
          csv += '\n=== TODAY\'S SALES ===\n';
          csv += 'Product,Quantity,Amount,Profit,Customer\n';
          getTodaySales().forEach(function(s) {
            csv += (s.productName || 'Unknown') + ',' + (s.quantity || 1) + ',' + s.amount + ',' + (s.profit || 0) + ',' + (s.customerName || 'Cash') + '\n';
          });
          csv += '\n=== DEBTS ===\n';
          csv += 'Customer,Amount,Remaining\n';
          state.debts.filter(function(d) { return d.remainingBalance > 0; }).forEach(function(d) {
            csv += d.customerName + ',' + d.amount + ',' + d.remainingBalance + '\n';
          });
          var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          var link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'tindago-data.csv';
          link.click();
          showToast('CSV exported!');
        })();
        break;
      case 'toggleDayOpen':
        state.dayOpen = !state.dayOpen;
        saveState();
        showToast('Day ' + (state.dayOpen ? 'opened' : 'closed') + ' manually.');
        toggleDevPanel();
        if (pageName === 'morning') renderMorningCheck();
        break;
      case 'startNewDay':
        // Always archive current day's sales before creating fresh day
        archiveDaySales();
        // Initialize a fresh pre-opening day for today
        state.dayDate = todayStr();
        state.dayArchived = true;   // sales were archived, so "Edit Closing" condition won't match
        state.dayOpen = false;
        state.todayExpenses = 0;
        state.todayEarnings = 0;
        saveState();
        showToast('New day started! Tap "Start the Day" to open store.');
        toggleDevPanel();
        if (pageName === 'morning') renderMorningCheck();
        break;
      case 'archiveDaySales':
        archiveDaySales();
        saveState();
        showToast('Sales archived.');
        break;
      case 'setDateOverride':
        var ov = prompt('Enter override date (YYYY-MM-DD), or blank to clear:', devDateOverride || '');
        if (ov === null) break;
        ov = (ov || '').trim();
        if (ov && (!/^\d{4}-\d{2}-\d{2}$/.test(ov) || isNaN(new Date(ov + 'T00:00:00').getTime()))) {
          showToast('Invalid date. Use a real YYYY-MM-DD date.', 'error');
          return;
        }
        if (ov && !devStateSnapshot) captureDevSnapshot(); // snapshot pre-test business state
        devDateOverride = ov || null;
        try {
          if (devDateOverride) sessionStorage.setItem('sss_v3_devDateOverride', devDateOverride);
          else sessionStorage.removeItem('sss_v3_devDateOverride');
        } catch(e) {}
        if (!devDateOverride) restoreDevSnapshot(); // blank input = clear → restore state
        showToast(devDateOverride ? 'Dev date override set to ' + devDateOverride + ' (temporary, clears on tab close).' : 'Dev date override cleared. Business state restored.');
        toggleDevPanel();
        if (pageName === 'morning') renderMorningCheck();
        break;
      case 'clearDateOverride':
        devDateOverride = null;
        try { sessionStorage.removeItem('sss_v3_devDateOverride'); } catch(e) {}
        restoreDevSnapshot(); // restore the exact pre-test business state
        showToast('Dev date override cleared. Business state restored.');
        toggleDevPanel();
        if (pageName === 'morning') renderMorningCheck();
        break;
      case 'setTimeOverride':
        var tOv = prompt('Enter override hour (0-23), or blank to clear:', devTimeOverride !== null ? String(devTimeOverride) : '');
        if (tOv === null) break;
        tOv = (tOv || '').trim();
        if (tOv) {
          var hour = parseInt(tOv, 10);
          if (isNaN(hour) || hour < 0 || hour > 23) {
            showToast('Invalid hour. Use 0-23.', 'error');
            return;
          }
          devTimeOverride = hour;
          try { sessionStorage.setItem('sss_v3_devTimeOverride', String(hour)); } catch(e) {}
          showToast('Dev time override set to ' + hour + ':00 (temporary, clears on tab close).');
        } else {
          devTimeOverride = null;
          try { sessionStorage.removeItem('sss_v3_devTimeOverride'); } catch(e) {}
          showToast('Dev time override cleared. Real clock restored.');
        }
        toggleDevPanel();
        if (pageName === 'morning') renderMorningCheck();
        break;
      case 'clearTimeOverride':
        devTimeOverride = null;
        try { sessionStorage.removeItem('sss_v3_devTimeOverride'); } catch(e) {}
        showToast('Dev time override cleared. Real clock restored.');
        toggleDevPanel();
        if (pageName === 'morning') renderMorningCheck();
        break;
      case 'resetTutorial':
        state.settings.launchCount = 0;
        state.settings.hasCompletedSetup = true;
        try { sessionStorage.removeItem('sss_v3_tutorialShown'); } catch(e) {}
        saveState();
        showToast('Tutorial state reset. Will show on next launch.');
        break;
      case 'clearRestockData':
        localStorage.removeItem('sss_v3_lastRestockDate');
        state.restockLog = [];
        saveState();
        showToast('Restock data cleared.');
        break;
      case 'setRestockDate':
        localStorage.setItem('sss_v3_lastRestockDate', todayStr());
        showToast('Restock date set to today.');
        break;
      case 'viewRestockLog':
        var lastDate = localStorage.getItem('sss_v3_lastRestockDate');
        var logCount = (state.restockLog && state.restockLog.length) || 0;
        if (lastDate) {
          showToast('Last restock: ' + lastDate + ' | Log entries: ' + logCount);
        } else {
          showToast('No restock data recorded.');
        }
        break;
    }
    // Refresh UI
    renderMorningCheck();
    renderManageInventory();
    renderManageDebts();
  }

  // ============================================
  // EVENT WIRING
  // ============================================
  function setupEvents() {
    if (dom.closingActualSales) dom.closingActualSales.addEventListener('input', updateClosingTotal);
    if (dom.productCost) dom.productCost.addEventListener('input', updateMarkupHint);
    if (dom.productMarkup) dom.productMarkup.addEventListener('input', updateMarkupHint);
    if (dom.productPrice) {
      dom.productPrice.addEventListener('input', function() {
        if (_suppressPriceListener) return;
        _userEditedPrice = true;
      });
      dom.productPrice.addEventListener('input', updateMarkupHint);
    }

    document.addEventListener('keydown', function(e) {
      // Shift+N: toggle developer panel
      if (e.key === 'N' && e.shiftKey && !e.repeat) {
        e.preventDefault();
        toggleDevPanel();
        return;
      }
      if (e.key === 'Escape') {
        // Close dev panel first if open
        var devPanel = document.getElementById('devPanelOverlay');
        if (devPanel && devPanel.classList.contains('open')) { toggleDevPanel(); return; }
        // Standalone checkout page: Escape goes back to Day (guards the cart)
        if (pageName === 'checkout') { closeSaleSheet(); return; }
        if (dom.saleSheetOverlay && dom.saleSheetOverlay.classList.contains('open')) closeSaleSheet();
        if (dom.paymentSheetOverlay && dom.paymentSheetOverlay.classList.contains('open')) closePaymentSheet();
      }
    });

    if (dom.saleSheetOverlay) {
      dom.saleSheetOverlay.addEventListener('click', function(e) {
        if (e.target === dom.saleSheetOverlay) closeSaleSheet();
      });
    }
    if (dom.paymentSheetOverlay) {
      dom.paymentSheetOverlay.addEventListener('click', function(e) {
        if (e.target === dom.paymentSheetOverlay) closePaymentSheet();
      });
    }
  }

  // ============================================
  // INIT
  // ============================================
  // ============================================
  // HISTORY-AWARE BACK NAVIGATION
  // ============================================
  /**
   * Navigate back using the browser's native history stack.
   * Only uses history.back() if the user came from within the app
   * (same origin), falling back to morning.html for direct bookmarks.
   */
  function historyBack() {
    var referrer = document.referrer || '';
    // Same-origin referrer covers the normal http-served flow. When the
    // referrer is empty (file:// / fresh-tab opens), history.length > 1 means
    // in-app history still exists, so pop it. We deliberately do NOT pop on a
    // non-empty external referrer even if history.length > 1 — that would
    // navigate OUT of the app (v2.23 guard preserved). Falls back to
    // morning.html only when there is genuinely nowhere to go back to.
    if (referrer.indexOf(window.location.origin) === 0 ||
        (!referrer && window.history.length > 1)) {
      window.history.back();
    } else {
      window.location.href = 'morning.html';
    }
  }

  // ============================================
  // PRODUCT DETAIL PAGE (product_detail.html)
  // ============================================
  function renderProductDetail() {
    var container = document.getElementById('pdContainer');
    if (!container) return;
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var product = state.products.find(function(p) { return p.id === id; });
    if (!product) {
      container.innerHTML = '<div class="empty-state">' + t('productNotFound') + '</div>';
      return;
    }
    var titleEl = document.getElementById('pdProductTitle');
    if (titleEl) titleEl.textContent = product.name;

    var status = getStockStatus(product);
    var statusColor = status === 'plenty' ? '#16a34a' : (status === 'low' ? '#d97706' : '#dc2626');
    var statusBg = status === 'plenty' ? '#f0fdf4' : (status === 'low' ? '#fffbeb' : '#fef2f2');
    var margin = product.costPrice > 0 ? Math.round(((product.sellingPrice - product.costPrice) / product.costPrice) * 100) : 0;

    var alertHtml = '';
    if (status === 'out') {
      alertHtml = '<div id="pdStockAlert" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;margin-bottom:16px;">' +
        '<div style="font-weight:700;color:#b91c1c;">' + t('criticalStockAlert') + '</div>' +
        '<div style="font-size:var(--text-sm);color:#dc2626;">' + t('criticalAlertDesc') + '</div></div>';
    }

    // Product details row (category / brand / unit / size) — shown when set
    var details = [];
    if (product.category) details.push('<span class="pd-tag">' + productCategoryLabel(product.category) + '</span>');
    if (product.brand) details.push('<span class="pd-tag">' + esc(product.brand) + '</span>');
    if (product.unit && product.unit !== 'piece') details.push('<span class="pd-tag">' + productUnitLabel(product.unit) + '</span>');
    if (product.packageSize) details.push('<span class="pd-tag">' + esc(product.packageSize) + '</span>');
    var detailsHtml = details.length ?
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">' + details.join('') + '</div>' : '';

    // Offline demand-forecast detail card (Stage 4). Safe no-op when
    // forecast.js isn't loaded or the engine is unavailable.
    var forecastHtml = '';
    if (window.ForecastEngine) {
      try {
        var fcAllSales = window.ForecastEngine.buildAllSalesFromWeb(state);
        var fcResult = window.ForecastEngine.forecastForProduct(product, fcAllSales, todayStr(), 7);
        forecastHtml = forecastDetailCardHtml(fcResult, product);
      } catch(e) { forecastHtml = ''; }
    }

    container.innerHTML =
      alertHtml +
      forecastHtml +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;">' +
        '<div style="display:flex;align-items:center;gap:14px;">' +
          '<div style="width:56px;height:56px;border-radius:10px;background:' + statusBg + ';display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:' + statusColor + ';">' + product.quantity + '</div>' +
          '<div><div style="font-size:var(--text-sm);color:#94a3b8;">' + t('stockLabel') + '</div>' +
          '<div style="font-weight:700;color:#1e293b;">' + product.name + '</div></div>' +
        '</div>' +
        detailsHtml +
        '<div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;">' +
          '<div style="text-align:center;flex:1;"><div style="font-size:var(--text-sm);color:#94a3b8;">' + t('costPrice') + '</div><div style="font-weight:700;">' + formatCurrency(product.costPrice) + '</div></div>' +
          '<div style="text-align:center;flex:1;"><div style="font-size:var(--text-sm);color:#94a3b8;">' + t('sellPrice') + '</div><div style="font-weight:700;color:#16a34a;">' + formatCurrency(product.sellingPrice) + '</div></div>' +
          '<div style="text-align:center;flex:1;"><div style="font-size:var(--text-sm);color:#94a3b8;">' + t('profitMargin') + '</div><div style="font-weight:700;color:' + (margin >= 15 ? '#16a34a' : (margin > 0 ? '#d97706' : '#94a3b8')) + ';">' + (margin > 0 ? '+' + margin + '%' : '--') + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div id="pdActions" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;">' +
        '<div style="font-weight:700;color:#1e293b;margin-bottom:10px;">' + t('deductStock') + '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<input type="number" id="pdDeductQty" class="form-input" placeholder="1" min="1" style="flex:1;">' +
          '<button class="btn btn-primary" onclick="deductWebStock(\'' + product.id + '\')">' + t('deductBtn') + '</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;">' +
          '<a href="restock.html" class="btn btn-outline" style="flex:1;text-decoration:none;">' + t('restockBtn') + '</a>' +
          '<button class="btn btn-outline" style="flex:1;" onclick="window.editProduct(\'' + product.id + '\')">' + t('editBtn') + '</button>' +
        '</div>' +
      '</div>' +
      '<button id="pdDeleteBtn" class="btn btn-secondary btn-full" style="border:1px solid #fca5a5;color:#dc2626;" onclick="deleteWebProduct(\'' + product.id + '\')">🗑️ ' + t('deleteBtn') + '</button>';
  }

  function deductWebStock(id) {
    var product = state.products.find(function(p) { return p.id === id; });
    if (!product) return;
    var qty = parseInt(document.getElementById('pdDeductQty') ? document.getElementById('pdDeductQty').value : '1') || 1;
    if (qty <= 0 || qty > product.quantity) { showToast(t('enterAmount'), 'error'); return; }
    product.quantity -= qty;
    saveState();
    renderProductDetail();
    showToast(t('saved'));
  }

  function deleteWebProduct(id) {
    var product = state.products.find(function(p) { return p.id === id; });
    if (!product) return;
    showConfirmModal(t('confirmDeleteProduct'), '', t('deleteBtn')).then(function(ok) {
      if (!ok) return;
      state.products = state.products.filter(function(p) { return p.id !== id; });
      saveState();
      window.location.href = 'inventory.html';
    });
  }

  // ============================================
  // DEBTOR DETAIL PAGE (debtor_detail.html)
  // ============================================
  function renderDebtorDetail() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var debt = state.debts.find(function(d) { return d.id === id; });
    var nameEl = document.getElementById('debtorDetailName');
    var balanceCard = document.getElementById('cddBalanceCard');
    var payBtnEl = document.getElementById('cddRecordPaymentBtn');
    var ledgerEl = document.getElementById('cddLedger');
    if (!debt) {
      if (nameEl) nameEl.textContent = t('customerNotFound');
      if (balanceCard) balanceCard.innerHTML = '<div class="empty-state">' + t('customerNotFound') + '</div>';
      if (payBtnEl) payBtnEl.innerHTML = '';
      if (ledgerEl) ledgerEl.innerHTML = '';
      return;
    }
    if (nameEl) nameEl.textContent = debt.customerName;

    if (!debt.transactions) {
      debt.transactions = [{ id: genId(), date: debt.createdAt || new Date().toISOString(), type: 'debt', description: 'Initial', amount: debt.amount }];
    }

    var settled = debt.remainingBalance <= 0;
    var collected = (debt.amount || 0) - debt.remainingBalance;

    balanceCard.innerHTML =
      '<div style="background:' + (settled ? '#f0fdf4' : '#fffbeb') + ';border-radius:12px;padding:24px;text-align:center;">' +
        '<div style="font-size:var(--text-sm);color:' + (settled ? '#16a34a' : '#b45309') + ';">' + t('currentBalance') + '</div>' +
        '<div style="font-size:34px;font-weight:700;color:' + (settled ? '#16a34a' : '#d97706') + ';">' + formatCurrency(debt.remainingBalance) + '</div>' +
        (settled
          ? '<div style="font-size:var(--text-sm);color:#16a34a;margin-top:4px;">' + t('fullySettled') + '</div>'
          : '<div style="font-size:var(--text-sm);color:#64748b;margin-top:4px;">' + t('lastActivity') + ' ' + formatDateSafe(debt.updatedAt) + '</div>') +
      '</div>';

    payBtnEl.innerHTML =
      '<button class="btn btn-primary btn-large" style="width:100%;" onclick="location.href=\'record_payment.html?id=' + debt.id + '\'">' + t('recordPayment') + '</button>';

    // Credit limit card (v2.56) — per-customer override, defaults to the global setting
    var clContainer = document.getElementById('cddCreditLimit');
    if (clContainer) {
      var hasCustom = typeof debt.creditLimit === 'number' && debt.creditLimit >= 0;
      var effective = hasCustom ? debt.creditLimit : getDefaultCreditLimit();
      clContainer.innerHTML =
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<div style="font-weight:700;color:#1e293b;">' + t('creditLimitLabel') + '</div>' +
            '<button class="btn btn-secondary btn-sm" id="cddCreditLimitEditBtn" onclick="startCreditLimitEdit()">' + t('creditLimitEdit') + '</button>' +
          '</div>' +
          (effective > 0
            ? '<div style="font-size:24px;font-weight:700;color:#16a34a;">' + formatCurrency(effective) + '</div>'
            : '<div style="font-size:24px;font-weight:700;color:#64748b;">' + t('creditLimitNone') + '</div>') +
          (!hasCustom && effective > 0
            ? '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">' + t('creditLimitUsesDefault') + ' (' + formatCurrency(getDefaultCreditLimit()) + ')</div>'
            : '') +
          '<div id="cddCreditLimitEdit" style="display:none;margin-top:10px;">' +
            '<div style="display:flex;gap:8px;">' +
              '<input type="number" id="creditLimitInput" class="form-input" min="0" max="10000" step="1" value="' + (hasCustom ? debt.creditLimit : getDefaultCreditLimit()) + '" style="flex:1;">' +
              '<button class="btn btn-primary btn-sm" onclick="saveCreditLimit()">' + t('creditLimitSave') + '</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="cancelCreditLimitEdit()">' + t('creditLimitCancel') + '</button>' +
            '</div>' +
            '<div style="font-size:12px;color:#94a3b8;margin-top:6px;">' + t('defaultCreditLimitHint') + '</div>' +
          '</div>' +
        '</div>';
    }

    // SMS one-tap actions
    var smsActionsEl = document.getElementById('cddSmsActions');
    if (smsActionsEl) {
      var debtPhone = debt.phone || '';
      if (debt.remainingBalance > 0 && debtPhone) {
        var storeName = state.settings && state.settings.storeName ? state.settings.storeName : 'My Store';
        smsActionsEl.innerHTML =
          '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;">' +
            '<div style="font-weight:600;color:#166534;margin-bottom:8px;">📱 SMS</div>' +
            '<div style="display:flex;gap:8px;">' +
              '<button class="btn btn-primary btn-sm btn-mobile-only" onclick="showMobileOnlyModal(\'' + 'mobileOnlySms' + '\', \'' + 'mobileOnlySmsDesc' + '\')" style="flex:1;">' + t('smsSendReceipt') + ' <span class="btn-mobile-only-label">(Mobile only)</span></button>' +
              '<button class="btn btn-secondary btn-sm btn-mobile-only" onclick="showMobileOnlyModal(\'' + 'mobileOnlySms' + '\', \'' + 'mobileOnlySmsDesc' + '\')" style="flex:1;">' + t('smsSendReminder') + ' <span class="btn-mobile-only-label">(Mobile only)</span></button>' +
            '</div>' +
          '</div>';
      } else if (debt.remainingBalance > 0) {
        smsActionsEl.innerHTML =
          '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;">' +
            '<div style="font-size:13px;color:#92400e;">' + t('smsNoPhone') + '</div>' +
          '</div>';
      } else {
        smsActionsEl.innerHTML = '';
      }
    }

    var rows = [];
    var running = 0;
    (debt.transactions || []).forEach(function(tx) {
      if (tx.type === 'payment') {
        running -= tx.amount;
        rows.push({ date: tx.date, desc: tx.description || t('note'), amount: tx.amount, running: running, isPos: false });
      } else {
        running += tx.amount;
        rows.push({ date: tx.date, desc: tx.description || t('initialDebt'), amount: tx.amount, running: running, isPos: true });
      }
    });
    rows.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var html = rows.map(function(r) {
      return '<div class="debt-history-row" style="display:flex;align-items:center;gap:8px;padding:8px 0;">' +
        '<span style="color:' + (r.isPos ? '#16a34a' : '#f97316') + ';font-size:16px;">' + (r.isPos ? '＋' : '－') + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:var(--text-sm);font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + r.desc + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;">' + formatDateSafe(r.date) + '</div>' +
        '</div>' +
        '<div style="text-align:right;width:70px;"><div style="font-size:var(--text-sm);color:' + (r.isPos ? '#16a34a' : '#f97316') + ';">' + (r.isPos ? '+' : '-') + formatCurrency(r.amount) + '</div></div>' +
        '<div style="text-align:right;width:80px;font-weight:600;font-size:var(--text-sm);color:#1e293b;">' + formatCurrency(r.running) + '</div>' +
      '</div>';
    }).join('');

    ledgerEl.innerHTML =
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
        '<div style="font-weight:700;color:#1e293b;margin-bottom:12px;">' + t('debtHistory') + '</div>' +
        '<div style="display:flex;gap:8px;font-size:12px;color:#94a3b8;font-weight:600;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">' +
          '<div style="width:24px;"></div><div style="flex:1;">' + t('descHeader') + '</div>' +
          '<div style="text-align:right;width:70px;">' + t('amountHeader') + '</div>' +
          '<div style="text-align:right;width:80px;">' + t('balanceHeader') + '</div>' +
        '</div>' +
        (html || '<div class="empty-state">' + t('noData') + '</div>') +
        '<div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">' +
          '<div><div style="font-size:12px;color:#94a3b8;">' + t('debtsTotalLabel') + '</div><div style="font-weight:700;">' + formatCurrency(debt.amount) + '</div></div>' +
          '<div style="text-align:right;"><div style="font-size:12px;color:#94a3b8;">' + t('totalCollected') + '</div><div style="font-weight:700;color:#16a34a;">' + formatCurrency(collected) + '</div></div>' +
        '</div>' +
      '</div>';
  }

  // ── Credit limit edit (v2.56) ────────────────────────────────────────
  function startCreditLimitEdit() {
    var edit = document.getElementById('cddCreditLimitEdit');
    var btn = document.getElementById('cddCreditLimitEditBtn');
    if (edit) edit.style.display = 'block';
    if (btn) btn.style.display = 'none';
  }

  function cancelCreditLimitEdit() {
    var edit = document.getElementById('cddCreditLimitEdit');
    var btn = document.getElementById('cddCreditLimitEditBtn');
    if (edit) edit.style.display = 'none';
    if (btn) btn.style.display = '';
    renderDebtorDetail();
  }

  function saveCreditLimit() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var debt = state.debts.find(function(d) { return d.id === id; });
    if (!debt) return;
    var v = parseInt(document.getElementById('creditLimitInput') ? document.getElementById('creditLimitInput').value : 0, 10);
    debt.creditLimit = (isNaN(v) || v < 0) ? 0 : Math.min(v, 10000);
    saveState();
    showToast(t('creditLimitSaved'));
    renderDebtorDetail();
  }

  // ============================================
  // RECORD PAYMENT PAGE (record_payment.html)
  // ============================================
  function renderRecordPayment() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var debt = state.debts.find(function(d) { return d.id === id; });
    // (Back arrow is now a historyBack() button — v2.51: uniform history
    // navigation across all pages. Coming from debtor_detail pops back to it;
    // coming from the debts list pops back to debts.)
    var card = document.getElementById('rpCustomerCard');
    if (!card) return;
    if (!debt) {
      card.innerHTML = '<div class="empty-state">' + t('customerNotFound') + '</div>';
      return;
    }
    card.innerHTML =
      '<div style="background:#fffbeb;border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px;">' +
        '<div style="width:48px;height:48px;border-radius:8px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:20px;">👤</div>' +
        '<div><div style="font-weight:700;color:#1e293b;">' + debt.customerName + '</div>' +
        '<div style="font-size:var(--text-sm);color:#b45309;">' + t('currentBalance') + ': ' + formatCurrency(debt.remainingBalance) + '</div></div>' +
      '</div>';
    updatePaymentPreview();
  }

  function updatePaymentPreview() {
    var preview = document.getElementById('rpRemainingPreview');
    if (!preview) return;
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var debt = state.debts.find(function(d) { return d.id === id; });
    var amount = parseFloat(document.getElementById('rpAmountField') ? document.getElementById('rpAmountField').value : 0) || 0;
    var remaining = debt ? (debt.remainingBalance - amount) : 0;
    var over = debt ? amount > debt.remainingBalance : false;
    if (amount <= 0 || !debt) { preview.innerHTML = ''; return; }
    preview.innerHTML =
      '<div style="background:' + (over ? '#fef2f2' : '#f0fdf4') + ';border-radius:12px;padding:16px;text-align:center;">' +
        '<div style="font-size:var(--text-sm);color:' + (over ? '#dc2626' : '#15803d') + ';">' + t('payPreview') + '</div>' +
        '<div style="font-size:30px;font-weight:700;color:' + (over ? '#dc2626' : (remaining <= 0 ? '#16a34a' : '#d97706')) + ';">' + formatCurrency(Math.max(remaining, 0)) + '</div>' +
        (remaining <= 0 && !over ? '<div style="font-size:var(--text-sm);color:#16a34a;">' + t('fullySettled') + '</div>' : '') +
        (over ? '<div style="font-size:var(--text-sm);color:#dc2626;">' + t('paymentExceeds') + '</div>' : '') +
      '</div>';
  }

  function saveRecordPayment() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var debt = state.debts.find(function(d) { return d.id === id; });
    if (!debt) return;
    var amount = parseFloat(document.getElementById('rpAmountField') ? document.getElementById('rpAmountField').value : 0) || 0;
    var note = document.getElementById('rpNoteField') ? document.getElementById('rpNoteField').value.trim() : '';
    if (amount <= 0) { showToast(t('enterAmount'), 'error'); return; }
    if (amount > debt.remainingBalance) { showToast(t('paymentExceeds'), 'error'); return; }
    if (!debt.transactions) debt.transactions = [];
    debt.transactions.push({ id: genId(), date: new Date().toISOString(), type: 'payment', description: note || null, amount: amount });
    debt.remainingBalance -= amount;
    debt.updatedAt = new Date().toISOString();
    saveState();
    showToast(t('paymentSaved'));
    // replace() so Back after paying skips the just-exited payment form
    // (v2.51 history unification; matches mobile popBackStack semantics).
    window.location.replace('debtor_detail.html?id=' + debt.id);
  }

  // ============================================
  // EXPENSE LOG PAGE (expenses.html) — V2.71
  // ============================================
  function renderExpenses() {
    var list = document.getElementById('expenseList');
    var total = document.getElementById('expenseTodayTotal');
    if (total) total.textContent = formatCurrency(getTodayExpensesTotal());
    if (list) {
      var items = getExpenses().slice().sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '') ||
          String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      if (items.length === 0) {
        list.innerHTML = '<div class="empty-state">' + t('expenseEmpty') + '</div>';
      } else {
        list.innerHTML = items.map(function(e) {
          return '<div class="closing-item">' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="closing-item-name">' + expenseCategoryLabel(e.category) + '</div>' +
              '<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">' + e.date + (e.note ? ' · ' + esc(e.note) : '') + '</div>' +
            '</div>' +
            '<span class="closing-item-value danger">' + formatCurrency(e.amount) + '</span>' +
            '<button class="btn btn-secondary btn-sm" style="margin-left:8px;padding:4px 10px;" onclick="deleteExpense(\'' + e.id + '\')">' + t('expenseDelete') + '</button>' +
          '</div>';
        }).join('');
      }
    }
    // Date field defaults to today (and stays visible so backfilling old
    // expenses is possible — the analysis calls for a visible, pre-filled date).
    var dateField = document.getElementById('expenseDate');
    if (dateField && !dateField.value) dateField.value = todayStr();
  }

  function addExpense() {
    var amount = parseFloat(document.getElementById('expenseAmount') ? document.getElementById('expenseAmount').value : '');
    var category = document.getElementById('expenseCategory') ? document.getElementById('expenseCategory').value : '';
    var date = document.getElementById('expenseDate') ? document.getElementById('expenseDate').value : '';
    var note = document.getElementById('expenseNote') ? document.getElementById('expenseNote').value.trim() : '';
    if (!amount || amount <= 0) { showToast(t('expenseAmountRequired'), 'error'); return; }
    if (!category) { showToast(t('expenseCategoryRequired'), 'error'); return; }
    if (!date) date = todayStr();
    state.expenseLog = state.expenseLog || [];
    state.expenseLog.push({
      id: genId(), date: date, category: category,
      amount: Math.round(amount * 100) / 100, note: note,
      createdAt: new Date().toISOString()
    });
    saveState();
    var amountField = document.getElementById('expenseAmount');
    var categoryField = document.getElementById('expenseCategory');
    var noteField = document.getElementById('expenseNote');
    if (amountField) amountField.value = '';
    if (categoryField) categoryField.value = '';
    if (noteField) noteField.value = '';
    renderExpenses();
    showToast(t('expenseAdded'));
  }

  function deleteExpense(id) {
    state.expenseLog = (state.expenseLog || []).filter(function(e) { return e.id !== id; });
    saveState();
    renderExpenses();
    showToast(t('expenseDeleted'));
  }

  // Day-page entry point → expenses.html (V2.71). No day-open guard: the
  // expense log is a date-stamped ledger, so backfilling a past expense while
  // the store is closed is legitimate.
  function goToExpenses() {
    window.location.href = 'expenses.html';
  }

  // ============================================
  // REPORTS PAGE (reports.html)
  // ============================================
  var _reportPeriod = 'day';

  function loadReportPeriod() {
    try {
      var p = localStorage.getItem('sss_v3_reportPeriod');
      if (p === 'day' || p === 'week' || p === 'month') _reportPeriod = p;
    } catch (e) { /* keep default */ }
  }

  function saveReportPeriod() {
    try { localStorage.setItem('sss_v3_reportPeriod', _reportPeriod); } catch (e) { /* ignore */ }
  }

  // All sales ever recorded: today's live sales + archived sales inside history.
  // This fixes Week/Month aggregation — past days' sales live in history.archivedSales,
  // not in state.sales (which only holds the current open day).
  function getAllSales() {
    var out = [];
    var seen = {};
    function pushSale(s) {
      if (!s) return;
      if (s.id && seen[s.id]) return; // dedupe if the same sale exists in both sources
      if (s.id) seen[s.id] = true;
      out.push(s);
    }
    (state.sales || []).forEach(pushSale);
    (state.history || []).forEach(function(h) {
      if (h.archivedSales && h.archivedSales.length) {
        h.archivedSales.forEach(pushSale);
      }
    });
    return out;
  }

  function addDays(dateStr, n) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Escape user-entered text before injecting into innerHTML
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function reportCard(title, bodyHtml) {
    return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
      '<div style="font-weight:700;color:#1e293b;margin-bottom:8px;">' + title + '</div>' + bodyHtml + '</div>';
  }

  function reportRow(label, value, color) {
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;">' +
      '<span style="color:#1e293b;font-size:var(--text-sm);">' + label + '</span>' +
      '<span style="font-weight:600;color:' + (color || '#1e293b') + ';font-size:var(--text-sm);">' + value + '</span></div>';
  }

  function reportCollapsibleCard(title, bodyHtml, bodyId) {
    return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleReportSection(\'' + bodyId + '\')">' +
        '<div style="font-weight:700;color:#1e293b;">' + title + '</div>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(180deg);transition:transform 0.25s;" id="chev_' + bodyId + '"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div id="' + bodyId + '">' + bodyHtml + '</div>' +
    '</div>';
  }

  function toggleReportSection(bodyId) {
    var el = document.getElementById(bodyId);
    if (!el) return;
    var hidden = el.style.display === 'none';
    el.style.display = hidden ? 'block' : 'none';
    var chev = document.getElementById('chev_' + bodyId);
    if (chev) chev.style.transform = hidden ? 'rotate(180deg)' : '';
  }
  window.toggleReportSection = toggleReportSection;

  // Period stats shared by the page render and the CSV export
  function computeReportStats() {
    var today = todayStr();
    var allSales = getAllSales();
    var curStart = _reportPeriod === 'day' ? today : (_reportPeriod === 'week' ? addDays(today, -6) : addDays(today, -29));
    var curSales = allSales.filter(function(s) { return s.date >= curStart; });
    var prevLen = _reportPeriod === 'day' ? 1 : (_reportPeriod === 'week' ? 7 : 30);
    var prevEnd = addDays(curStart, -1);
    var prevStart = addDays(prevEnd, -(prevLen - 1));
    var prevSales = allSales.filter(function(s) { return s.date >= prevStart && s.date <= prevEnd; });
    function sum(list, field) {
      return list.reduce(function(a, s) { return a + (s[field] || 0); }, 0);
    }
    return {
      today: today,
      allSales: allSales,
      curSales: curSales,
      prevSales: prevSales,
      curStart: curStart,
      prevStart: prevStart,
      prevEnd: prevEnd,
      sum: sum
    };
  }

  function renderReports() {
    var toggle = document.getElementById('reportPeriodToggle');
    var summary = document.getElementById('reportSummaryCards');
    var best = document.getElementById('reportBestSellers');
    var recent = document.getElementById('reportRecentTx');
    var low = document.getElementById('reportLowStock');
    var urgent = document.getElementById('reportUrgent');
    var summaryLine = document.getElementById('reportSummary');
    var chart = document.getElementById('reportChart');
    var utang = document.getElementById('reportUtang');
    var stock = document.getElementById('reportStock');
    if (!toggle || !summary) return;

    var st = computeReportStats();
    var curSales = st.curSales;
    var prevSales = st.prevSales;
    var totalSales = st.sum(curSales, 'amount');
    var totalProfit = st.sum(curSales, 'profit');
    var itemsSold = curSales.reduce(function(a, s) { return a + (s.quantity || 1); }, 0);
    var txCount = curSales.length;
    var cashSales = st.sum(curSales.filter(function(s) { return !s.customerName; }), 'amount');
    var utangSales = st.sum(curSales.filter(function(s) { return s.customerName; }), 'amount');
    var prevSalesTotal = st.sum(prevSales, 'amount');
    var prevProfitTotal = st.sum(prevSales, 'profit');
    // V2.71: expenses + Net Profit for the period (gross profit stays as-is)
    var totalExpenses = getPeriodExpensesTotal(st.curStart);
    var netProfit = totalProfit - totalExpenses;
    var prevExpensesTotal = getPeriodExpensesTotal(st.prevStart) - totalExpenses;
    var prevNetProfit = prevProfitTotal - prevExpensesTotal;

    function vsBadge(cur, prev) {
      if (prev <= 0) return '';
      var p = Math.round(((cur - prev) / prev) * 100);
      return p >= 0 ? t('reportVsUp', { pct: p }) : t('reportVsDown', { pct: Math.abs(p) });
    }

    toggle.innerHTML = ['day', 'week', 'month'].map(function(p) {
      var label = p === 'day' ? t('periodDay') : (p === 'week' ? t('periodWeek') : t('periodMonth'));
      var sel = _reportPeriod === p;
      return '<button class="btn btn-sm ' + (sel ? 'btn-primary' : 'btn-secondary') + '" style="flex:1;margin-right:6px;" onclick="setReportPeriod(\'' + p + '\')">' + label + '</button>';
    }).join('');

    // Auto plain-language summary line (no user interaction needed)
    if (summaryLine) {
      var periodLabel = _reportPeriod === 'day' ? t('periodDay') : (_reportPeriod === 'week' ? t('periodWeek') : t('periodMonth'));
      var owed = (state.debts || []).reduce(function(a, d) { return a + (d.remainingBalance || 0); }, 0);
      var line = t('reportSummaryLine', {
        period: periodLabel,
        sales: formatCurrency(totalSales),
        profit: formatCurrency(totalProfit),
        vs: vsBadge(totalSales, prevSalesTotal),
        owed: owed > 0 ? t('reportOwed', { owed: formatCurrency(owed) }) : ''
      });
      summaryLine.style.display = 'block';
      summaryLine.innerHTML = '<div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:12px;padding:12px 16px;font-size:var(--text-sm);color:#166534;line-height:1.5;">' + line + '</div>';
    }

    // KPI stat grid
    function statTile(label, value, color, bg, badge) {
      return '<div style="flex:1;min-width:44%;background:' + bg + ';border-radius:12px;padding:12px;text-align:center;box-sizing:border-box;">' +
        '<div style="font-size:var(--text-xs);color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</div>' +
        '<div style="font-weight:700;color:' + color + ';font-size:var(--text-lg);margin-top:2px;">' + value + '</div>' +
        (badge ? '<div style="font-size:11px;color:' + color + ';margin-top:2px;">' + badge + '</div>' : '') +
      '</div>';
    }
    summary.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
        statTile(t('totalSales'), formatCurrency(totalSales), '#16a34a', '#f0fdf4', vsBadge(totalSales, prevSalesTotal)) +
        statTile(t('reportsProfit'), formatCurrency(totalProfit), '#2563eb', '#eff6ff', vsBadge(totalProfit, prevProfitTotal)) +
        statTile(t('reportsExpenses'), formatCurrency(totalExpenses), '#dc2626', '#fef2f2') +
        statTile(t('reportsNetProfit'), formatCurrency(netProfit), netProfit < 0 ? '#dc2626' : '#2563eb', '#eff6ff', vsBadge(netProfit, prevNetProfit)) +
        statTile(t('reportItemsSold'), String(itemsSold), '#d97706', '#fef3c7') +
        statTile(t('transactions'), String(txCount), '#475569', '#f1f5f9') +
        statTile(t('cashSales'), formatCurrency(cashSales), '#15803d', '#dcfce7') +
        statTile(t('utangSales'), formatCurrency(utangSales), '#dc2626', '#fef2f2') +
      '</div>';

    // 7-day sales trend (Day & Week only, matching mobile)
    if (chart) {
      if (_reportPeriod === 'day' || _reportPeriod === 'week') {
        var last7 = [];
        for (var i = 6; i >= 0; i--) {
          var ds = addDays(st.today, -i);
          var dayTotal = st.sum(st.allSales.filter(function(s) { return s.date === ds; }), 'amount');
          last7.push({ label: String(parseInt(ds.slice(8, 10), 10)), total: dayTotal });
        }
        var maxVal = 1;
        last7.forEach(function(d) { if (d.total > maxVal) maxVal = d.total; });
        var bars = last7.map(function(d) {
          var h = Math.max(4, Math.round((d.total / maxVal) * 100));
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:120px;min-width:0;">' +
            '<div style="width:70%;max-width:28px;background:' + (d.total > 0 ? 'var(--primary)' : '#e2e8f0') + ';border-radius:4px 4px 0 0;height:' + h + '%;" title="' + formatCurrency(d.total) + '"></div>' +
            '<div style="font-size:10px;color:#94a3b8;margin-top:4px;">' + d.label + '</div>' +
          '</div>';
        }).join('');
        chart.style.display = 'block';
        chart.innerHTML = '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
          '<div style="font-weight:700;color:#1e293b;margin-bottom:12px;">' + t('weeklyTrend') + '</div>' +
          '<div style="display:flex;align-items:flex-end;gap:6px;height:140px;border-bottom:1px solid #e2e8f0;">' + bars + '</div>' +
        '</div>';
      } else {
        chart.style.display = 'none';
      }
    }

    // Utang / receivables section (outstanding, collected this period, aging)
    if (utang) {
      var debts = state.debts || [];
      var outstanding = 0, debtors = 0;
      debts.forEach(function(d) { if (d.remainingBalance > 0) { outstanding += d.remainingBalance; debtors++; } });
      var collected = 0;
      debts.forEach(function(d) {
        (d.transactions || []).forEach(function(tx) {
          if (tx.type === 'payment' && tx.date) {
            var dStr = String(tx.date).slice(0, 10);
            if (dStr >= st.curStart) collected += (tx.amount || 0);
          }
        });
      });
      var buckets = [
        { label: t('debtAge30'), color: '#16a34a', count: 0, amount: 0 },
        { label: t('debtAge60'), color: '#d97706', count: 0, amount: 0 },
        { label: t('debtAge60Plus'), color: '#dc2626', count: 0, amount: 0 }
      ];
      debts.forEach(function(d) {
        if (d.remainingBalance > 0) {
          var age = 0;
          if (d.createdAt) {
            var t0 = new Date(d.createdAt).getTime();
            if (!isNaN(t0)) age = Math.floor((Date.now() - t0) / 86400000);
          }
          var idx = age >= 60 ? 2 : (age >= 30 ? 1 : 0);
          buckets[idx].count++;
          buckets[idx].amount += d.remainingBalance;
        }
      });
      // Over-limit debtors (v2.56) — customers whose TOTAL balance exceeds their limit
      var nameTotals = {};
      debts.forEach(function(d) {
        if (d.remainingBalance > 0) {
          var dn = d.customerName;
          nameTotals[dn] = (nameTotals[dn] || 0) + d.remainingBalance;
        }
      });
      var overLimitCount = Object.keys(nameTotals).filter(function(n) {
        var lim = getEffectiveCreditLimit(n);
        return lim > 0 && nameTotals[n] >= lim; // at-or-above counts (v2.57)
      }).length;
      var utangBody =
        reportRow(t('outstandingUtang'), formatCurrency(outstanding), outstanding > 0 ? '#dc2626' : '#16a34a') +
        reportRow(t('activeDebtors'), String(debtors), '#475569') +
        reportRow(t('collected'), formatCurrency(collected), '#16a34a') +
        (overLimitCount > 0 ? reportRow(t('overLimitDebtors'), String(overLimitCount), '#dc2626') : '') +
        '<div style="margin-top:8px;font-size:var(--text-xs);color:#94a3b8;font-weight:700;">' + t('debtAging') + '</div>' +
        reportRow(buckets[0].label, buckets[0].amount > 0 ? formatCurrency(buckets[0].amount) + ' (' + buckets[0].count + ')' : t('noData'), buckets[0].color) +
        reportRow(buckets[1].label, buckets[1].amount > 0 ? formatCurrency(buckets[1].amount) + ' (' + buckets[1].count + ')' : t('noData'), buckets[1].color) +
        reportRow(buckets[2].label, buckets[2].amount > 0 ? formatCurrency(buckets[2].amount) + ' (' + buckets[2].count + ')' : t('noData'), buckets[2].color);
      utang.innerHTML = reportCollapsibleCard(t('utangReport'), utangBody, 'reportUtangBody');
    }

    // Best-selling products (period)
    var counts = {};
    curSales.forEach(function(s) { counts[s.productName] = (counts[s.productName] || 0) + (s.quantity || 1); });
    var sorted = Object.keys(counts).map(function(n) { return { name: n, qty: counts[n] }; }).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 5);
    best.innerHTML = reportCard(t('bestSelling'), sorted.length === 0
      ? '<div style="color:#94a3b8;font-size:var(--text-sm);padding:8px 0;">' + t('noData') + '</div>'
      : sorted.map(function(ps, i) {
          return '<div style="display:flex;justify-content:space-between;padding:6px 0;"><div><span style="font-weight:700;color:#b45309;">#' + (i + 1) + '</span> ' + esc(ps.name) + '</div><div style="font-weight:600;color:#16a34a;">x' + ps.qty + '</div></div>';
        }).join(''));

    // Recent transactions (collapsible)
    var recentSales = curSales.slice().sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 15);
    var recentBody = recentSales.length === 0
      ? '<div style="color:#94a3b8;font-size:var(--text-sm);padding:8px 0;">' + t('noTransactions') + '</div>'
      : recentSales.map(function(s) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;">' +
            '<div><div style="font-size:var(--text-sm);color:#1e293b;">' + esc(s.productName) + (s.customerName ? ' <span style="color:#16a34a;">(' + esc(s.customerName) + ')</span>' : '') + '</div>' +
            '<div style="font-size:12px;color:#94a3b8;">' + formatDateSafe(s.createdAt) + '</div></div>' +
            '<div style="font-weight:600;font-size:var(--text-sm);">' + formatCurrency(s.amount) + '</div></div>';
        }).join('');
    recent.innerHTML = reportCollapsibleCard(t('recentTransactions'), recentBody, 'reportRecentTxBody');

    // Low stock items (collapsible)
    var lowItems = state.products.filter(function(p) { return getStockStatus(p) !== 'plenty'; });
    var lowBody = lowItems.length === 0
      ? '<div style="color:#94a3b8;font-size:var(--text-sm);padding:8px 0;">' + t('noData') + '</div>'
      : lowItems.map(function(p) {
          var st2 = getStockStatus(p);
          var val = st2 === 'out' ? t('outOfStockLabel') : p.quantity + ' ' + t('leftLabel');
          return '<div style="display:flex;justify-content:space-between;padding:6px 0;"><span>' + esc(p.name) + '</span><span style="color:' + (st2 === 'out' ? '#dc2626' : '#d97706') + ';font-weight:600;">' + val + '</span></div>';
        }).join('');
    low.innerHTML = reportCollapsibleCard(t('lowStockItems'), lowBody, 'reportLowStockBody');

    // ML urgent-restock (Stage 4) — 14-day learning window + 14-day threshold.
    // Computed inline (not via urgentRestocks) because urgentRestocks hardcodes
    // the 7-day window; Reports deliberately uses a 2-week baseline.
    if (urgent) {
      urgent.innerHTML = '';
      if (window.ForecastEngine) {
        var urgentList = [];
        try {
          var fcRSales = window.ForecastEngine.buildAllSalesFromWeb(state);
          var fcRAll = window.ForecastEngine;
          for (var ui = 0; ui < state.products.length; ui++) {
            var pu = state.products[ui];
            var ru = fcRAll.forecastForProduct(pu, fcRSales, todayStr(), 14);
            if (ru.confidence !== 'INSUFFICIENT' && ru.predictedDaysUntilOut != null && ru.predictedDaysUntilOut <= 14) {
              urgentList.push({ product: pu, result: ru });
            }
          }
          urgentList.sort(function(a, b) { return a.result.predictedDaysUntilOut - b.result.predictedDaysUntilOut; });
          urgentList = urgentList.slice(0, 5);
        } catch(e) { urgentList = []; }
        if (urgentList.length > 0) {
          urgent.innerHTML = reportCollapsibleCard(
            t('forecastReportTitle') + (urgentList.length ? ' <span style="color:#dc2626;">(' + urgentList.length + ')</span>' : ''),
            urgentList.map(_fcUrgentRowHtml).join(''),
            'reportUrgentBody'
          );
        }
      }
    }

    // Stock health (value on shelves + slow movers)
    if (stock) {
      var stockValue = (state.products || []).reduce(function(a, p) { return a + ((p.quantity || 0) * (p.costPrice || 0)); }, 0);
      var cutoff = addDays(st.today, -29);
      var sold = {};
      st.allSales.forEach(function(s) { if (s.date >= cutoff && s.productName) sold[s.productName.toLowerCase()] = true; });
      var slow = (state.products || []).filter(function(p) {
        return (p.quantity || 0) > 0 && !sold[(p.name || '').toLowerCase()];
      }).sort(function(a, b) { return b.quantity - a.quantity; }).slice(0, 8);
      var stockBody = reportRow(t('stockValue'), formatCurrency(stockValue), '#16a34a');
      if (slow.length === 0) {
        stockBody += '<div style="color:#94a3b8;font-size:var(--text-sm);padding:6px 0;">' + t('noSlowMovers') + '</div>';
      } else {
        stockBody += '<div style="margin-top:8px;font-size:var(--text-xs);color:#94a3b8;font-weight:700;">' + t('slowMovers') + '</div>' +
          slow.map(function(p) {
            return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:var(--text-sm);color:#1e293b;">' + esc(p.name) + '</span><span style="font-weight:600;font-size:var(--text-sm);color:#d97706;">' + p.quantity + ' \u00b7 ' + t('noSales30') + '</span></div>';
          }).join('');
      }
      stock.innerHTML = reportCollapsibleCard(t('stockHealth'), stockBody, 'reportStockBody');
    }
  }

  function setReportPeriod(p) {
    if (p === 'day' || p === 'week' || p === 'month') {
      _reportPeriod = p;
      saveReportPeriod();
    }
    renderReports();
  }

  // Export the current period as a CSV file
  function exportCurrentReport() {
    try {
      var st = computeReportStats();
      var periodLabel = _reportPeriod === 'day' ? t('periodDay') : (_reportPeriod === 'week' ? t('periodWeek') : t('periodMonth'));
      function cell(v) {
        v = String(v === undefined || v === null ? '' : v);
        if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
        return v;
      }
      var lines = [];
      var totalExpenses = getPeriodExpensesTotal(st.curStart);
      var netProfit = st.sum(st.curSales, 'profit') - totalExpenses;
      lines.push(cell('TindaGo Report'));
      lines.push(cell('Period') + ',' + cell(periodLabel));
      lines.push(cell(t('totalSales')) + ',' + cell(st.sum(st.curSales, 'amount').toFixed(2)));
      lines.push(cell(t('reportsProfit')) + ',' + cell(st.sum(st.curSales, 'profit').toFixed(2)));
      lines.push(cell(t('reportsExpenses')) + ',' + cell(totalExpenses.toFixed(2)));
      lines.push(cell(t('reportsNetProfit')) + ',' + cell(netProfit.toFixed(2)));
      lines.push(cell(t('reportItemsSold')) + ',' + cell(st.curSales.reduce(function(a, s) { return a + (s.quantity || 1); }, 0)));
      lines.push(cell(t('transactions')) + ',' + cell(st.curSales.length));
      lines.push('');
      lines.push([cell('Date'), cell('Product'), cell('Qty'), cell('Amount'), cell('Profit'), cell('Customer')].join(','));
      st.curSales.forEach(function(s) {
        lines.push([cell(s.date), cell(s.productName), cell(s.quantity || 1), cell((s.amount || 0).toFixed(2)), cell((s.profit || 0).toFixed(2)), cell(s.customerName || '')].join(','));
      });
      lines.push('');
      lines.push(cell(t('lowStockItems')));
      (state.products || []).forEach(function(p) {
        if (getStockStatus(p) !== 'plenty') {
          lines.push([cell(p.name), cell(p.quantity)].join(','));
        }
      });
      lines.push('');
      lines.push(cell(t('expenseListTitle')));
      getExpenses().filter(function(e) { return e.date >= st.curStart; }).forEach(function(e) {
        lines.push([cell(e.date), cell(expenseCategoryLabel(e.category)), cell((e.amount || 0).toFixed(2)), cell(e.note || '')].join(','));
      });
      var csv = lines.join('\r\n');
      var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'tindago-report-' + _reportPeriod + '-' + st.today + '.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 100);
      showToast(t('exportReportDone'));
    } catch (e) {
      showToast(t('exportReportError'), 'error');
    }
  }
  window.exportCurrentReport = exportCurrentReport;


  // ============================================
  // HELP PAGE (help.html)
  // ============================================
  function renderHelp() {
    var list = document.getElementById('howToList');
    if (!list) return;
    var items = [
      { icon: '💰', text: t('howToSales') },
      { icon: '📦', text: t('howToStock') },
      { icon: '📒', text: t('howToDebts') },
      { icon: '📊', text: t('howToReports') },
      { icon: '⚙️', text: t('howToSettings') }
    ];
    list.innerHTML = items.map(function(it) {
      return '<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;">' +
        '<span style="font-size:18px;">' + it.icon + '</span>' +
        '<div style="font-size:var(--text-sm);color:#334155;">' + it.text + '</div></div>';
    }).join('');
  }

  function init() {
    cacheDom();
    loadState();

    // Restore temporary dev date override from sessionStorage (never persisted)
    try { devDateOverride = sessionStorage.getItem('sss_v3_devDateOverride') || null; } catch(e) {}
    // Restore temporary dev time override from sessionStorage (never persisted)
    try {
      var tRaw = sessionStorage.getItem('sss_v3_devTimeOverride');
      if (tRaw !== null && tRaw !== '') devTimeOverride = parseInt(tRaw, 10);
      if (devTimeOverride !== null && (isNaN(devTimeOverride) || devTimeOverride < 0 || devTimeOverride > 23)) devTimeOverride = null;
    } catch(e) {}
    // Restore the pre-override business-day snapshot so clearing later can undo the test
    try {
      var snapRaw = sessionStorage.getItem('sss_v3_devSnapshot');
      if (snapRaw) devStateSnapshot = JSON.parse(snapRaw);
    } catch(e) {}

    // Handle each page type
    if (pageName === 'index') {
      // Landing page: Setup overlay only (first-time setup)
      if (!state.settings.hasCompletedSetup && dom.setupOverlay) {
        dom.setupOverlay.classList.add('open');
        // Render the overlay in the persisted language immediately (web parity
        // with mobile — the setup screen localizes on load and on change).
        setActiveLang(dom.setupLanguage, state.settings.language || 'fil');
        applyTranslations();
      } else {
        // Already set up, redirect to morning
        window.location.href = 'morning.html';
        return;
      }
    }
    // Check for tutorial resume (multi-page tutorial navigation)
    if (checkTutorialResume()) {
      // Tutorial resume handled, no further page init needed
    } else if (pageName === 'morning') {
      // Morning check page
      // ── Overdue store detection ──
      // If the store was left open from a previous calendar day (dayOpen &&
      // dayDate < today), do NOT silently archive and close. renderMorningCheck()
      // surfaces an overdue banner (opened date + days open) and offers
      // "Close Old Day & Start Today" or "Review Last Day's Sales" so the owner
      // decides. Uses `<` so a device clock moved backward never archives a
      // "future" day. NOTE: morning.html is the app entry point; other pages
      // are guarded by dayOpen checks, so this single detection point covers
      // normal flows.
      applyTranslations();
      renderMorningCheck();
      // bfcache: re-run loadState + render when page is restored from cache
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderMorningCheck();
      });
      // Auto-start main tutorial on fresh app launch (cleared on tab close)
      var _tutorialShown = false;
      try { _tutorialShown = sessionStorage.getItem('sss_v3_tutorialShown') === '1'; } catch(e) {}
      if (!_tutorialShown) {
        state.settings.launchCount = (state.settings.launchCount || 0) + 1;
        saveState();
        if (dom.tutorialOverlay) {
          var isFirstLaunch = state.settings.launchCount === 1;
          setTimeout(function() {
            startTutorial('main', !isFirstLaunch);
          }, 500);
        }
        try { sessionStorage.setItem('sss_v3_tutorialShown', '1'); } catch(e) {}
      }
    } else if (pageName === 'day') {
      // Day mode page
      // If the store is closed, or the open day belongs to a previous business
      // day (stale), route to Morning — where the overdue banner lives.
      if (!state.dayOpen || isStaleOpenDay()) {
        showToast(state.dayOpen ? t('overdueRedirect') : t('dayNotOpen'));
        setTimeout(function() { window.location.href = 'morning.html'; }, 1500);
        return;
      }
      applyTranslations();
      renderDayMode();
      // bfcache: re-run loadState + render when page is restored from cache
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderDayMode();
      });
    } else if (pageName === 'checkout') {
      // Standalone checkout page (v2.64) — the sale sheet is a full page now.
      // Same day-open guard as the Day page: a closed/stale day routes to
      // Morning where the overdue banner lives.
      if (!state.dayOpen || isStaleOpenDay()) {
        showToast(state.dayOpen ? t('overdueRedirect') : t('dayNotOpen'));
        setTimeout(function() { window.location.href = 'morning.html'; }, 1500);
        return;
      }
      applyTranslations();
      resetSaleForm();
      // Focus the product search so the owner can start typing immediately.
      if (dom.saleProductName) dom.saleProductName.focus();
      // bfcache: re-run loadState + render when page is restored from cache
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        resetSaleForm();
      });
    } else if (pageName === 'closing') {
      // Evening closing page
      // If the store is closed, or the open day belongs to a previous business
      // day (stale), route to Morning — where the overdue banner lives.
      if (!state.dayOpen || isStaleOpenDay()) {
        showToast(state.dayOpen ? t('overdueRedirect') : t('dayNotOpen'));
        setTimeout(function() { window.location.href = 'morning.html'; }, 1500);
        return;
      }
      applyTranslations();
      renderClosingScreen();
      // bfcache: re-run loadState + render when page is restored from cache
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderClosingScreen();
      });
    } else if (pageName === 'inventory') {
      // Inventory management page
      // Clear any stale edit ID from a previous session (e.g. an edit left
      // unfinished) so the "Add Stock" button always opens a blank form
      // instead of silently entering edit mode for an old product.
      try { localStorage.removeItem('sss_v3_editProductId'); } catch(e) {}
      applyTranslations();
      loadInventoryCatFilter();
      loadInventoryForecastSort();
      renderInventoryCatFilters();
      renderManageInventory();
      // Back-to-top: show when cat filters scroll out of view.
      (function() {
        var btn = document.getElementById('backToTopBtn');
        var catFilters = document.getElementById('inventoryCatFilters');
        var content = document.getElementById('appContent');
        if (!btn || !catFilters || !content) return;
        content.addEventListener('scroll', function() {
          var catRect = catFilters.getBoundingClientRect();
          var contentRect = content.getBoundingClientRect();
          btn.style.display = catRect.bottom < contentRect.top ? 'flex' : 'none';
        });})();
      // bfcache: Chrome's back/forward cache restores the frozen DOM with
      // stale quantities. DOMContentLoaded does not fire on restore, so
      // re-run loadState + render when the page comes back from bfcache.
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;   // normal first load handled by init()
        loadState();
        loadInventoryCatFilter();
        loadInventoryForecastSort();
        renderInventoryCatFilters();
        renderManageInventory();
        applyTranslations();
      });
    } else if (pageName === 'debts') {
      // Debts management page
      applyTranslations();
      renderManageDebts();
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderManageDebts();
      });
    } else if (pageName === 'setting') {
      // Settings page
      applyTranslations();
      setActiveLang(dom.settingsLanguage, state.settings.language || 'fil');
      if (dom.settingsStoreName) dom.settingsStoreName.value = state.settings.storeName || '';
      if (dom.settingsOwnerName) dom.settingsOwnerName.value = state.settings.ownerName || '';
      if (dom.settingsDefaultMarkup) dom.settingsDefaultMarkup.value = getDefaultMarkup();
      if (dom.settingsLowStockThreshold) dom.settingsLowStockThreshold.value = getGlobalLowStockThreshold();
      if (dom.settingsDefaultCreditLimit) dom.settingsDefaultCreditLimit.value = getDefaultCreditLimit();
    } else if (pageName === 'add_product') {
      // Add / Edit product page
      applyTranslations();
      var editId = null;
      try { editId = localStorage.getItem('sss_v3_editProductId'); } catch(e) {}
      // Default markup: configured Settings value. When editing an existing
      // product, prefill its ACTUAL markup ((sell/cost - 1) x 100) so the
      // helper reflects reality instead of always showing 20.
      if (dom.productMarkup && !dom.productMarkup.value) dom.productMarkup.value = getDefaultMarkup();
      // Low-stock alert threshold: the product's own value when editing, else
      // the global Settings threshold as the default for new products.
      if (dom.productLowStock) dom.productLowStock.value = getGlobalLowStockThreshold();
      // Product details (units, brands, categories): populate the selects and
      // datalists. Unit defaults to 'piece' for new products (matches mobile).
      if (dom.productCategory) {
        dom.productCategory.innerHTML = '<option value="">' + t('catAll') + '</option>' +
          PRODUCT_CATEGORIES.map(function(k) {
            return '<option value="' + k + '">' + productCategoryLabel(k) + '</option>';
          }).join('');
      }
      if (dom.productUnit) {
        dom.productUnit.innerHTML = PRODUCT_UNITS.map(function(k) {
          return '<option value="' + k + '">' + productUnitLabel(k) + '</option>';
        }).join('');
      }
      if (dom.productBrandList) {
        dom.productBrandList.innerHTML = getUsedBrands().map(function(b) {
          return '<option value="' + esc(b) + '"></option>';
        }).join('');
      }
      if (dom.productPackageSizeList) {
        dom.productPackageSizeList.innerHTML = getUsedPackageSizes().map(function(s) {
          return '<option value="' + esc(s) + '"></option>';
        }).join('');
      }
      fillProductFormFromEdit(editId);
      // Leaving this page without saving (back button, nav) must clear any
      // pending edit ID so the next "Add Stock" opens a blank form instead
      // of re-entering edit mode for the abandoned product.
      window.addEventListener('pagehide', function() {
        try { localStorage.removeItem('sss_v3_editProductId'); } catch(e) {}
      });
      // Chrome's back-forward cache (bfcache) restores the ENTIRE page DOM —
      // including every typed form value — when the user returns to this page
      // with Back/Forward. autocomplete="off" does not stop bfcache, so reset
      // the form explicitly whenever the page is restored from cache. The
      // datalists are also refreshed in case a product saved since the first
      // load introduced new brands/sizes.
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;   // normal first load is handled by init()
        resetAddProductFields();
        populateProductDatalists();
        // Defensive only: the pagehide listener above normally clears the edit
        // ID before the page freezes into bfcache, so this re-fill only fires
        // if pagehide did not run (e.g. unusual browser/eviction paths).
        var pendingEdit = null;
        try { pendingEdit = localStorage.getItem('sss_v3_editProductId'); } catch(err) {}
        fillProductFormFromEdit(pendingEdit);
      });
    } else if (pageName === 'new_debt') {
      // New Debt page
      applyTranslations();
    } else if (pageName === 'product_detail') {
      // Product Detail page
      applyTranslations();
      renderProductDetail();
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderProductDetail();
      });
    } else if (pageName === 'debtor_detail') {
      // Debtor Detail page
      applyTranslations();
      renderDebtorDetail();
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderDebtorDetail();
      });
    } else if (pageName === 'record_payment') {
      // Record Payment page
      applyTranslations();
      renderRecordPayment();
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderRecordPayment();
      });
    } else if (pageName === 'reports') {
      // Reports page
      applyTranslations();
      loadReportPeriod();
      renderReports();
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        loadReportPeriod();
        renderReports();
      });
    } else if (pageName === 'expenses') {
      // Expense Log page (V2.71) — no day-open guard; the log is date-stamped
      applyTranslations();
      renderExpenses();
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadState();
        applyTranslations();
        renderExpenses();
      });
    } else if (pageName === 'help') {
      // Help page
      applyTranslations();
      renderHelp();
    }

    // Apply text size on every page
    applyTextSize();

    setupEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================
  // WINDOW EXPORTS
  // ============================================
  window.toggleDayTransactions = toggleDayTransactions;
  window.launchTutorial = launchTutorial;
  window.renderProductDetail = renderProductDetail;
  window.deductWebStock = deductWebStock;
  window.deleteWebProduct = deleteWebProduct;
  window.renderDebtorDetail = renderDebtorDetail;
  window.renderRecordPayment = renderRecordPayment;
  window.updatePaymentPreview = updatePaymentPreview;
  window.saveRecordPayment = saveRecordPayment;
  window.renderReports = renderReports;
  window.setReportPeriod = setReportPeriod;
  window.renderExpenses = renderExpenses;
  window.addExpense = addExpense;
  window.deleteExpense = deleteExpense;
  window.goToExpenses = goToExpenses;
  window.renderHelp = renderHelp;
  window.completeSetup = completeSetup;
  window.showMorningCheck = showMorningCheck;
  window.startDay = startDay;
  window.showClosingScreen = showClosingScreen;
  window.renderClosingScreen = renderClosingScreen;
  window.navigateToDayMode = navigateToDayMode;
  window.backToDay = backToDay;
  window.completeDay = completeDay;
  window.closeDayAndShowMorning = closeDayAndShowMorning;
  window.openSaleSheet = openSaleSheet;
  window.closeSaleSheet = closeSaleSheet;
  window.leaveCheckout = leaveCheckout;
  window.resetSaleForm = resetSaleForm;
  window.onProductSearch = onProductSearch;
  window.selectProduct = selectProduct;
  window.selectProductOutOfStock = selectProductOutOfStock;
  window.adjustQty = adjustQty;
  window.onQtyChange = onQtyChange;
  window.onCustomerSearch = onCustomerSearch;
  window.selectCustomer = selectCustomer;
  window.onNewDebtCustomerSearch = onNewDebtCustomerSearch;
  window.selectNewDebtCustomer = selectNewDebtCustomer;
  window.addToCart = addToCart;
  window.cartAdjustQty = cartAdjustQty;
  window.cartRemoveLine = cartRemoveLine;
  window.cartSetQty = cartSetQty;
  window.setSalePayment = setSalePayment;
  window.completeSale = completeSale;
  window.openDebtDetail = openDebtDetail;
  window.closeDebtDetail = closeDebtDetail;
  window.togglePaidDebts = togglePaidDebts;
  window.openPaymentSheet = openPaymentSheet;
  window.closePaymentSheet = closePaymentSheet;
  window.updatePaymentPreview = updatePaymentPreview;
  window.savePayment = savePayment;
  window.renderManageInventory = renderManageInventory;
  window.setInventoryCatFilter = setInventoryCatFilter;
  window.setInventorySubcatFilter = setInventorySubcatFilter;
  window.toggleCatFilters = toggleCatFilters;
  window.editProduct = editProduct;
  window.openAddProduct = openAddProduct;
  window.closeAddProduct = closeAddProduct;
  window.updateMarkupHint = updateMarkupHint;
  window.saveProduct = saveProduct;
  window.toggleDevPanel = toggleDevPanel;
  window.handleDevAction = handleDevAction;
  window.openNewDebt = openNewDebt;
  window.closeNewDebt = closeNewDebt;
  window.saveNewDebt = saveNewDebt;
  window.updateNewDebtCreditWarn = updateNewDebtCreditWarn;
  window.startCreditLimitEdit = startCreditLimitEdit;
  window.cancelCreditLimitEdit = cancelCreditLimitEdit;
  window.saveCreditLimit = saveCreditLimit;
  window.saveSettings = saveSettings;
  window.resetData = resetData;
  window.exportData = exportData;
  window.applyTextSize = applyTextSize;
  window.setTextSize = setTextSize;
  window.startTutorial = startTutorial;
  window.advanceTutorial = advanceTutorial;
  window.previousTutorial = previousTutorial;
  window.endTutorial = endTutorial;
  window.reopenClosing = reopenClosing;
  window.archiveDaySales = archiveDaySales;
  window.closeStaleDayAndStartToday = closeStaleDayAndStartToday;
  window.openOverdueReview = openOverdueReview;
  window.closeOverdueReview = closeOverdueReview;
  window.setLanguage = setLanguage;
  window.setSetupLanguage = setSetupLanguage;
  window.historyBack = historyBack;

  // Bridge: expose checkout taxonomy to window for checkout_morph.js (IIFE scope)
  try{window.PRODUCT_CATEGORIES=PRODUCT_CATEGORIES;}catch(e){}
  try{window.PRODUCT_SUBCATEGORIES=PRODUCT_SUBCATEGORIES;}catch(e){}
  try{window.PRODUCT_UNITS=PRODUCT_UNITS;}catch(e){}
  try{window.productCategoryLabel=productCategoryLabel;}catch(e){}
  try{window.productSubcategoryLabel=productSubcategoryLabel;}catch(e){}
  try{window.t=t;}catch(e){}
  try{ window.dispatchEvent(new CustomEvent('tindago:taxonomyReady')); }catch(e){}

}
)();
