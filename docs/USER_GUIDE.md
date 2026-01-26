# User Guide: Subscription Management

This guide explains how to use the subscription management features in the expense tracking application.

## Table of Contents

1. [Creating Subscriptions](#creating-subscriptions)
2. [Creating Subscriptions with Past Bills](#creating-subscriptions-with-past-bills)
3. [Setting Your Timezone Preference](#setting-your-timezone-preference)
4. [Viewing Subscription-Linked Expenses](#viewing-subscription-linked-expenses)
5. [Updating Subscriptions](#updating-subscriptions)
6. [Deleting Subscriptions](#deleting-subscriptions)

---

## Creating Subscriptions

To create a new subscription:

1. Navigate to the **Subscriptions** tab in the application
2. Click the **Add Subscription** button (+ icon)
3. Fill in the subscription details:
   - **Name**: The name of your subscription (e.g., "Netflix", "Spotify")
   - **Amount**: The cost per billing cycle
   - **Currency**: Select your currency (CNY, USD, EUR, etc.)
   - **Billing Frequency**: Choose Monthly or Yearly
   - **Start Date**: When the subscription began
   - **End Date** (optional): When the subscription will end
   - **Auto-renew**: Whether the subscription automatically renews
   - **Notes** (optional): Additional information about the subscription
4. Click **Save** to create the subscription

The system will automatically track future billing dates and create expense records when bills are due.

---

## Creating Subscriptions with Past Bills

When you add a subscription with a start date in the past, the system can automatically create expense records for all past billing events.

### How It Works

1. **Enter a Past Start Date**: When creating a subscription, set the start date to any date before today
2. **Review the Preview**: The system will calculate all billing events between the start date and today, then display a confirmation dialog showing:
   - Number of expense records to be created
   - Date range (from first bill to most recent bill)
   - Total amount across all bills
   - List of individual billing dates and amounts
3. **Confirm or Decline**:
   - Click **Confirm** to create expense records for all past bills
   - Click **Cancel** to create the subscription without generating past expenses

### Example

If you add a Netflix subscription today (March 20, 2024) with:
- Start date: January 15, 2024
- Amount: $15.99
- Frequency: Monthly

The system will show a preview:
- **3 expense records** will be created
- Date range: January 15, 2024 to March 15, 2024
- Total: $47.97
- Individual bills: Jan 15 ($15.99), Feb 15 ($15.99), Mar 15 ($15.99)

### Important Notes

- Past bills are created in the **Subscriptions** category automatically
- Each expense is linked to the subscription for easy tracking
- You can choose to decline past bill creation if you only want to track future bills
- All dates are calculated based on your timezone preference

---

## Setting Your Timezone Preference

Your timezone preference ensures that subscription billing dates are calculated correctly for your location.

### How to Set Your Timezone

1. Navigate to **Settings** or **User Preferences**
2. Find the **Timezone Settings** section
3. Select your timezone from the dropdown menu (e.g., "Asia/Shanghai", "America/New_York")
4. The system will display:
   - Your current timezone
   - UTC offset (e.g., UTC+8)
   - Current local time
5. Click **Save** to apply the timezone preference

### Why Timezone Matters

- **Billing Date Accuracy**: Subscriptions are billed based on your local date, not UTC
- **Past Bill Calculation**: When creating subscriptions with past bills, dates are interpreted in your timezone
- **Automated Billing**: The system processes subscription bills hourly and checks each user's local date

### Default Behavior

- If you haven't set a timezone preference, the system uses your browser's detected timezone
- If detection fails, the system defaults to UTC

### Example

If you're in Shanghai (UTC+8) and create a subscription on March 20, 2024:
- Your local date: March 20, 2024
- UTC date: March 19, 2024 (16:00 UTC)
- The system uses March 20 for billing calculations

---

## Viewing Subscription-Linked Expenses

Expenses created from subscriptions are clearly marked and linked to their source subscription.

### Identifying Subscription Expenses

In the **Expenses** list, subscription-generated expenses have:
- A **subscription indicator icon** (sync/repeat icon)
- A **tooltip** showing the subscription name when you hover over the icon
- The **Subscriptions category** assigned automatically

### Navigating to the Subscription

To view the subscription that generated an expense:

1. Find the expense in your expense list
2. Look for the subscription indicator icon
3. Click the icon or the expense row
4. The system will navigate to the subscription details

### Viewing All Expenses for a Subscription

To see all expenses linked to a specific subscription:

1. Navigate to the **Subscriptions** tab
2. Find the subscription you want to view
3. Click on the subscription to open its details
4. View the list of all expenses generated by this subscription
5. Each expense shows:
   - Date of the billing event
   - Amount charged
   - Link to view the expense in the expense list

### Filtering Subscription Expenses

You can filter your expense list to show only subscription-generated expenses:
- Use the category filter and select **Subscriptions**
- All expenses in this category were automatically created from subscriptions

---

## Updating Subscriptions

You can update subscription details at any time. The system handles different types of updates intelligently.

### How to Update a Subscription

1. Navigate to the **Subscriptions** tab
2. Find the subscription you want to update
3. Click the **Edit** button (pencil icon)
4. Modify the subscription details
5. Click **Save** to apply changes

### Types of Updates and Their Effects

#### Updating the Start Date

**Moving the start date earlier:**
- The system calculates new billing events for the extended period
- New expense records are created for the additional past bills
- You'll see a confirmation dialog similar to creating a subscription with past bills

**Moving the start date later:**
- No changes to existing expenses
- Future billing continues from the new start date

#### Updating the Billing Frequency

**Changing from Monthly to Yearly (or vice versa):**
- The next billing date is recalculated based on the new frequency
- Existing expenses remain unchanged
- Future bills will follow the new frequency

**Example:**
- Current: Monthly subscription, next bill March 20
- Change to: Yearly
- New next bill: March 20 next year

#### Updating the Amount

**Changing the subscription cost:**
- All existing expenses keep their original amounts
- Only future bills will use the new amount
- This ensures your historical expense records remain accurate

**Example:**
- Netflix increases from $15.99 to $17.99
- Past expenses still show $15.99
- Future bills will be $17.99

#### Updating the End Date

**Setting or changing the end date:**
- The subscription will stop generating expenses after the end date
- Existing expenses are not affected
- The automated billing system respects the end date

#### Updating Auto-Renew

**Enabling or disabling auto-renew:**
- Controls whether the subscription continues after the end date
- Does not affect existing expenses

### Important Notes

- Updates are logged in the audit trail for tracking
- You cannot modify past expenses directly through subscription updates
- To change a past expense, edit it directly in the expense list

---

## Deleting Subscriptions

When you delete a subscription, you can choose what happens to the linked expenses.

### How to Delete a Subscription

1. Navigate to the **Subscriptions** tab
2. Find the subscription you want to delete
3. Click the **Delete** button (trash icon)
4. A confirmation dialog appears with two options:
   - **Keep Expenses**: Delete the subscription but keep all linked expenses
   - **Delete Expenses**: Delete both the subscription and all linked expenses

### Choosing the Right Option

#### Keep Expenses

Choose this option when:
- You want to maintain your expense history
- The subscription has ended but you want records of past payments
- You're consolidating subscriptions but want to preserve financial data

**What happens:**
- The subscription is deleted
- All linked expenses remain in your expense list
- Expenses are no longer marked as subscription-generated
- The subscription category remains assigned to the expenses

#### Delete Expenses

Choose this option when:
- You added the subscription by mistake
- You want to completely remove all traces of the subscription
- You're cleaning up test data

**What happens:**
- The subscription is deleted
- All linked expenses are permanently deleted
- This action cannot be undone
- Your expense totals and charts will be updated

### Confirmation Dialog

The dialog shows:
- **Subscription name** being deleted
- **Number of linked expenses** that will be affected
- **Total amount** of linked expenses
- **Warning** about the consequences of each option

### Important Notes

- Deletion is permanent and cannot be undone
- If you're unsure, choose "Keep Expenses" to preserve your data
- You can always manually delete individual expenses later
- The audit trail records the deletion for tracking purposes

---

## Tips and Best Practices

### Setting Up New Subscriptions

- Set your timezone preference before creating subscriptions
- Use descriptive names for easy identification
- Add notes for subscription details (account email, plan type, etc.)
- Review the past bills preview carefully before confirming

### Managing Existing Subscriptions

- Regularly review your subscriptions to identify unused services
- Update amounts when subscription prices change
- Set end dates for trial periods or limited-time subscriptions
- Use the subscription list to track total monthly/yearly costs

### Working with Expenses

- Use the subscription indicator to quickly identify recurring expenses
- Filter by the Subscriptions category to see all automated expenses
- Navigate to subscriptions from expenses to update billing details
- Keep subscription-generated expenses separate from manual entries

### Troubleshooting

**Past bills not showing up:**
- Check that the start date is before today
- Verify your timezone preference is set correctly
- Ensure you clicked "Confirm" in the preview dialog

**Billing dates seem incorrect:**
- Verify your timezone preference matches your location
- Check the subscription start date and frequency
- Remember that dates are calculated in your local timezone

**Expenses not being created automatically:**
- The system processes bills hourly
- Check that the subscription hasn't reached its end date
- Verify the subscription is still active
- Contact support if issues persist

---

## Frequently Asked Questions

**Q: Can I edit expenses that were created from subscriptions?**  
A: Yes, you can edit any expense in the expense list, including subscription-generated ones. However, changes won't affect the subscription itself.

**Q: What happens if I change my timezone after creating subscriptions?**  
A: Existing subscriptions and expenses remain unchanged. The new timezone will be used for future billing calculations.

**Q: Can I create expenses manually for a subscription?**  
A: Yes, you can create manual expenses in the Subscriptions category, but they won't be linked to a subscription.

**Q: How often does the system check for due subscriptions?**  
A: The automated billing system runs every hour and checks each user's local date for due subscriptions.

**Q: Can I have multiple subscriptions with the same name?**  
A: Yes, the system allows duplicate names. Use notes to differentiate them if needed.

**Q: What happens to expenses if I update the subscription amount?**  
A: Past expenses keep their original amounts. Only future bills use the new amount.

**Q: Can I restore a deleted subscription?**  
A: No, deletion is permanent. If you kept the expenses, you can create a new subscription with the same details.

---

## Support

If you encounter issues or have questions not covered in this guide:
- Check the monitoring logs for system status
- Review the deployment guide for technical details
- Contact your system administrator
- Report bugs through the issue tracker
