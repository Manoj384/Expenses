/**
 * Comprehensive master default categories and payment methods
 * inspired by major personal finance apps (INDmoney, CRED, Walnut, Splitwise).
 */

export const DEFAULT_CATEGORIES = {
  expense: [
    // Food & Dining
    { name: 'Groceries & Supermarket', group: 'Food & Dining' },
    { name: 'Swiggy / Zomato', group: 'Food & Dining' },
    { name: 'Blinkit / Zepto / Instamart', group: 'Food & Dining' },
    { name: 'Dining Out & Restaurants', group: 'Food & Dining' },
    { name: 'Coffee & Cafe', group: 'Food & Dining' },

    // Shopping
    { name: 'Amazon Shopping', group: 'Shopping' },
    { name: 'Flipkart Shopping', group: 'Shopping' },
    { name: 'Myntra & Clothing', group: 'Shopping' },
    { name: 'Electronics & Gadgets', group: 'Shopping' },
    { name: 'Home & Kitchen', group: 'Shopping' },

    // Travel & Commute
    { name: 'Fuel (Petrol / Diesel)', group: 'Travel & Commute' },
    { name: 'Uber / Ola / Rapido', group: 'Travel & Commute' },
    { name: 'Metro & Bus', group: 'Travel & Commute' },
    { name: 'Flight & Hotels', group: 'Travel & Commute' },
    { name: 'Train / IRCTC', group: 'Travel & Commute' },
    { name: 'Fastag & Toll', group: 'Travel & Commute' },

    // Bills & Utilities
    { name: 'Electricity Bill', group: 'Bills & Utilities' },
    { name: 'Mobile Recharge & Postpaid', group: 'Bills & Utilities' },
    { name: 'Broadband / WiFi', group: 'Bills & Utilities' },
    { name: 'Gas & Cylinder', group: 'Bills & Utilities' },
    { name: 'Water Bill', group: 'Bills & Utilities' },
    { name: 'DTH & Cable', group: 'Bills & Utilities' },

    // Subscriptions & OTT
    { name: 'Netflix & Prime Video', group: 'Subscriptions' },
    { name: 'Spotify / Apple Music', group: 'Subscriptions' },
    { name: 'YouTube Premium', group: 'Subscriptions' },
    { name: 'iCloud / Google One', group: 'Subscriptions' },

    // Housing & Living
    { name: 'House Rent', group: 'Housing' },
    { name: 'Maintenance & Society', group: 'Housing' },
    { name: 'Maid & Domestic Help', group: 'Housing' },
    { name: 'Repairs & Hardware', group: 'Housing' },

    // Health & Fitness
    { name: 'Pharmacy & Medicines', group: 'Health' },
    { name: 'Doctor & Hospital', group: 'Health' },
    { name: 'Gym & Fitness', group: 'Health' },
    { name: 'Health Insurance', group: 'Health' },

    // Entertainment & Leisure
    { name: 'Movies & Events', group: 'Entertainment' },
    { name: 'Gaming', group: 'Entertainment' },
    { name: 'Vacation & Trips', group: 'Entertainment' },

    // Personal & Education
    { name: 'Salon & Grooming', group: 'Personal Care' },
    { name: 'Courses & Education', group: 'Education' },
    { name: 'Books & Stationery', group: 'Education' },
    { name: 'Gifts & Celebrations', group: 'Personal Care' },
    { name: 'Charity & Donations', group: 'Personal Care' },
    { name: 'Other Expense', group: 'General' },
  ],

  income: [
    { name: 'Monthly Salary', group: 'Primary' },
    { name: 'Freelance & Consulting', group: 'Primary' },
    { name: 'Business Income', group: 'Primary' },
    { name: 'Bonus & Incentives', group: 'Primary' },
    { name: 'Stock Dividends', group: 'Investments' },
    { name: 'Interest on Savings/FD', group: 'Investments' },
    { name: 'Rental Income', group: 'Real Estate' },
    { name: 'Cashback & Rewards', group: 'Rewards' },
    { name: 'Refunds', group: 'General' },
    { name: 'Gifts Received', group: 'General' },
    { name: 'Other Income', group: 'General' },
  ],

  debt: [
    { name: 'Home Loan', group: 'Loans' },
    { name: 'Car Loan', group: 'Loans' },
    { name: 'Personal Loan', group: 'Loans' },
    { name: 'Education Loan', group: 'Loans' },
    { name: 'Credit Card Outstanding', group: 'Cards' },
    { name: 'Borrowed from Family/Friends', group: 'Personal' },
  ],

  sip: [
    { name: 'Index Mutual Fund', group: 'Equity' },
    { name: 'Flexi Cap Fund', group: 'Equity' },
    { name: 'Small Cap Fund', group: 'Equity' },
    { name: 'ELSS Tax Saver Fund', group: 'Tax Saving' },
    { name: 'Gold SIP', group: 'Commodities' },
    { name: 'PPF / NPS', group: 'Retirement' },
  ]
}

export const DEFAULT_PAYMENT_METHODS = [
  // Cash
  { name: 'Cash', type: 'cash' },

  // Online / UPI
  { name: 'Google Pay (GPay)', type: 'online' },
  { name: 'PhonePe', type: 'online' },
  { name: 'Paytm UPI / Wallet', type: 'online' },
  { name: 'CRED UPI', type: 'online' },
  { name: 'Amazon Pay', type: 'online' },
  { name: 'Net Banking', type: 'online' },

  // Cards
  { name: 'OneCard Credit Card', type: 'card' },
  { name: 'HDFC Credit Card', type: 'card' },
  { name: 'HDFC Debit Card', type: 'card' },
  { name: 'ICICI Credit Card', type: 'card' },
  { name: 'SBI Credit Card', type: 'card' },
  { name: 'Axis Bank Card', type: 'card' },
  { name: 'Other Card', type: 'card' },
]
