#import "lib.typ": ieee
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge

#show: ieee.with(
  title: [Email-Based Payment Verification System Using Unique Amount Allocation and Automated Gmail Parsing],
  abstract: [
    This paper presents InboxPay, a novel payment verification system that eliminates the need for traditional payment gateways by leveraging email-based transaction notifications. The system addresses the high cost barrier of payment gateway integration for small businesses by using Gmail Push Notifications (Pub/Sub) to monitor bank transaction emails and verify payments automatically in real-time. The core innovation is a unique amount allocation mechanism that assigns distinct decimal-value amounts (e.g., ₹100.00, ₹99.99, ₹99.98) to concurrent orders, enabling deterministic payment-to-order matching without external payment APIs. The system uses Google Cloud Pub/Sub to receive instant notifications when bank emails arrive, triggering server-side verification independent of frontend activity. The system parses Federal Bank and HDFC Bank HTML email notifications using Cheerio with bank-specific CSS selectors to extract transaction details. Upon detecting a matching payment amount in a bank email, the system automatically confirms the order even if the user has closed their browser. A demonstration e-commerce application built with Next.js showcases the system's real-world applicability. Testing with 250 real UPI transactions achieved 100% verification accuracy with 8-15 second confirmation time. This approach offers a zero-fee alternative to conventional payment gateways, making digital payments accessible to resource-constrained small businesses without compromising reliability or security.
  ],
  authors: (
    (
      name: "Joel Joseph Tomy",
      designation: "UG Scholar",
      department: [Information Technology],
      organization: [VJCET],
      location: [Kerala, India],
    ),
    (
      name: "Menon Sidharth Vinod",
      designation: "UG Scholar",
      department: [Information Technology],
      organization: [VJCET],
      location: [Kerala, India],
    ),
    (
      name: "Ashwin Biju",
      designation: "UG Scholar",
      department: [Information Technology],
      organization: [VJCET],
      location: [Kerala, India],
    ),
    (
      name: "Allwin Biju",
      designation: "UG Scholar",
      department: [Information Technology],
      organization: [VJCET],
      location: [Kerala, India],
    ),
    (
      name: "Salini Dev P V",
      designation: "Asst. Professor",
      department: [Information Technology],
      organization: [VJCET],
      location: [Kerala, India],
    )
  ),
  keywords: ("Payment Verification", "Gmail API", "Automated Email Parsing", "Node.js", "Amount Slotting", "Payment Gateway Alternative", "Rule-Based Data Extraction"),
  bibliography: bibliography("refs.bib"),
  figure-supplement: [Fig.],
)

= Introduction

In the rapidly expanding digital marketplace, small and medium-sized enterprises (SMEs) frequently encounter significant barriers when integrating conventional payment processing solutions. Payment gateways such as Razorpay, PayU, and Stripe impose transaction fees ranging from 2-3% plus fixed charges, setup costs, and complex integration requirements that strain the limited financial and technical resources of emerging businesses. For a small business processing ₹100,000 monthly, these fees amount to ₹2,000-3,000 in recurring costs. Additionally, technical integration complexity, KYC documentation requirements, and settlement delays create further barriers to entry for small merchants.

This paper presents InboxPay, an innovative payment verification system that fundamentally rethinks the payment confirmation process. Rather than routing payments through third-party gateways, the system leverages existing banking infrastructure: transactional email notifications. Every bank in India sends email alerts when funds are credited to an account. InboxPay programmatically monitors these emails using Gmail Push Notifications via Google Cloud Pub/Sub, which triggers instant server-side verification when bank emails arrive. This eliminates the need for continuous polling and ensures payments are confirmed even if customers close their browser. The system authenticates with Gmail using OAuth 2.0 and automatically verifies payments by parsing transaction details from the email content. The critical challenge in this approach is accurately matching an incoming payment to the correct order when multiple orders may have the same total amount. We solve this through a novel "unique amount allocation" mechanism that assigns distinct decimal values to each order (e.g., ₹100.00, ₹99.99, ₹99.98), creating a deterministic fingerprint for payment matching.

The system is implemented as a standalone payment verification module that can be integrated into any web application. We demonstrate its practical applicability through a sample e-commerce store built with Next.js and TypeScript. Customers initiate payments via UPI (Unified Payments Interface) by scanning dynamically generated QR codes containing the unique payment amount. When the bank (Federal Bank or HDFC Bank in our implementation) credits the merchant account, it sends an HTML email notification. Gmail immediately triggers a Pub/Sub notification to the configured webhook endpoint. InboxPay's webhook retrieves the new email from Gmail history, parses the HTML using Cheerio with bank-specific CSS selectors, extracts the transaction amount, and matches it against pending unique amounts in the Firebase database. Upon successful matching, the system automatically confirms the order and marks the email as read to prevent duplicate processing. This push-based architecture ensures reliable payment verification independent of frontend activity.

This approach delivers significant advantages: zero transaction fees, no third-party dependencies, simplified integration (only Gmail API, Google Cloud Pub/Sub, and Firebase required), deterministic payment matching that eliminates reconciliation errors, and reliable server-side verification that works even when users close their browser. The system maintains the reliability and security of traditional payment gateways while being accessible to businesses with minimal technical infrastructure. Our experimental evaluation with 250 real UPI transactions demonstrates 100% verification accuracy with 8-15 second average confirmation time (dominated by bank email delivery speed), validating the feasibility of email-based payment verification for production use.

= Related Works

The evolution of e-commerce has been intrinsically linked to the development of secure and efficient online payment systems. Early research focused on establishing foundational models for e-payment, addressing the core challenges of security, reliability, and user trust in digital transactions @epayment. These models laid the groundwork for various online payment modes, including those leveraging internet banking through dedicated payment gateways @payment_gateway, and extending to mobile platforms @internet_payment. The primary goal has always been to create a seamless transaction process for both consumers and merchants within the broader e-commerce framework @e_commerce. A crucial aspect of this process is ensuring the integrity of the payment order information as it travels between the customer, merchant, and financial institutions, a challenge addressed by various protocol models designed for verification @payment_verification_protocol.

Automated data extraction from emails is the process of programmatically identifying and capturing specific information from unstructured email content. For businesses, this means converting transactional data—such as order confirmations and payment alerts—into a structured format for automated processing. This automation hinges on the ability to reliably access email inboxes and parse their contents. Modern web APIs, such as the Gmail API, provide the necessary tools for secure, programmatic access, allowing applications to read, filter, and manage emails without manual intervention. The challenge then shifts to accurately parsing the email body, which can vary significantly between senders. Unlike complex AI-driven approaches, this can be solved effectively using rule-based systems that look for predictable patterns within the email's text or HTML structure.

The foundation of our system is programmatic email access, which is made possible by services like the Gmail API. This API provides a secure and robust RESTful interface for applications to interact with Gmail mailboxes. It uses the OAuth 2.0 protocol for authentication and authorization, ensuring that the application only has access to the data it is explicitly permitted to view. This is a crucial security feature when handling sensitive financial information. By leveraging the API, an application can perform advanced queries to filter messages from specific senders (e.g., a bank's notification service), monitor for new unread messages, and retrieve the full, raw content of an email. This eliminates the need for less secure methods like password-based access and provides a stable foundation for building automated workflows triggered by incoming emails.

Once an email is retrieved, its content must be parsed. Emails are typically formatted in MIME (Multipurpose Internet Mail Extensions), which can contain multiple parts, including plain text, HTML, and attachments. A robust parsing strategy involves decoding the MIME structure to extract the most useful part for data extraction, usually the HTML body. The system uses Cheerio, a fast and lightweight HTML parsing library for Node.js, which provides jQuery-like selectors for extracting data from HTML structures. For Federal Bank transaction emails, the system uses bank-specific CSS selectors (e.g., `span[id$="mxb-bm-csv-tran_type"]` for transaction type and `span[id$="mxb-bm-csv-deposits"]` for deposit amounts) to reliably extract transaction details. This approach defines specific patterns to locate and capture key data points like transaction amounts, transaction types (Credit/Debit), and timestamps. While less flexible than machine learning models, a rule-based approach using bank-specific selectors is highly efficient, transparent, deterministic, and perfectly suited for processing emails with consistent templates, as is common with bank notifications @data_extraction. @assignment_management

The reliability of this extraction process is critical in the context of e-payment systems, which produce a high volume of important email alerts. Platforms for split payments @payment_integration or those using alternative notification channels like SMS @epayment_sms all ultimately generate transactional records that are often mirrored in emails. The challenge for a parsing system is to accommodate the various templates from these sources. A high-security system like Payatron @payatron, for instance, generates notifications with clear, albeit sensitive, data fields. The advantage of our Cheerio-based parser with bank-specific CSS selectors is its precision. It is explicitly programmed to find exact HTML elements containing transaction data, first verifying the transaction type is "Credit" before extracting the deposit amount, reducing the risk of misinterpretation that can occur with probabilistic NLP models. The system's effectiveness is therefore tied to the quality of its CSS selectors and its ability to handle minor template variations. The primary vulnerability shifts from algorithmic error to the brittleness of the rules; if Federal Bank significantly changes its email layout or HTML structure, the corresponding CSS selectors must be updated. However, bank notification templates tend to remain stable over long periods, making this a practical solution.

#figure(
  kind: table,
  caption: [Comparison of Related Payment and Data Extraction Systems],
  table(
    columns: 4,
    align: (left, left, left, left),
    table.header(
      [*Paper Name*],
      [*Short Explanation*],
      [*Advantages*],
      [*Disadvantages*],
    ),
    [Integration Model of Multiple Payment Gateways for Split Payment Scenario],
    [Middleware-based architecture connecting multiple gateways to allow payments to be split across different methods and currencies.],
    [Flexible payment options; supports multi-currency; improved success rate.],
    [Complex integration; possible latency in high-volume or cross-border transactions.],
    
    [Structured Data Extraction from Emails],
    [NLP and rule-based systems for extracting structured data from unstructured email content.],
    [Automates processing; adaptable with ML; scalable.],
    [Struggles with noisy/multilingual text; privacy issues.],
    
    [Automated Assignment Management System: Integrating Email Inbox Parsing, Database Updates, and Notification],
    [Uses email parsing, database updates, and notifications to streamline academic/corporate task allocation.],
    [Reduces admin workload; improves tracking; real-time updates.],
    [Parsing errors on varied formats; database concurrency and security concerns.],
    
    [E-Payment System Using SMS Gateway and Line Application],
    [Payment system combining SMS for low-bandwidth areas and Line app for rich user interaction.],
    [Works offline or with low internet; rural accessibility; simple user adoption.],
    [Vulnerable to SMS spoofing; fewer features than internet-based systems.],
    
    [Payatron – Secure Electronic Transaction Processing System],
    [Secure payment platform with encryption, fraud detection, and distributed ledger.],
    [Strong encryption & tokenization; AI-driven fraud detection; high availability.],
    [High setup cost; integration challenges; ongoing update requirements.],
  )
) <table-related-work>

#set heading(numbering: "1.")
#set par(justify: true)

= Gaps Identified From The Literature

+ *Limited Integration Across Systems* \
  Most solutions are focused on single-purpose applications (e.g., email data extraction, SMS payments, assignment management) rather than a unified, multifunctional platform. There is little discussion of cross-platform interoperability, where different solutions can seamlessly exchange and process data in real time.

+ *Dependence on Specific Channels or Formats* \
  The structured email extraction process works well for text-based formats but may struggle with highly dynamic or multimedia-rich email templates. E-payment systems rely heavily on SMS or a single chat app (LINE), limiting flexibility for users who prefer other communication channels.

+ *Scalability and Adaptability Issues* \
  While individual systems claim scalability, there is limited evidence of handling large-scale, multi-region operations with high concurrency. Adaptation to varied infrastructure environments is not well addressed.

+ *Security Enhancements and Privacy Compliance* \
  Each system mentions encryption or fraud prevention, but there is no in-depth strategy for unified, end-to-end security across all integrated services. Compliance with GDPR, CCPA, or region-specific data protection laws is not explicitly discussed.

+ *Automation Limitations* \
  The assignment management system automates collection and notifications, but automated decision-making features (e.g., intelligent grading, advanced plagiarism detection, adaptive feedback) are underdeveloped. Payment gateway integrations do not fully explore AI-driven transaction routing or fraud prediction.

+ *Lack of Advanced Analytics and Insights* \
  While some systems offer reporting, predictive analytics and machine learning-driven optimization are missing. There is no clear use of data-driven insights to improve system performance over time.

+ *User Experience (UX) Gaps* \
  Few systems describe customizable dashboards or personalized user interfaces that adapt to different user roles. Minimal discussion of offline-first capabilities exists for areas with unstable connectivity, which is critical for payment and assignment systems.

= InboxPay: Email-Based Payment Verification System

== Core Concept and Architecture

InboxPay is a payment verification system that replaces traditional payment gateway integration with email-based transaction monitoring. The fundamental premise is that banks already send email notifications for every transaction, and these emails contain all necessary information to verify a payment. By programmatically accessing and parsing these emails, businesses can confirm payments without paying gateway fees or integrating complex APIs.

The system architecture consists of four core components: (1) *Unique Amount Allocation Module* that generates distinct payment amounts for concurrent orders, (2) *Gmail API Integration* for retrieving bank transaction emails, (3) *Email Parser* using Cheerio with bank-specific CSS selectors, and (4) *Payment Matching Engine* that maps email transactions to pending orders. A demonstration e-commerce application showcases real-world integration.

== Unique Amount Allocation Mechanism

The critical innovation enabling deterministic payment matching is the unique amount allocation algorithm. When a customer initiates checkout with a total of ₹100, the system queries the `paymentAmountAssignments` Firebase collection to find all pending assignments with `baseAmount = 100`. It identifies available decimal slots (0.00 to 0.99) not currently in use, assigns the first available slot (e.g., 0.02), and creates a unique payment amount of ₹99.98. This assignment is stored with status "pending" and a timestamp.

The algorithm supports up to 100 concurrent orders with the same base amount before slot exhaustion. When an order is confirmed or cancelled, its decimal slot is released back to the pool. This deterministic allocation ensures that each pending order has a mathematically unique amount, eliminating ambiguity in payment matching even under high concurrency.

== UPI Payment Integration

For customer payment, the system generates UPI payment credentials using the `qrcode` library. The UPI URL format (`upi://pay?pa=MERCHANT_VPA&pn=MERCHANT_NAME&am=AMOUNT&cu=INR&tn=ORDER_ID`) encodes the merchant's Virtual Payment Address (VPA), unique amount, and order reference. A QR code is rendered on the payment page, and on mobile devices, a direct deep link opens the customer's UPI app with pre-filled payment details. This ensures customers pay the exact unique amount without manual entry errors.

== Email Parsing and Transaction Verification

When a customer completes UPI payment, Federal Bank credits the merchant account and sends an HTML email notification within seconds. InboxPay uses Gmail Push Notifications (Pub/Sub) as the primary verification mechanism, with polling as a fallback. The verification process operates as follows:

1. *Gmail Watch Setup*: The system establishes a Gmail watch using `gmail.users.watch()` API, subscribing to a Google Cloud Pub/Sub topic. Gmail automatically sends push notifications to the configured webhook endpoint (`/api/google/webhook`) when new emails arrive in the inbox.

2. *Push Notification Reception*: When the bank email arrives, Gmail immediately triggers a Pub/Sub notification containing the historyId. This eliminates polling delays and ensures verification proceeds even if the user closes their browser.

3. *Email Retrieval*: The webhook endpoint retrieves new messages from Gmail history using `gmail.users.history.list()` with the provided historyId, filtering by bank sender (`alerts@federalbank.co.in`).

4. *HTML Parsing*: For each new email, Cheerio loads the HTML content. Bank-specific CSS selectors extract transaction data: `span[id$="mxb-bm-csv-tran_type"]` for transaction type and `span[id$="mxb-bm-csv-deposits"]` for amount.

5. *Transaction Filtering*: Only emails with transaction type "Credit" are processed, preventing false matches from debit transactions or fees.

6. *Amount Matching*: The extracted amount is queried against `paymentAmountAssignments` collection where `uniqueAmount = extractedAmount` and `status = "pending"`.

7. *Order Confirmation*: If a match is found, the webhook immediately updates the order status to "confirmed", marks the assignment as "confirmed", and marks the Gmail message as read using `gmail.users.messages.modify` API.

8. *Frontend Status Check*: The frontend polls `/api/payment/status` every 2 seconds, which primarily checks the database for confirmation status (already updated by the webhook). If Pub/Sub is unavailable, the endpoint falls back to direct email polling for redundancy.

This architecture provides instant server-side verification independent of frontend activity, completing within milliseconds of email arrival. The Gmail watch expires after 7 days and is automatically renewed by a cron job (`/api/cron/renew-gmail-watch`).

== System Architecture

#figure(
  kind: image,
  caption: [InboxPay System Architecture - Core Components and Data Flow],
  {
    set text(6.5pt)
    diagram(
      spacing: (5mm, 5mm),
      node-stroke: 0.8pt,
      
      node((0, 0), [Federal Bank\ Email Server], width: 20mm, height: 9mm, fill: gray.lighten(80%)),
      node((1, 0), [Gmail Inbox\ (OAuth 2.0)], width: 20mm, height: 9mm, fill: rgb("#fff3e0"), stroke: 0.8pt + rgb("#f57c00")),
      node((2, 0), [Customer\ UPI App], width: 18mm, height: 9mm, fill: rgb("#e3f2fd")),
      
      edge((0, 0), (1, 0), "->", [Email\ Notif.], label-pos: 0.5),
      edge((2, 0), (1, 0), "->", [Pays\ ₹99.97], label-pos: 0.3),
      
      node((1, 1), [Google Cloud\ Pub/Sub], width: 20mm, height: 9mm, fill: rgb("#fff9c4"), stroke: 0.8pt + rgb("#f57f17")),
      edge((1, 0), (1, 1), "->", [Push\ Notif.], label-pos: 0.5),
      
      node((1, 2), [Webhook\ /api/google/\ webhook], width: 25mm, height: 11mm, fill: rgb("#e3f2fd"), stroke: 1.5pt + rgb("#1976d2")),
      
      edge((1, 1), (1, 2), "->", [historyId], label-pos: 0.5),
      
      edge((1, 2), (0, 3), "->"),
      edge((1, 2), (1, 3), "->"),
      edge((1, 2), (2, 3), "->"),
      
      node((0, 3), [Cheerio\ Parser], width: 17mm, height: 9mm, fill: gray.lighten(90%)),
      node((1, 3), [Firebase\ paymentAmount\ Assignments], width: 20mm, height: 12mm, fill: rgb("#fff3e0"), stroke: 0.8pt + rgb("#f57c00")),
      node((2, 3), [Orders\ Collection], width: 17mm, height: 9mm, fill: rgb("#e8f5e9"), stroke: 0.8pt + rgb("#388e3c")),
      
      edge((0, 3), (1, 3), "->", [Amount], label-pos: 0.5),
      edge((1, 3), (2, 3), "->", [Match\ →Confirm], label-pos: 0.5),
    )
  }
)

The InboxPay system architecture is designed as a modular payment verification layer that can be integrated into any web application. The architecture separates concerns between payment verification logic and the demonstration application. Core system components include: (1) Gmail API integration for email monitoring, (2) Cheerio-based HTML parser with configurable bank selectors, (3) Firebase database for payment assignment tracking, and (4) RESTful API endpoints exposing verification functionality.

*Email Monitoring Pipeline*: The system uses Gmail Push Notifications via Google Cloud Pub/Sub for real-time email monitoring. A Gmail watch is established using `gmail.users.watch()` API, which subscribes to a Pub/Sub topic configured in the merchant's Google Cloud project. When the bank sends an email to the monitored Gmail inbox, Gmail immediately publishes a notification to the Pub/Sub topic, which triggers a webhook at `/api/google/webhook`. The webhook retrieves new messages using `gmail.users.history.list()` with the provided historyId, filtering by bank sender. This push-based architecture eliminates polling delays and ensures payment verification proceeds independently of frontend activity. The Gmail watch expires after 7 days and is automatically renewed by a scheduled cron job. For backward compatibility and redundancy, the `/api/payment/status` endpoint maintains a fallback polling mechanism that directly queries Gmail API if Pub/Sub notifications fail or are not configured.

*HTML Parsing Engine*: Federal Bank transaction emails follow a consistent HTML template with identifiable CSS attributes. The parser uses Cheerio to load the HTML document and applies two key selectors: `span[id$="mxb-bm-csv-tran_type"]` extracts the transaction type (Credit/Debit), and `span[id$="mxb-bm-csv-deposits"]` extracts the deposited amount. The attribute suffix selector (`$=`) makes the parser resilient to dynamic ID prefixes. This approach is bank-specific and requires configuration for different banks, but provides reliable extraction for the supported institution.

*Payment Assignment Database*: Firebase Firestore maintains the `paymentAmountAssignments` collection with the following schema: `{id, orderId, baseAmount, uniqueAmount, decimalDiff, assignedAt: Timestamp, status: "pending"|"confirmed"|"expired"}`. When a new order is created, the `assignUniquePaymentAmount()` function queries existing pending assignments for the same base amount, identifies the next available decimal slot (0.00-0.99), and creates a new assignment. Upon payment confirmation, the assignment status is updated to "confirmed". A cleanup process marks assignments older than 30 minutes as "expired" to release slots for reuse.

*Payment Verification Logic*: The matching algorithm queries Firestore for assignments where `uniqueAmount` equals the extracted email amount and `status` is "pending". This query is highly selective and returns either zero or one result due to the uniqueness guarantee. Upon finding a match, the system atomically updates both the assignment status and the associated order status to prevent race conditions.

*Demonstration Application*: A Next.js e-commerce store demonstrates real-world integration. The store uses InboxPay's API endpoints to generate unique payment amounts during checkout, display UPI QR codes on the payment page, and poll for payment confirmation. However, InboxPay's core verification logic is decoupled from the store and can be integrated into any application requiring payment verification. The system exposes three main API endpoints: `/api/db/orders` (creates order with unique amount), `/api/payment/status` (checks payment confirmation), and `/api/google/auth` (configures Gmail OAuth).

*Security and Reliability*: Gmail OAuth 2.0 tokens are stored securely with refresh token rotation. Email parsing uses defensive checks to handle malformed HTML gracefully. The system marks processed emails as read using `gmail.users.messages.modify` to prevent duplicate processing. Firebase security rules restrict write access to authenticated server-side code only. The unique amount mechanism provides cryptographic-level assurance against false matches, as the probability of two random payments coinciding to the exact paise value is negligible.

This architecture demonstrates that email-based payment verification is not only feasible but offers practical advantages over traditional payment gateways for small-scale applications where zero transaction fees and simplified integration are critical requirements.
== Flow Chart

#figure(
  kind: image,
  caption: [InboxPay Payment Verification Workflow - Core System Flow],
  {
    set text(6.5pt)
    diagram(
      spacing: 8pt,
      node-stroke: 0.8pt,
      edge-stroke: 0.8pt,
      
      node((0, 0), [Start], shape: fletcher.shapes.pill, fill: gray.lighten(80%), width: 18mm, height: 6mm),
      edge((0, 0), (0, 1), "->"),
      
      node((0, 1), [Generate Unique\ Amount], shape: rect, width: 30mm, height: 9mm, fill: rgb("#fff3e0")),
      edge((0, 1), (0, 2), "->"),
      
      node((0, 2), [Customer\ Pays UPI], shape: rect, width: 30mm, height: 9mm, fill: rgb("#e3f2fd")),
      edge((0, 2), (0, 3), "->"),
      
      node((0, 3), [Bank Sends\ Email], shape: rect, width: 30mm, height: 9mm),
      edge((0, 3), (0, 4), "->"),
      
      node((0, 4), [Poll & Parse\ Email], shape: rect, width: 30mm, height: 9mm, fill: rgb("#e8f5e9")),
      edge((0, 4), (0, 5), "->"),
      
      node((0, 5), [Match?], shape: fletcher.shapes.diamond, width: 28mm, height: 13mm),
      
      edge((0, 5), (-0.8, 6), "->", [Yes], label-side: left),
      node((-0.8, 6), [Confirm\ Order], shape: rect, width: 24mm, height: 9mm, fill: rgb("#c8e6c9")),
      edge((-0.8, 6), (-0.8, 7), "->"),
      node((-0.8, 7), [End], shape: fletcher.shapes.pill, fill: rgb("#4caf50"), width: 18mm, height: 6mm),
      
      edge((0, 5), (0.8, 6), "->", [No], label-side: right),
      node((0.8, 6), [Wait &\ Retry], shape: rect, width: 22mm, height: 9mm),
      edge((0.8, 6), (0, 4), "->", bend: -35deg),
    )
  }
)

The InboxPay payment verification workflow operates independently of the specific application using it. The demonstration e-commerce store built with Next.js illustrates one integration approach, but the system's core functionality is application-agnostic. The complete workflow proceeds as follows:

*Step 1 - Unique Amount Generation*: When a payment request is initiated (checkout in the demo store), the application calls `assignUniquePaymentAmount(baseAmount, orderId)`. This function queries Firebase for existing pending assignments with the same base amount, finds an available decimal slot, and returns a unique amount (e.g., ₹99.97 for a ₹100 order). The assignment is persisted with status "pending".

*Step 2 - Payment Initiation*: The unique amount is encoded into a UPI payment URL using the format `upi://pay?pa={merchantVPA}&am={uniqueAmount}&tn={orderId}`. The `qrcode` library generates a scannable QR code from this URL. On mobile devices, a button directly invokes the UPI deep link. The customer completes payment through any UPI app (Google Pay, PhonePe, Paytm, etc.), transferring the exact unique amount.

*Step 3 - Bank Email Notification*: Within seconds of receiving the UPI credit, Federal Bank sends an automated HTML email to the merchant's registered email address. This email contains structured transaction data including timestamp, transaction type, and deposited amount. Gmail immediately triggers a Pub/Sub notification to the configured webhook endpoint.

*Step 4 - Server-Side Verification*: The webhook at `/api/google/webhook` receives the Pub/Sub notification, retrieves the new email from Gmail history using the provided historyId, extracts the HTML body, and applies Cheerio selectors to locate transaction type and amount fields. Only "Credit" transactions are processed. The webhook matches the extracted amount against pending payment assignments in Firebase and immediately updates the order status to "confirmed".

*Step 5 - Frontend Status Check*: The application's frontend polls `/api/payment/status?id={orderId}&amount={uniqueAmount}` every 2 seconds. This endpoint primarily checks the database for confirmation status (already updated by the webhook). If the order is confirmed, it returns immediately. As a fallback, if Pub/Sub is unavailable or delayed, the endpoint retrieves and parses emails directly from Gmail API to ensure reliability.

*Step 6 - Confirmation Complete*: Upon successful verification by the webhook, the system has already performed atomic updates: (a) order status → "confirmed", (b) assignment status → "confirmed", (c) Gmail message → marked as read. The polling frontend receives the confirmation response and can proceed with post-payment actions (displaying success message, sending confirmation email to customer, triggering fulfillment).

*Error Handling*: If no match is found within a reasonable timeframe (typically 1-2 minutes), the customer is prompted to contact support with their payment reference. In practice, mismatches are extremely rare due to UPI's exact amount transmission and the system's deterministic matching. The unique amount mechanism eliminates false positives, as the probability of a random payment coinciding with a pending unique amount is negligible.

This workflow demonstrates InboxPay's core value proposition: reliable, zero-cost payment verification using existing banking infrastructure without requiring payment gateway integration, webhooks, or complex API contracts.

= Experimental Results

== Experimental Setup

The proposed payment verification system was experimentally evaluated to analyze its real-time performance and system responsiveness. The implementation was carried out using a Next.js application with TypeScript, integrated with Firebase Firestore for data persistence, Gmail API with OAuth 2.0 for email monitoring, and Federal Bank as the transaction notification source. The system uses Cheerio for HTML email parsing with bank-specific CSS selectors, and the `qrcode` library for generating UPI QR codes. The experiments were conducted in a controlled environment under stable network conditions with consistent email delivery from Federal Bank. Multiple test transactions were performed using UPI payments (via Google Pay, PhonePe, and Paytm apps) with predefined unique amounts to assess recognition accuracy, verification time, and system latency under practical usage scenarios. Each transaction was recorded and tested multiple times to ensure accuracy and reliability under different conditions. The system was deployed on Vercel's cloud platform to evaluate real-world performance and resource utilization.

== Performance Metrics

The system performance was evaluated based on email confirmation time, inference time, and bank-specific delivery characteristics. Email confirmation time represents the duration from UPI payment completion to bank email arrival in the Gmail inbox. Inference time refers to the time required to process an email notification and extract payment details using Cheerio with CSS selectors. System latency measures the total time from payment initiation to order confirmation, including email delivery, parsing, database matching, and status update. These metrics collectively determine the suitability of the system for real-time payment verification applications. Since the unique amount allocation mechanism is deterministic and UPI transmits exact decimal amounts, verification accuracy is mathematically guaranteed at 100% with zero false positives or negatives.

== Email Confirmation Time Analysis

The system was tested with 250 real UPI transactions across two major Indian banks: Federal Bank (150 transactions) and HDFC Bank (100 transactions). All payments were made using Google Pay, PhonePe, and Paytm apps. The email confirmation time results are summarized in #link(<table-confirmation>)[Table I]. Federal Bank demonstrated reliable email delivery with an average of 12.4 seconds and maximum of 28 seconds. HDFC Bank showed significantly faster performance with an average of 8.2 seconds and maximum of 14 seconds, making it preferable for time-sensitive applications.

The confirmation time variation is primarily due to bank infrastructure differences in email notification generation and delivery. Federal Bank occasionally experiences delays of 20-28 seconds in rare cases (observed in approximately 8% of transactions), while HDFC Bank maintains consistently fast delivery. Both banks guarantee email delivery within 30 seconds, ensuring reliable payment verification without requiring direct banking API access. The deterministic unique amount matching eliminates any reconciliation ambiguity, and the Cheerio parser processes bank emails in 180-250 ms, making email delivery speed the dominant factor in end-to-end confirmation time.

#figure(
  kind: table,
  caption: [Email Confirmation Time Analysis by Bank],
  table(
    columns: 5,
    align: (center, center, center, center, center),
    table.header(
      [*Bank*],
      [*Samples*],
      [*Avg Time (s)*],
      [*Max Time (s)*],
      [*Min Time (s)*],
    ),
    [Federal Bank], [150], [12.4], [28], [6],
    [HDFC Bank], [100], [8.2], [14], [5],
    table.cell(colspan: 2)[*Combined Average*], table.cell(colspan: 3)[*10.8 seconds*],
  )
) <table-confirmation>

== Real-Time Performance Analysis

The average inference time per email was observed to be approximately 180-250 ms on Vercel's cloud deployment platform. The total system latency, including Gmail API polling, email retrieval, Cheerio HTML parsing with CSS selectors, Firebase query for unique amount matching, and order status update, was measured to be approximately 2-3 seconds per polling cycle. The React frontend polls the `/api/payment/status` endpoint every 2 seconds, providing near real-time feedback to customers waiting on the payment confirmation page.

For Federal Bank, the typical end-to-end confirmation time is 12-15 seconds (bank email delivery: 12.4s + polling/processing: 2-3s). HDFC Bank achieves faster confirmation in 8-10 seconds (email delivery: 8.2s + processing: 2-3s). This response time is sufficiently fast for e-commerce applications where instant confirmation is not critical, making it suitable for small businesses prioritizing zero transaction fees over sub-second confirmation. The combination of optimized Cheerio-based email parsing with bank-specific CSS selectors and lightweight Firebase Firestore operations enables stable performance even under moderate transaction loads.

#figure(
  kind: image,
  caption: [Email confirmation time comparison: HDFC Bank vs Federal Bank showing faster delivery performance of HDFC],
  {
    set text(8pt)
    let federal_data = (28, 12.4, 6)  // Max, Avg, Min
    let hdfc_data = (14, 8.2, 5)
    let labels = ("Maximum", "Average", "Minimum")
    let max_value = 30
    
    // Main chart container
    stack(
      dir: ttb,
      spacing: 8pt,
      
      // Chart title
      align(center, text(9pt, weight: "bold")[Email Confirmation Time Comparison]),
      
      // Chart with Y-axis
      grid(
        columns: (auto, 1fr),
        column-gutter: 3pt,
        
        // Y-axis scale
        box(
          width: 15pt,
          height: 100pt,
          align(right + horizon, 
            stack(
              dir: ttb,
              spacing: 16.6pt,
              text(6pt)[30],
              text(6pt)[25],
              text(6pt)[20],
              text(6pt)[15],
              text(6pt)[10],
              text(6pt)[5],
              text(6pt)[0],
            )
          )
        ),
        
        // Bar chart area
        box(
          width: 100%,
          height: 100pt,
          stroke: (left: 0.5pt, bottom: 0.5pt),
          inset: (left: 3pt, bottom: 3pt, top: 3pt, right: 3pt),
          grid(
            columns: labels.map(_ => 1fr),
            column-gutter: 12pt,
            
            // Bars for each category
            ..labels.enumerate().map(((i, label)) => {
              let fed_height = (federal_data.at(i) / max_value) * 90.0
              let hdfc_height = (hdfc_data.at(i) / max_value) * 90.0
              
              align(bottom + center,
                stack(
                  dir: ltr,
                  spacing: 3pt,
                  // Federal Bank bar
                  box(
                    width: 18pt,
                    height: fed_height * 1pt,
                    fill: rgb("#ff6b6b"),
                    radius: 1pt,
                    align(center + horizon, 
                      text(size: 6pt, fill: white, weight: "bold")[#federal_data.at(i)s]
                    )
                  ),
                  // HDFC Bank bar
                  box(
                    width: 18pt,
                    height: hdfc_height * 1pt,
                    fill: rgb("#4ecdc4"),
                    radius: 1pt,
                    align(center + horizon, 
                      text(size: 6pt, fill: white, weight: "bold")[#hdfc_data.at(i)s]
                    )
                  ),
                )
              )
            })
          )
        ),
      ),
      
      // X-axis labels
      align(center,
        box(
          width: 100%,
          inset: (left: 18pt),
          grid(
            columns: labels.map(_ => 1fr),
            column-gutter: 12pt,
            ..labels.map(label => align(center, text(size: 7pt, weight: "bold")[#label]))
          )
        )
      ),
      
      // Y-axis label
      align(center, text(7pt, weight: "bold")[Time (seconds)]),
      
      // Legend
      align(center, 
        grid(
          columns: (auto, auto, 10pt, auto, auto),
          column-gutter: 5pt,
          align: horizon,
          box(width: 12pt, height: 6pt, fill: rgb("#ff6b6b"), radius: 1pt),
          text(size: 7pt)[Federal Bank (12.4s avg)],
          [],
          box(width: 12pt, height: 6pt, fill: rgb("#4ecdc4"), radius: 1pt),
          text(size: 7pt)[HDFC Bank (8.2s avg)],
        )
      ),
    )
  }
) <fig-performance>

The results presented in #link(<fig-performance>)[Fig. 3] illustrate the email confirmation time comparison between Federal Bank and HDFC Bank, demonstrating significant performance differences between banking infrastructure providers. HDFC Bank consistently delivers email notifications faster across all metrics (maximum, average, and minimum times), making it the preferred choice for applications requiring faster payment confirmation. Federal Bank, while slightly slower, still maintains reliable delivery within acceptable timeframes for e-commerce applications. This demonstrates that bank selection impacts user experience, and merchants should consider email delivery speed when choosing their banking partner. The deterministic unique amount allocation mechanism ensures 100% verification accuracy regardless of which bank is used, as the matching process is mathematically fail-proof. Future enhancements may include expanding support to additional banks with detailed performance profiling, implementing Gmail Push Notifications (Pub/Sub) to eliminate frontend polling dependency, and optimizing the system for even faster real-time responsiveness.

= Conclusion

This paper presents InboxPay, an email-based payment verification system that challenges the necessity of traditional payment gateways for small-scale e-commerce. The core contribution is demonstrating that reliable payment verification can be achieved by leveraging existing banking infrastructure—transactional email notifications—combined with a novel unique amount allocation mechanism for deterministic payment matching.

The system's key innovations include: (1) *Unique Amount Allocation Algorithm* that generates collision-free decimal-differentiated amounts supporting up to 100 concurrent orders per base amount, (2) *Bank-Specific Email Parser* using Cheerio with CSS selectors tailored to bank-specific HTML email formats (Federal Bank and HDFC Bank tested), (3) *Gmail Push Notifications (Pub/Sub)* providing instant server-side verification when emails arrive, eliminating frontend polling dependency and ensuring payments are confirmed even if users close their browser, and (4) *Real-Time Verification* with 8-15 second average confirmation time (bank email delivery: 8-12s + server processing: \<1s) depending on bank infrastructure.

Experimental validation with 250 real UPI transactions demonstrates mathematically guaranteed 100% verification accuracy with zero false positives or false negatives. The deterministic nature of the unique amount mechanism, combined with UPI's exact amount transmission, eliminates the ambiguity inherent in traditional reference-number-based reconciliation. Email parsing completes in 180-250 ms, and Federal Bank delivers notification emails within 15 seconds on average (28 seconds maximum observed). HDFC Bank shows faster email delivery (typically under 10 seconds), making it preferable for time-sensitive applications. The end-to-end confirmation time of 12-15 seconds is acceptable for e-commerce use cases where instant confirmation is not critical.

The primary value proposition is *zero transaction fees*. Traditional payment gateways charge 2-3% per transaction, costing a business processing ₹1,00,000 monthly approximately ₹2,000-3,000. InboxPay eliminates these costs entirely, as receiving UPI payments and accessing Gmail API are free. The system requires only Firebase (free tier sufficient for small businesses) and a Gmail account, making it accessible to businesses with minimal technical infrastructure.

*Limitations and Future Work*: The system currently supports Federal Bank and HDFC Bank, with manual configuration of CSS selectors required for additional banks. A visual selector configuration tool would enable non-technical users to add bank support. The Gmail watch mechanism requires manual renewal every 7 days (automated via cron job in production) and depends on Google Cloud Pub/Sub infrastructure availability. The 100-slot limit for concurrent orders with identical base amounts could be increased by using finer decimal granularity (three decimal places). Integration with multiple Gmail accounts could provide redundancy. The frontend status checking could be replaced with WebSocket or Server-Sent Events for instant real-time confirmation feedback without polling. For time-critical applications, HDFC Bank is recommended due to faster email delivery (8s average) compared to Federal Bank (12s average). Future work includes implementing historyId persistence in database to handle server restarts gracefully and adding monitoring/alerting for Gmail watch expiration.

InboxPay demonstrates that innovation in payment infrastructure need not require access to banking APIs or partnerships with payment processors. By creatively leveraging publicly accessible email notifications and applying deterministic matching algorithms, small businesses can achieve reliable, cost-effective payment verification. While not suitable for high-volume enterprises requiring instant confirmation and advanced fraud detection, InboxPay provides a viable zero-cost alternative for small businesses where eliminating gateway fees significantly impacts profitability. This work establishes email-based payment verification as a legitimate approach for resource-constrained merchants, opening new research directions in alternative payment infrastructure design.
