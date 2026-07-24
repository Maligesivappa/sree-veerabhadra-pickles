SREE VEERABHADRA PICKLES — FIREBASE WEBSITE
===========================================

UPLOAD THESE FILES TO GITHUB
1. Extract this ZIP.
2. In your GitHub repository, upload all files and the assets folder.
3. Replace old files when asked.
4. Commit changes.
5. Wait 1–2 minutes and refresh GitHub Pages.

BEFORE ADMIN LOGIN WORKS
Firebase Console:
1. Open Authentication.
2. Click Get started.
3. Enable Email/Password.
4. Open Users.
5. Add your admin email and password.

FIRESTORE RULES
1. Open Firestore > Rules.
2. Replace existing rules with the content in firestore-rules.txt.
3. Click Publish.

ADMIN PAGE
https://YOUR-GITHUB-PAGES-LINK/admin.html

PRODUCTS
Add products from the Admin Portal later:
- Product name
- Weight
- MRP
- Offer price
- Image URL
- Description
- Stock

ORDERS
Customer orders are saved automatically to Firestore.
Admin can update order status.

UPI
UPI is disabled for now. Add the PhonePe Business QR later.

IMPORTANT
Never put your Firebase admin password directly inside JavaScript.
Use Firebase Authentication.
