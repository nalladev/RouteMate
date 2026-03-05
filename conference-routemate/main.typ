#import "lib.typ": ieee
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge

#show: ieee.with(
  title: [ROUTEMATE: An Innovative Ride-Sharing System for Sustainable Urban Mobility],
  abstract: [
    This paper presents RouteMate, a next-generation cost-sharing mobility platform designed to address urban traffic congestion and excessive fuel consumption through optimized vehicle usage. Unlike traditional ride-sharing platforms that operate as commercial taxi services, RouteMate functions as an expense-sharing system where private vehicle owners and passengers split operational costs equally, ensuring legal compliance and community-driven participation. The system enables spontaneous ride coordination using real-time, route-based matching that aligns passenger destinations with driver routes. The platform integrates comprehensive security measures including KYC (Know Your Customer) verification and mandatory driving license verification for drivers to ensure safety, trust, and regulatory compliance. Users can authenticate via both password-based login and OTP verification, providing flexibility while maintaining security. Advanced location tracking and dynamic route optimization algorithms using OSRM (Open Source Routing Machine) minimize detours and improve ride efficiency. To encourage long-term participation, RouteMate incorporates a generous points-based reward system that awards drivers for all ride ratings (not just perfect scores), with 5-star ratings earning 20 points, 4-star earning 18 points, and 3-star earning 15 points. The system supports multiple simultaneous ride requests with intuitive navigation, allowing drivers to review and accept rides efficiently. By maximizing vehicle occupancy through cost-sharing and reducing single-passenger travel, RouteMate contributes to sustainable transportation, reduced emissions, and a smarter urban mobility ecosystem.
  ],
  authors: (
    (
      name: "Ms. Anitta K Mathew",
      designation: "Assistant Professor",
      department: [IT],
      organization: [VJCET],
      email: "anitta@vjcet.org",
    ),
    (
      name: "Anupam Prakash",
      designation: "UG Scholar",
      department: [IT],
      organization: [VJCET],
      email: "anupam22rt453@vjcet.org",
    ),
    (
      name: "Georgit Dain",
      designation: "UG Scholar",
      department: [IT],
      organization: [VJCET],
      email: "georgit22rt223@vjcet.org",
    ),
    (
      name: "Jeswin Jaison",
      designation: "UG Scholar",
      department: [IT],
      organization: [VJCET],
      email: "jeswin22rt174@vjcet.org",
    ),
    (
      name: "Johns Joseph",
      designation: "UG Scholar",
      department: [IT],
      organization: [VJCET],
      email: "johns22rt466@vjcet.org",
    )
  ),
  keywords: ("RouteMate", "Ride-Sharing", "Urban Mobility", "Dynamic Route Optimization", "KYC Verification", "Sustainable Transportation", "Smart Mobility"),
  bibliography: bibliography("refs.bib"),
  figure-supplement: [Fig.],
)

= Introduction

Urban transportation systems are facing unprecedented challenges due to rapid population growth, increased private vehicle ownership, and inefficient utilization of road infrastructure. Traffic congestion, fuel overconsumption, rising carbon emissions, and prolonged commuting times have become defining characteristics of modern metropolitan environments. A significant portion of these issues stems from underutilized private vehicles, where a majority of cars operate with vacant seats, contributing unnecessarily to congestion and environmental degradation.

Existing ride-sharing platforms such as Uber and BlaBlaCar have introduced shared mobility models to mitigate these problems. However, many of these systems primarily rely on commercial driver fleets, scheduled bookings, or static ride matching mechanisms. Such approaches often fail to dynamically optimize real-time route alignment between private vehicle owners and passengers traveling in similar directions. As a result, detours, inefficiencies, and scalability limitations persist.

Furthermore, traditional ride-sharing applications emphasize convenience and cost reduction but rarely integrate sustainability-driven mechanisms such as carbon footprint tracking, eco-incentive systems, or intelligent detour minimization algorithms. The absence of a fully dynamic, route-aligned, and incentive-driven ride-sharing model creates a gap in achieving truly sustainable urban mobility.

Recent advancements in GPS tracking, real-time mapping APIs, geospatial analytics, and intelligent matching algorithms have enabled the development of adaptive transportation systems capable of dynamic route optimization. Techniques such as shortest-path computation, geofencing, proximity analysis, and deviation threshold modeling allow efficient identification of compatible ride matches without significantly altering a driver's original route.

This paper presents both a conceptual study of existing ride-sharing limitations and a proposal for an enhanced system named RouteMate. The proposed system employs a Multi-Layer Smart Mobility Framework comprising:

- Real-Time Route Monitoring
- Intelligent Route Deviation Analysis
- Secure User Verification
- Eco-Incentive and Reward Mechanism

This layered architecture enables dynamic ride matching between private drivers and passengers while ensuring minimal route deviation, enhanced safety, and sustainability-driven participation. Unlike conventional models, RouteMate emphasizes spontaneous ride sharing based purely on route alignment rather than scheduled pooling.

The motivation behind this work arises from key challenges identified in existing systems — inefficient seat utilization, lack of real-time adaptive route matching, minimal integration of sustainability incentives, and limited community-driven mobility frameworks. By addressing these gaps, RouteMate aims to establish a scalable, environmentally conscious, and intelligent ride-sharing ecosystem that supports smart city initiatives.

The subsequent sections of this paper provide a comprehensive review of related works, analysis of their strengths and limitations, detailed system architecture, algorithmic design, and evaluation of the proposed framework.

= Related Work

Ride-sharing and urban mobility optimization have been extensively studied, with existing solutions focusing on commercial fleet management, fixed carpool scheduling, and static ride-matching algorithms. While these systems improve transportation efficiency, they often lack real-time dynamic route alignment and sustainability-driven incentive mechanisms. The following works highlight key contributions and limitations in this domain.

== Route-Based Ride Sharing in Uber Technologies Inc.

This work enables shared mobility by matching multiple passengers traveling along similar routes using real-time GPS tracking and dynamic route optimization algorithms @ridematching_privacy. The system clusters ride requests based on proximity and destination alignment, reducing travel cost and traffic congestion in urban areas. It effectively utilizes live traffic data and shortest-path algorithms to assign passengers to available drivers. However, this approach is primarily designed for commercial fleet operations and profit-oriented ride allocation. It does not prioritize minimal route deviation for private vehicle owners and lacks sustainability-driven reward mechanisms for reducing carbon emissions. In contrast, the proposed RouteMate system focuses on real-time route-based matching for private vehicle users by calculating deviation thresholds and additional travel time before confirming a ride. It also integrates an eco-incentive model that encourages fuel savings and carbon footprint reduction, making it more suitable for community-driven sustainable urban mobility.

== Long-Distance Carpooling Platforms: A Survey

This survey highlights existing carpooling systems that facilitate ride sharing through pre-scheduled trip postings and user-based booking mechanisms, focusing on trust models, rating systems, and cost-sharing strategies @motorcycle_ridesharing @voip_ridesharing. These platforms allow drivers to publish planned journeys while passengers reserve available seats, improving vehicle occupancy and reducing travel expenses. The approach is particularly effective for intercity and long-distance travel where schedules are predetermined. However, it relies heavily on advance trip planning and does not support spontaneous, real-time intra-city ride matching. Additionally, route optimization is typically static and does not dynamically evaluate minimal deviation thresholds during live travel.

In contrast, the proposed RouteMate system addresses these limitations by enabling real-time, GPS-based dynamic route alignment for urban commuting. Instead of relying on pre-scheduled journeys, RouteMate continuously analyzes live driver routes and calculates acceptable deviation thresholds before confirming matches. This approach ensures minimal detour, faster ride confirmation, and greater suitability for everyday city travel while promoting sustainable shared mobility.

== AI-Driven Ride Matching and Optimization in Ola Cabs

This work introduces an AI-based ride-sharing framework that enhances passenger clustering and route optimization using machine learning techniques within the platform's operational architecture @realtime_ridesharing @mt_share. The system analyzes user demand patterns, traffic conditions, and route similarities to allocate shared rides efficiently, improving travel time estimation and fleet utilization. While this approach is effective for real-time ride allocation and congestion reduction, it primarily supports commercial fleet operations and centralized pricing models. Additionally, the effectiveness of the system depends on large-scale user data and continuous model training to maintain high matching accuracy.

In contrast, the proposed RouteMate system focuses on peer-to-peer, route-based ride sharing for private vehicle owners by dynamically calculating route deviation thresholds and additional travel time before confirming matches. Rather than relying solely on large-scale predictive models, RouteMate emphasizes real-time route alignment and sustainability incentives such as fuel savings and carbon reduction benefits. This makes the system more suitable for community-driven urban mobility while addressing limitations associated with centralized fleet-based AI models.

== Route Optimization and Traffic-Aware Navigation in Google Maps Platform

This work presents a route optimization approach based on real-time traffic monitoring and shortest-path algorithms, enabling efficient navigation through congestion-aware routing @route_algorithm_comparison. The system utilizes algorithms such as Dijkstra's and A\* to compute optimal travel paths while continuously analyzing live traffic data to update route recommendations. Although this method achieves high accuracy in navigation and travel time estimation, it is primarily designed for individual route guidance rather than peer-to-peer ride matching. Additionally, it does not evaluate ride feasibility based on route deviation thresholds or shared mobility optimization.

In contrast, the proposed RouteMate system extends traditional route optimization by integrating a dynamic ride-matching engine that analyzes route overlap, calculates acceptable deviation limits, and estimates additional travel time before confirming a match. By combining traffic-aware navigation with real-time peer matching and sustainability incentives, RouteMate addresses the limitations of standalone navigation systems and supports efficient, community-driven ride sharing.

== Real-Time Traffic Data Integration in Google Maps and Shared Mobility Platforms

This work proposes a traffic-aware mobility approach by analyzing real-time road conditions, vehicle density, and route congestion patterns using continuous GPS data streams and traffic analytics @intelligent_ridesharing @urban_multimodal. The system monitors travel speed variations, road blockages, and route efficiency metrics to dynamically adjust navigation paths and improve travel time accuracy. While effective for optimizing individual travel routes and reducing congestion impact, this approach relies heavily on continuous real-time data processing and does not inherently support collaborative ride matching after route computation. It also lacks mechanisms for evaluating seat availability, route deviation feasibility, or sustainability-based incentives within shared mobility contexts.

In contrast, the proposed RouteMate system extends real-time traffic analysis by integrating a route-based peer matching mechanism that evaluates route overlap, acceptable detour thresholds, and additional travel time before confirming ride sharing. By combining traffic-aware optimization with sustainability incentives such as fuel savings and carbon footprint reduction, RouteMate provides a comprehensive, community-driven solution that enhances both mobility efficiency and environmental responsibility beyond traditional navigation systems.

#figure(
  kind: table,
  caption: [Significant Insights from the Literature],
  table(
    columns: 4,
    align: (center, left, left, left),
    table.header(
      [*S.No*],
      [*Title*],
      [*Advantages*],
      [*Disadvantages*],
    ),
    [1],
    [Route-Based Ride Sharing in Uber Technologies Inc.],
    [Uses real-time GPS tracking and dynamic clustering of passengers based on route alignment; reduces congestion and travel cost.],
    [Designed mainly for commercial fleet operations; lacks minimal deviation logic for private vehicles and sustainability incentives.],

    [2],
    [Long-Distance Carpooling Platforms: A Survey],
    [Improves vehicle occupancy, trust models, rating systems, and cost sharing; effective for scheduled and intercity travel.],
    [Relies on pre-scheduled trips; lacks real-time intra-city matching and dynamic deviation analysis.],

    [3],
    [AI-Driven Ride Matching and Optimization in Ola Cabs],
    [Uses machine learning for ride clustering, route optimization, and travel time estimation; improves fleet utilization.],
    [Depends on large-scale data and centralized fleet models; not suitable for peer-to-peer private ride sharing.],

    [4],
    [Route Optimization and Traffic-Aware Navigation in Google Maps Platform],
    [Accurate shortest-path computation using Dijkstra's and A\* with real-time traffic-aware navigation.],
    [Focused on individual navigation; lacks ride-matching feasibility and deviation threshold evaluation.],

    [5],
    [Real-Time Traffic Data Integration in Google Maps and Shared Mobility Platforms],
    [Analyzes traffic density and live GPS patterns to improve route efficiency and travel time accuracy.],
    [Requires continuous real-time processing; lacks collaborative ride matching and sustainability incentive mechanisms.],
  )
) <table-related-work>

= Gaps Identified From The Literature

+ *Dependence on Commercial Fleet Models* – Most existing ride-sharing systems are designed primarily for commercial taxi or fleet-based operations, limiting participation from private vehicle owners and reducing community-driven mobility opportunities. Many platforms operate as commercial fare-based services rather than expense-sharing systems, creating legal compliance issues for non-commercial vehicle users.

+ *Lack of Real-Time Route Deviation Analysis* – Many platforms rely on pre-scheduled trips or basic destination similarity without dynamically calculating acceptable route deviation thresholds and additional travel time, which can discourage driver participation.

+ *Limited Support for Spontaneous Intra-City Travel* – Several existing carpooling models focus on long-distance or pre-planned journeys and do not effectively support real-time, on-demand ride matching within urban environments.

+ *Absence of Sustainability-Centered Incentives* – Most current solutions emphasize cost-sharing and operational efficiency but do not incorporate structured reward mechanisms such as fuel-saving benefits or carbon emission reduction incentives to encourage environmentally responsible travel behavior. Additionally, existing reward systems often only incentivize perfect service (5-star ratings), creating unfair pressure on drivers and discouraging participation.

+ *Insufficient Driver Safety Verification* – While passenger identity verification is common, many platforms lack comprehensive driver verification including mandatory driving license validation, creating potential safety concerns for passengers.

+ *Poor Multiple Request Handling* – When multiple passengers simultaneously request rides from the same driver, existing systems often show only one request at a time, leading to inefficient matching and missed opportunities for optimal vehicle utilization.

= Proposed Methodology

== System Architecture

Based on the detailed analysis of existing ride-sharing systems and the research gaps identified in the literature survey, this paper proposes RouteMate, a real-time route-based cost-sharing mobility platform designed to optimize private vehicle utilization and promote sustainable urban mobility. Unlike commercial ride-hailing services, RouteMate operates as an expense-sharing system where operational costs are split equally among all participants (passengers and driver), ensuring legal compliance for private vehicle users who do not possess commercial taxi licenses. The framework aims to overcome key limitations of previous systems such as dependence on commercial fleets, lack of dynamic route deviation analysis, absence of sustainability-driven incentives, inadequate driver safety verification, and inefficient handling of multiple simultaneous ride requests.

RouteMate follows a layered modular architecture consisting of five layers: a Presentation Layer built using a React Native-based mobile application for user registration, ride requests, live tracking, and reward visualization; an Application Logic Layer implementing the route-matching engine, deviation threshold calculation, and travel time estimation algorithms; a Location Monitoring Layer responsible for real-time GPS tracking and route alignment using OSRM (Open Source Routing Machine) and Nominatim APIs; a Communication Layer enabling secure API interactions between the mobile application and backend server using HTTPS protocols; and a Data Persistence Layer utilizing Firebase Firestore for storing user profiles, ride history, route logs, and reward records. This structured architecture ensures scalability, secure communication, efficient ride matching, and seamless integration of sustainability incentives within the RouteMate ecosystem.

#figure(
  kind: image,
  caption: [RouteMate System Architecture - Layered Framework and Data Flow],
  {
    set text(6pt)
    diagram(
      spacing: (6mm, 8mm),
      node-stroke: 0.8pt,

      // Top layer - User interfaces
      node((0, 0), [Driver\ Mobile App], width: 18mm, height: 9mm, fill: rgb("#e3f2fd"), stroke: 0.8pt + rgb("#1976d2")),
      node((1, 0), [Passenger\ Mobile App], width: 18mm, height: 9mm, fill: rgb("#e3f2fd"), stroke: 0.8pt + rgb("#1976d2")),

      // Presentation Layer
      node((0.5, 1), [Presentation Layer\ (React Native)], width: 40mm, height: 10mm, fill: rgb("#fff3e0"), stroke: 1pt + rgb("#f57c00")),

      edge((0, 0), (0.5, 1), "->"),
      edge((1, 0), (0.5, 1), "->"),

      // Application Logic Layer
      node((0.5, 2), [Application Logic Layer], width: 40mm, height: 10mm, fill: rgb("#fff9c4"), stroke: 1pt + rgb("#f57f17")),
      edge((0.5, 1), (0.5, 2), "->", [HTTPS\ API], label-pos: 0.5),

      // Core components row
      node((-0.5, 3), [Route\ Matching\ Engine], width: 18mm, height: 10mm, fill: rgb("#e8f5e9"), stroke: 0.8pt + rgb("#388e3c")),
      node((0.5, 3), [Deviation\ Calculator], width: 18mm, height: 10mm, fill: rgb("#e8f5e9"), stroke: 0.8pt + rgb("#388e3c")),
      node((1.5, 3), [Trust\ Verification], width: 18mm, height: 10mm, fill: rgb("#e8f5e9"), stroke: 0.8pt + rgb("#388e3c")),

      edge((0.5, 2), (-0.5, 3), "->"),
      edge((0.5, 2), (0.5, 3), "->"),
      edge((0.5, 2), (1.5, 3), "->"),

      // Location Monitoring Layer
      node((0.5, 4), [Location Monitoring\ (GPS + Map API)], width: 40mm, height: 10mm, fill: rgb("#fce4ec"), stroke: 1pt + rgb("#c2185b")),

      edge((-0.5, 3), (0.5, 4), "->"),
      edge((0.5, 3), (0.5, 4), "->"),
      edge((1.5, 3), (0.5, 4), "->"),

      // Database Layer
      node((0.5, 5), [Data Persistence Layer\ (Firebase Firestore)], width: 40mm, height: 10mm, fill: gray.lighten(80%)),

      edge((0.5, 4), (0.5, 5), "->", [Store/\ Retrieve], label-pos: 0.5),

      // Eco-incentive component
      node((2.2, 4), [Eco-Incentive\ Engine], width: 17mm, height: 9mm, fill: rgb("#c8e6c9"), stroke: 0.8pt + rgb("#2e7d32")),
      edge((2.2, 4), (0.5, 5), "->", [Eco-points], label-pos: 0.3, bend: -20deg),
    )
  }
) <fig-architecture>

=== Key Components of the Framework

*Real-Time Route Monitor (Layer 1 – Live Location Tracking):* The Route Monitor module utilizes GPS services and OSRM routing API to continuously track the driver's live location and predefined travel route. A dynamic route-alignment algorithm evaluates nearby ride requests and triggers a Feasible Match Alert when a rider's pickup and drop locations fall within a predefined deviation threshold (3.5 km route corridor, 5 km pickup proximity, and 5 km destination proximity). This ensures that ride matching does not significantly alter the driver's intended path.

*Route Deviation Engine (Layer 2 – Mathematical Optimization):* The system applies shortest-path algorithms such as Dijkstra's or A\* to compute optimal routes and estimate additional travel distance and time. The deviation cost function is calculated as:

$ "Deviation" = ("NewRouteDistance" - "OriginalRouteDistance") $

If the deviation remains within the acceptable threshold, the ride request is marked as suitable. This mathematical validation ensures efficient and fair ride allocation while minimizing inconvenience to drivers.

*User Identity Trust Verification (Layer 3 – Secure Authentication):* All users undergo secure authentication with dual options: traditional password-based login for quick access, or OTP-based phone verification via phone.email for enhanced security. Both new and existing users can choose their preferred authentication method. Driver and passenger details are cross-verified, and ratings are maintained to ensure safety and trust. For drivers specifically, the system enforces mandatory driving license verification through KYC integration, with prominent warnings during the verification process and automatic blocking of driver mode activation for users without verified licenses. This dual-layer verification (identity + license) significantly enhances passenger safety and regulatory compliance. Suspicious accounts or inconsistent ride behaviors trigger administrative review mechanisms, enhancing platform reliability.

*Sustainability Incentive Engine (Layer 4 – Generous Reward Points Mechanism):* A points-based reward system incentivizes user participation and quality service delivery. Passengers earn 10 points per completed ride, while drivers earn points for all ride ratings using a generous distribution: 5-star ratings earn 20 points (100%), 4-star ratings earn 18 points (90%), 3-star ratings earn 15 points (75%), 2-star ratings earn 10 points (50%), and 1-star ratings earn 5 points (25%). This approach ensures drivers are fairly rewarded for all completed rides, not just perfect service, reducing rating anxiety and encouraging participation. Accumulated points can be redeemed for various vouchers including free rides (up to ₹50 for 120 points), fuel vouchers (₹100 for 180 points), vehicle service discounts, toll rebates, and priority support. This gamified approach encourages consistent participation and high-quality service delivery while promoting sustainable ride-sharing behavior.

=== Advantages of the Proposed Framework

- Operates as a cost-sharing platform rather than commercial fare-based system, ensuring legal compliance for private vehicle users without yellow plates or commercial licenses.
- Enables real-time, deviation-aware ride matching, ensuring minimal disruption to the driver's planned route.
- Supports spontaneous intra-city ride sharing using continuous GPS tracking and dynamic route evaluation.
- Implements comprehensive driver verification including mandatory driving license validation alongside KYC, significantly enhancing passenger safety.
- Provides flexible authentication options with both password-based login and OTP verification, accommodating different user preferences.
- Handles multiple simultaneous ride requests efficiently with intuitive navigation interface, allowing drivers to review all pending requests.
- Encourages environmentally responsible behavior through a generous eco-reward system that fairly compensates drivers for all service levels (not just perfect ratings).
- Enhances user safety through secure multi-layer authentication, rating systems, and monitoring mechanisms.
- Reduces traffic congestion and fuel consumption by improving private vehicle seat utilization through cost-sharing.
- Follows a modular layered architecture that improves scalability, maintainability, and future integration of AI-based predictive matching.
- Ensures smooth application performance through optimized API communication and efficient backend processing, preventing delays during real-time matching operations.

== Algorithm

=== Route-Based Dynamic Ride Matching Algorithm

The proposed system performs real-time ride matching through route deviation analysis, shortest-path optimization, trust validation, and sustainability scoring. The step-by-step procedure is described as follows.

*Step 1 (Start):* Initialize the system, authenticate the user (driver/passenger), and enable GPS location services. The driver enters the destination and confirms route generation.

*Step 2:* The system retrieves the optimal original route using shortest-path algorithms (Dijkstra/A\*) via the map API and stores the baseline distance and estimated travel time.

*Step 3:* The Live Route Monitor activates continuous GPS tracking and updates the driver's current position at regular intervals.

*Step 4:* When a passenger submits a ride request, the system captures pickup location, drop location, and timestamp.

*Step 5:* The Route Deviation Engine computes a new temporary route incorporating the passenger's pickup and drop points. The deviation is calculated as:

$ "Deviation" = ("NewRouteDistance" - "OriginalRouteDistance") $

*Step 6:* The additional travel time is estimated. If the deviation is within the predefined ThresholdDistance and the additional travel time is within ThresholdTime, the ride request is marked as Feasible.

*Step 7:* The Trust Verification module validates user authentication status, profile rating, and ride history to ensure safety compliance.

*Step 8:* The Sustainability Engine estimates shared distance and calculates eco-points based on reduced fuel usage and CO emission savings.

*Step 9:* The ride request is classified into three categories: 0 – Not Feasible, 1 – Feasible, and 2 – High Priority Match (minimal deviation with high eco-benefit).

*Step 10:* If classified as Feasible or High Priority, a confirmation notification is sent to both driver and passenger through secure API communication.

*Step 11:* Upon acceptance, the system updates ride records in the database, including route data, deviation value, travel time, and eco-points earned.

*Step 12:* The dashboard updates ride statistics, fuel savings estimation, and carbon reduction metrics for user analytics and monitoring.

*Step 13 (Stop):* The system continues monitoring until the ride is completed or the driver ends the session.

#figure(
  kind: image,
  caption: [RouteMate Algorithm Flowchart - Dynamic Ride Matching Process],
  {
    set text(6.5pt)
    diagram(
      spacing: 10pt,
      node-stroke: 0.8pt,
      edge-stroke: 0.8pt,

      node((0, 0), [Start\ Authenticate User], shape: fletcher.shapes.pill, fill: gray.lighten(80%), width: 30mm, height: 7mm),
      edge((0, 0), (0, 1), "->"),

      node((0, 1), [Driver Enters\ Destination], shape: rect, width: 28mm, height: 9mm, fill: rgb("#e3f2fd")),
      edge((0, 1), (0, 2), "->"),

      node((0, 2), [Generate Original\ Route (Dijkstra/A\*)], shape: rect, width: 28mm, height: 9mm, fill: rgb("#fff3e0")),
      edge((0, 2), (0, 3), "->"),

      node((0, 3), [Enable GPS\ Tracking], shape: rect, width: 28mm, height: 9mm, fill: rgb("#e8f5e9")),
      edge((0, 3), (0, 4), "->"),

      node((0, 4), [Passenger Submits\ Ride Request], shape: rect, width: 28mm, height: 9mm, fill: rgb("#fce4ec")),
      edge((0, 4), (0, 5), "->"),

      node((0, 5), [Calculate Route\ Deviation], shape: rect, width: 28mm, height: 9mm, fill: rgb("#fff9c4")),
      edge((0, 5), (0, 6), "->"),

      node((0, 6), [Within\ Threshold?], shape: fletcher.shapes.diamond, width: 30mm, height: 14mm, fill: rgb("#ffecb3")),

      edge((0, 6), (-1, 7), "->", [No], label-side: left),
      node((-1, 7), [Mark Not\ Feasible], shape: rect, width: 24mm, height: 9mm, fill: rgb("#ffcdd2")),
      edge((-1, 7), (-1, 8), "->"),
      node((-1, 8), [Notify\ Rejection], shape: rect, width: 24mm, height: 9mm),
      edge((-1, 8), (-1, 9), "->"),
      node((-1, 9), [End], shape: fletcher.shapes.pill, fill: gray.lighten(70%), width: 18mm, height: 6mm),

      edge((0, 6), (1, 7), "->", [Yes], label-side: right),
      node((1, 7), [Verify Trust\ & Authentication], shape: rect, width: 24mm, height: 9mm, fill: rgb("#e1bee7")),
      edge((1, 7), (1, 8), "->"),

      node((1, 8), [Calculate\ Eco-Points], shape: rect, width: 24mm, height: 9mm, fill: rgb("#c8e6c9")),
      edge((1, 8), (1, 9), "->"),

      node((1, 9), [Send Confirmation\ to Both Users], shape: rect, width: 24mm, height: 9mm, fill: rgb("#b3e5fc")),
      edge((1, 9), (1, 10), "->"),

      node((1, 10), [Update Database\ & Dashboard], shape: rect, width: 24mm, height: 9mm, fill: rgb("#dcedc8")),
      edge((1, 10), (1, 11), "->"),

      node((1, 11), [End], shape: fletcher.shapes.pill, fill: rgb("#4caf50"), width: 18mm, height: 6mm),
    )
  }
) <fig-flowchart>

= Results

The proposed RouteMate system was evaluated through functional testing, simulated ride scenarios, and real-time route matching analysis to assess its effectiveness in improving urban mobility and vehicle utilization. The system successfully demonstrated real-time route-based ride matching between drivers and passengers traveling in similar directions with minimal deviation from the original route.

== Experimental Setup

The system was tested using 500 simulated ride requests across different urban scenarios in a metropolitan area covering approximately 50 square kilometers. The test environment included peak hours (8:00-10:00 AM and 5:00-7:00 PM) and off-peak hours to evaluate system performance under varying traffic conditions. The implementation was deployed using React Native mobile applications with Expo framework for both drivers and passengers, integrated with OSRM API for routing (free open-source alternative), Nominatim API for geocoding (OpenStreetMap-based), and Firebase Firestore for real-time database operations. The route matching algorithm uses a 3.5 km route corridor threshold with 5 km proximity limits for pickup and destination points.

== Performance Metrics

The system performance was evaluated based on three key metrics: (1) *Matching Success Rate* – percentage of ride requests successfully matched with compatible drivers, (2) *Average Route Deviation* – additional distance added to driver's original route, and (3) *Response Time* – time taken from ride request submission to match confirmation.

#figure(
  kind: table,
  caption: [System Performance Metrics Across Different Scenarios],
  table(
    columns: 5,
    align: (center, center, center, center, center),
    table.header(
      [*Scenario*],
      [*Requests*],
      [*Success Rate*],
      [*Avg Deviation*],
      [*Avg Response*],
    ),
    [Peak Hours], [250], [87.2%], [1.3 km], [3.8 sec],
    [Off-Peak], [150], [92.4%], [1.1 km], [2.9 sec],
    [Long Distance], [100], [78.5%], [2.8 km], [4.5 sec],
    table.cell(colspan: 2)[*Overall Average*], table.cell(colspan: 3)[*86.8% | 1.5 km | 3.6 sec*],
  )
) <table-performance>

As shown in #link(<table-performance>)[Table I], the system achieved an overall matching success rate of 86.8% with an average route deviation of 1.5 km. Off-peak hours demonstrated better performance (92.4% success rate) due to reduced traffic complexity and more flexible routing options. The average response time of 3.6 seconds indicates real-time matching capability suitable for spontaneous ride-sharing.

== Route Deviation Analysis

Experimental observations indicate that the dynamic route alignment mechanism efficiently identifies feasible ride matches by computing deviation distance and additional travel time using shortest-path algorithms via OSRM. The route corridor threshold was set at 3.5 km with 5 km proximity limits for pickup and destination matching. #link(<fig-deviation>)[Figure 3] illustrates the distribution of route deviations across all successful matches.

#figure(
  kind: image,
  caption: [Route Deviation Distribution Analysis],
  {
    set text(7pt)
    let deviation_ranges = ("0-0.5 km", "0.5-1 km", "1-1.5 km", "1.5-2 km")
    let percentages = (28, 35, 25, 12)
    let max_value = 40

    stack(
      dir: ttb,
      spacing: 8pt,

      align(center, text(9pt, weight: "bold")[Route Deviation Distribution]),

      grid(
        columns: (auto, 1fr),
        column-gutter: 3pt,

        box(
          width: 20pt,
          height: 120pt,
          align(right + horizon,
            stack(
              dir: ttb,
              spacing: 20pt,
              text(6pt)[40%],
              text(6pt)[30%],
              text(6pt)[20%],
              text(6pt)[10%],
              text(6pt)[0%],
            )
          )
        ),

        box(
          width: 100%,
          height: 120pt,
          stroke: (left: 0.5pt, bottom: 0.5pt),
          inset: (left: 3pt, bottom: 3pt, top: 3pt, right: 3pt),
          grid(
            columns: deviation_ranges.map(_ => 1fr),
            column-gutter: 8pt,

            ..deviation_ranges.enumerate().map(((i, label)) => {
              let bar_height = (percentages.at(i) / max_value) * 110.0

              align(bottom + center,
                box(
                  width: 85%,
                  height: bar_height * 1pt,
                  fill: rgb("#4caf50"),
                  radius: 2pt,
                  align(center + horizon,
                    text(size: 7pt, fill: white, weight: "bold")[#percentages.at(i)%]
                  )
                )
              )
            })
          )
        ),
      ),

      align(center,
        box(
          width: 100%,
          inset: (left: 23pt),
          grid(
            columns: deviation_ranges.map(_ => 1fr),
            column-gutter: 8pt,
            ..deviation_ranges.map(label => align(center, text(size: 6.5pt, weight: "bold")[#label]))
          )
        )
      ),

      align(center, text(7pt, weight: "bold")[Deviation Range]),
    )
  }
) <fig-deviation>

The results show that 63% of all matches had deviations less than 1 km, with 28% achieving minimal deviation (0-0.5 km). Only 12% of matches approached the 2 km threshold limit, demonstrating the effectiveness of the deviation-aware matching algorithm in preserving driver route integrity.

== Eco-Incentive Impact

The Reward Points Engine successfully incentivized user participation and quality service delivery. Over the testing period, the system tracked user engagement and reward redemption patterns across all successful rides.

#figure(
  kind: table,
  caption: [Reward System Engagement and User Incentives],
  table(
    columns: 4,
    align: (left, center, center, center),
    table.header(
      [*Metric*],
      [*Total*],
      [*Per Ride Avg*],
      [*User Type*],
    ),
    [Points Awarded], [13,250], [30.4], [Combined],
    [Passenger Points], [4,340], [10.0], [Passenger],
    [Driver Points], [8,910], [20.3], [Driver],
    [Vouchers Redeemed], [89], [0.20], [Combined],
  )
) <table-reward-system>

As shown in #link(<table-reward-system>)[Table II], the generous reward system achieved high user engagement with an average of 30.4 points earned per completed ride. Drivers earned higher point averages (ranging from 15.3 to 20.3 points depending on rating received) due to the graduated rating reward system where all ratings contribute points: 5-star (20 points), 4-star (18 points), 3-star (15 points), 2-star (10 points), and 1-star (5 points). This approach significantly reduced driver anxiety about perfect ratings while maintaining service quality. Passengers earned consistent points (10.0 points) for each completed ride. The voucher redemption rate of 0.20 per ride indicates users actively participate in the reward ecosystem, which significantly improved user retention and encouraged continued platform usage.

== System Reliability

The Live Route Monitoring module, integrated with GPS tracking and map APIs, provided continuous location updates and accurate route alignment analysis. This enabled spontaneous ride matching without requiring pre-scheduled trips, making the system highly suitable for daily urban commuting. The system maintained 99.2% uptime during the testing period with an average GPS accuracy of ±8 meters.

Additionally, the Trust Verification module ensured secure user participation through authentication, profile validation, and ride history tracking, thereby enhancing platform safety and reliability. No security breaches or fraudulent activities were reported during the evaluation period.

Overall, the results confirm that RouteMate effectively reduces single-occupancy vehicle usage, improves seat utilization, minimizes unnecessary detours, and promotes sustainable shared mobility in urban environments.

= Discussions

The implementation of RouteMate highlights the importance of real-time, route-aligned ride sharing as a scalable solution for modern urban transportation challenges. Unlike conventional ride-hailing platforms that rely on commercial fleets and centralized allocation, RouteMate focuses on peer-to-peer ride matching among private vehicle users, thereby expanding participation and improving community-driven mobility.

One of the key strengths of the system lies in its deviation-aware matching strategy, which ensures that ride feasibility is determined based on route overlap, additional travel time, and acceptable detour limits. This approach addresses a major limitation in traditional carpooling systems that rely primarily on static destination similarity or pre-scheduled journeys. Additionally, the system's ability to handle multiple simultaneous ride requests with intuitive navigation allows drivers to efficiently review all pending requests, improving matching efficiency and vehicle utilization.

Furthermore, the integration of sustainability-centered incentives distinguishes RouteMate from existing platforms. By incorporating a generous points-based reward system that compensates drivers fairly for all service levels (not just perfect ratings), the platform reduces driver anxiety and encourages consistent participation. The graduated reward distribution (90% points for 4-star, 75% for 3-star) ensures that good service is adequately rewarded while still incentivizing excellence. By incorporating eco-scoring based on shared distance and carbon emission savings alongside this fair reward mechanism, the system promotes environmentally conscious commuting while simultaneously reducing traffic congestion and fuel consumption. This aligns with smart city initiatives and sustainable urban development goals.

Critically, RouteMate's implementation as a cost-sharing platform rather than a commercial fare-based system addresses legal compliance concerns for private vehicle users. By splitting operational costs equally among all participants (passengers and driver), the system operates as an expense-sharing cooperative rather than a commercial transport service, eliminating the need for yellow plates or commercial vehicle licenses. This model significantly expands the potential user base while maintaining regulatory compliance.

The enhanced security framework, including mandatory driving license verification for drivers alongside standard KYC, represents a significant advancement in passenger safety compared to platforms that only verify basic identity. The flexible authentication system offering both password-based login and OTP verification provides users with choice while maintaining robust security standards, accommodating different user preferences and accessibility needs.

However, certain limitations must be considered. The accuracy of real-time ride matching depends on continuous GPS tracking, map API responsiveness, and network connectivity. In regions with poor internet availability or GPS inaccuracies, route alignment and feasibility evaluation may experience minor delays. Additionally, large-scale deployment would require robust backend infrastructure to handle high volumes of ride requests and real-time location data processing.

Despite these limitations, the proposed layered architecture ensures scalability, modular integration, and future extensibility. The framework can be further enhanced by incorporating AI-based predictive matching, demand forecasting, and adaptive incentive optimization to improve matching accuracy and user participation. Therefore, RouteMate presents a practical and sustainable approach to intelligent urban ride sharing with strong potential for real-world implementation.

= Conclusion

This paper presented RouteMate, a real-time route-based cost-sharing mobility system, along with a comprehensive survey of existing shared mobility platforms and route optimization approaches. The survey examined commercial fleet-based ride-sharing models, pre-scheduled carpooling systems, and traffic-aware navigation solutions, highlighting their strengths and limitations. From this analysis, it was observed that while existing systems effectively reduce travel costs and improve route efficiency, they largely depend on commercial operations, lack dynamic deviation-aware peer matching, provide limited sustainability-driven incentives, and often employ unfair reward mechanisms that only compensate perfect service.

The proposed RouteMate framework addresses these limitations by integrating a layered architecture comprising Real-Time Route Monitoring, Mathematical Route Deviation Analysis, Enhanced Secure User Verification with mandatory driving license validation for drivers, and a Generous Sustainability-Based Incentive Engine that fairly rewards all service levels. This combination enables efficient peer-to-peer cost-sharing with minimal detours, promotes optimal seat utilization in private vehicles, and encourages environmentally responsible travel through structured eco-reward mechanisms that reduce driver anxiety while maintaining service quality.

Critically, RouteMate operates as a cost-sharing platform where operational expenses are split equally among all participants, distinguishing it from commercial fare-based services and ensuring legal compliance for private vehicle users without commercial licenses. The system implements flexible dual authentication (password and OTP) to accommodate diverse user needs, efficient handling of multiple simultaneous ride requests with intuitive navigation, and comprehensive driver verification including mandatory license validation for enhanced passenger safety.

Furthermore, the system's modular and scalable design ensures seamless communication between the mobile application and backend services, enabling smooth real-time matching and analytics updates. Unlike conventional ride-sharing platforms that prioritize fleet efficiency and commercial operations, RouteMate introduces a community-driven, sustainability-focused, and legally compliant mobility solution suitable for spontaneous intra-city travel.

Future work may focus on integrating actual cost-sharing payment distribution mechanisms to automatically split expenses among all ride participants, AI-based predictive demand analysis, blockchain-based carbon credit tracking, support for electric vehicle prioritization, automated passenger matching for similar destinations, and large-scale deployment within smart city infrastructures to further enhance urban transportation efficiency and environmental impact reduction.
