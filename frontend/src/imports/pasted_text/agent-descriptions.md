Agent
Description
Primary role of Agent
Example DME POC outputs
Policy and Coverage Agent
Reviews reimbursement policies, fee schedules, prior authorization (PA) requirements, National and Local Coverage Determinations (NCDs/LCDs), Medicare Administrative Contractor (MAC) rules, claims edits, and relevant commercial-payer policies.
Identifies where payment rules, documentation requirements, code combinations, or reimbursement structures could be manipulated. Converts policy text into machine-testable control logic.
Flags vulnerabilities such as adjacent-code migration, incomplete replacement rules, quantity thresholds, inpatient or hospice overlap gaps, and documentation requirements that can be satisfied with templated records.
Enforcement Outcomes & Learning Agent
Uses CMS administrative actions, supplier revocations, payment suspensions, exclusions, upheld overpayments, appeals, settlements, convictions, beneficiary complaints, and other resolved outcomes.
Builds a reliable hierarchy of labels and lessons from past cases. Distinguishes confirmed fraud, suspected fraud, documentation error, waste, and unresolved anomalies.
Retrospectively analyzes suppliers later revoked and asks: “Which signals were visible 6–24 months earlier?” Produces typology patterns and validation cohorts for the POC.
Utilization & Billing Pattern Intelligence Agent
Analyzes claims and encounters across Medicare Fee-for-Service (FFS), Medicare Advantage (MA), Medicaid Transformed Medicaid Statistical Information System (T-MSIS) data, managed care organization (MCO) encounters, and Marketplace signals (where available). Includes Healthcare Common Procedure Coding System (HCPCS) codes, Current Procedural Terminology (CPT) codes, modifiers, diagnoses, units, sequences, acuity, allowed amounts, denials, and payment history.
Detects velocity, peer deviation, unusual code mixes, recurring-supply anomalies, geographic expansion, orderer concentration, replacement abuse, and migration between codes or payers.
Identifies a newly active supplier with an abrupt increase in catheter or orthotic claims, rapid expansion across states, repeated maximum quantities, concentrated ordering clinicians, or patterns that resemble a revoked supplier.
Provider/Supplier Network Intelligence Agent
Uses the National Plan and Provider Enumeration System (NPPES), Medicare enrollment history, National Provider Identifiers (NPIs), ownership and authorized-official data, accreditation, addresses, banking or payment-destination information where authorized, site capacity, commercial networks, sanctions, reviews, and corporate records.
Establishes “Know Your Supplier” and “Know Your Ordering Provider” profiles. Resolves entities across legal names and identifies affiliates, nominee owners, reincarnated suppliers, common marketers, shared infrastructure, and implausible operating capacity.
Shows that a supplier recently changed ownership, shares an address, bank account, billing device, marketer, ordering clinicians, or beneficiaries with a terminated supplier, or is billing beyond plausible staffing and fulfillment capacity.
Compromised Identity & External Threat Intelligence Agent
Monitors authorized threat-intelligence sources for compromised Medicare Beneficiary Identifiers (MBIs), Social Security numbers (SSNs), provider credentials, synthetic identities, credential marketplaces, fraud playbooks, and emerging criminal tactics.
Provides early warning that identities, credentials, or enrollment assets may be compromised before anomalous claims are fully visible.
Surfaces a cluster of potentially compromised beneficiary identifiers, supplier credentials offered for sale, or evidence that fraud actors are discussing a newly exploitable product category.
Clinical Order Integrity Agent
Connects ordering-provider encounters, diagnoses, specialty, medical records, longitudinal history, order timing, telehealth modality, and documentation similarity.
Tests whether a genuine treating relationship and clinically coherent need exist, without treating telemedicine itself as suspicious.
Detects high-order volumes, no relevant encounter, implausibly short review times, boilerplate notes, near-universal qualification, or diagnoses chosen mainly to support a product.
Delivery & Fulfillment Integrity Agent
Uses carrier scans, proof of delivery, beneficiary confirmation, inventory, invoices, serial numbers, returns, shipping addresses, and fulfillment vendors.
Tests whether items were requested, shipped, received, and operationally supportable.
Flags claims lacking carrier evidence, billed units that exceed inventory purchases, beneficiary non-receipt complaints, impossible shipping patterns, or repeated use of questionable proof-of-delivery documents.
Cross-cutting capability
Links beneficiaries, suppliers, owners, clinicians, marketers, telemedicine firms, fulfillment entities, billers, addresses, devices, payment destinations, and prior enforcement actions.
Makes the network the unit of analysis. Produces explainable relationship paths rather than a single opaque score.
“Supplier A shares an authorized official and fulfillment vendor with revoked Supplier B; 70% of A’s orderers previously ordered for B; A reproduced B’s code mix shortly after B’s suspension.”
 
 
CMS enterprise agents:
 
CMS agent
What it receives from the signal layer
What the agent does
CMS-facing output
DME POC example
Trust Defender
Policy vulnerabilities, new anomalies, threat intelligence, enforcement lessons, supplier-network changes, and simulated adversary behavior.
Continuously asks how a capable adversary could assemble the available vulnerabilities into a scalable scheme over the next 12–36 months. Clusters individual findings into emerging typologies and estimates speed, reach, and potential exposure.
A prioritized enterprise vulnerability portfolio for CPI leadership, CMS leadership, fraud task forces, and frontline teams, with evidence, plausible attack path, affected programs, urgency, and recommended owner.
Warns that recently acquired DME suppliers, recurring catheter codes, stolen beneficiary identities, and fragmented cross-payer visibility could combine into a national-scale billing scheme.
CRUSH Fraud
Prioritized vulnerabilities, claim and network indicators, adversarial scenarios, historical labels, and current CRUSH/Fraud Prevention System signals.
Converts foresight into executable detection logic, investigative leads, case packages, and updates to claims edits or analytic models. Tests whether fraud actors can evade controls through threshold fragmentation, code migration, supplier rotation, or synthetic documentation.
Simulation-informed alerts and case leads integrated with CRUSH, the Fraud Prevention System (FPS), the Center for Program Integrity (CPI) triage environment, and existing contractor workflows.
Produces a DME network lead showing suppliers, ordering clinicians, common marketers, beneficiaries, and ownership links; recommends prepayment review, beneficiary verification, or escalation.
System Resilience
Existing models, edits, prior-authorization logic, enrollment controls, training data, detection thresholds, operational workflows, and adversarial scenarios.
Stress-tests CMS analytics and AI systems against evasion, poisoning, identity obfuscation, documentation perturbation, feedback gaming, and model drift. Tests deterministic controls as well as machine-learning systems.
A controlled red-team report identifying exploitable gaps, control leakage, model-performance degradation, access or fairness risks, and corrective actions before deployment.
Simulates splitting billing across related NPIs, moving from one catheter code to adjacent codes, rotating ordering clinicians, and adding semantic variation to templated notes to test whether the detection stack still works.
Program Integrity Operations
Validated vulnerabilities, proposed controls, red-team results, expected financial value, access safeguards, and investigator feedback.
Converts findings into policy changes, claims edits, prior-authorization rules, enrollment actions, contractor instructions, audit plans, state or cross-payer alerts, and performance monitoring.
A control-action plan with accountable owner, implementation route, expected benefit, operational burden, beneficiary safeguards, and feedback metrics.
Recommends event-driven ownership re-screening, probationary billing limits, real-time inpatient or hospice overlap edits, proof-of-delivery verification, or targeted medical review for a high-risk supplier network.