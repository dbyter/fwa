What each agent would do

Your adversarial system could be organized as several cooperating agents.

1. Economics agent: “Where is the money?”

This agent examines the DMEPOS fee schedule and identifies:

Codes with high reimbursement.
Recurring rental or monthly supply payments.
High-margin items whose acquisition cost may be substantially below Medicare reimbursement.
Codes whose reimbursement differs materially by geography.
Frequently billed accessories or add-ons.
Code combinations that produce unusually high total payment.
Newly introduced or recently repriced codes.
Products with large or rapidly growing aggregate Medicare expenditure.

Its output might be:

“These 25 HCPCS codes combine high unit reimbursement, recurring payment potential, broad beneficiary eligibility and substantial current claims volume.”

That is economic attractiveness, not evidence of fraud.

2. Policy agent: “What must a supplier prove?”

This agent reads the relevant NCDs, LCDs and associated policy articles to extract the controls for each code:

Eligible diagnoses.
Clinical severity thresholds.
Face-to-face encounter requirements.
Written-order requirements.
Testing requirements.
Documentation that must appear in the medical record.
Quantity and frequency limits.
Replacement rules.
Continued-use or continued-need requirements.
Which clinician may order the item.
Whether prior authorization applies.
Supplier accreditation or enrollment requirements.

CMS exposes national and local coverage content through its Medicare Coverage Database and Coverage API, making automated policy retrieval technically feasible.

The agent could convert prose into a control matrix:

Control	Evidence required	Verification mechanism
Qualifying diagnosis	Diagnosis on claim or medical record	Automated claim edit or review
Physician order	Signed, dated order	Documentation review
Test threshold	Qualifying test result	Medical-record review
Refill need	Beneficiary confirmation	Supplier documentation
Frequency limit	Prior claim history	Automated claim edit
3. Adversarial agent: “How might someone exploit this?”

This agent constructs hypothetical abuse cases, such as:

Billing an item that was never delivered.
Recruiting beneficiaries and using their identifiers.
Falsifying or templating medical-necessity documentation.
Billing recurring supplies without confirming continued need.
Upcoding a basic product to a more expensive code.
Billing incompatible accessories.
Replacing equipment earlier than permitted.
Splitting claims across related suppliers.
Obtaining questionable orders from a small network of clinicians.
Moving billing to a newly enrolled entity after scrutiny.
Selecting diagnoses that satisfy an automated edit without genuine clinical support.

The objective should be control testing, not generation of executable fraud instructions. Outputs should remain at the scheme-pattern and detection-rule level and avoid operational details that would materially facilitate abuse.

4. Claims agent: “Does the vulnerability appear in real activity?”

Using LDS claims—or more complete internal CMS claims where appropriately authorized—the agent tests whether the hypothesized patterns appear in practice.

It could calculate:

Total allowed and paid amounts by HCPCS code.
Number of beneficiaries and suppliers.
Payment growth over time.
Payment concentration among suppliers.
New-supplier entry and rapid growth.
Units per beneficiary.
Replacement intervals.
Code-pair and accessory combinations.
Geographic hot spots.
Ordering-provider concentration.
Beneficiaries shared among suppliers.
Suppliers exhibiting highly similar billing patterns.
Rates of denial, adjustment or subsequent recovery, where available.

Example:

“Code X has attractive recurring reimbursement. The LCD relies heavily on supplier-maintained refill documentation. Claims show a small group of recently enrolled suppliers with very high units per beneficiary and overlapping ordering clinicians.”

That combination creates an evidence-based fraud-risk hypothesis.

What “attack surface” means here

In cybersecurity, an attack surface is the set of systems and interfaces an attacker can exploit.

In CMS program integrity, the payment attack surface is the set of rules, processes, data limitations and operational handoffs that can be manipulated to obtain improper payment.

For DMEPOS, it includes:

Code selection: ambiguity between similar HCPCS codes.
Coverage qualification: diagnosis or documentation requirements that can be misrepresented.
Ordering: weak verification of the clinician-beneficiary-supplier relationship.
Delivery: limited proof that the beneficiary received the item.
Recurring billing: payments continuing without confirmed need or use.
Replacement: difficulty confirming loss, damage or useful lifetime.
Supplier enrollment: hidden ownership or recycled business entities.
Claim edits: controls that check code presence but not clinical truth.
Contractor fragmentation: patterns distributed across suppliers, jurisdictions or MACs.
Data latency: suspicious activity recognized only after substantial payment.
Medical-record review: expensive manual controls that can only inspect a small sample.
What “weak controls” could mean

A control may be weak because it is:

Absent: no automated or manual check exists.
Easy to satisfy syntactically: the right diagnosis code passes even when the clinical facts are false.
Document-based but unverifiable: CMS relies on supplier-created records.
Retrospective: the check happens after payment.
Sample-based: only a small percentage of claims are reviewed.
Fragmented: no single system sees the provider, beneficiary and ownership network together.
Slow: the fraud scheme can scale faster than investigations.
Predictable: bad actors can adapt to a fixed threshold.
Poorly targeted: review volume is high but precision is low.
Not network-aware: each claim or supplier is evaluated independently.
A clean story to tell

A useful narrative would be:

“Think like the adversary, defend like the payer”
Map the market
The agent reads every DMEPOS HCPCS code and its Medicare reimbursement.
Identify economically attractive targets
It finds high-value, recurring and rapidly growing payment categories.
Map the rules
It retrieves the relevant NCDs, LCDs and policy requirements effective for each jurisdiction and date.
Model potential abuse
A controlled adversarial agent asks how coverage, ordering, documentation, delivery or recurring-billing requirements could be misrepresented.
Test against claims
LDS claims reveal whether corresponding anomalies already exist—such as rapid supplier growth, high units per beneficiary or concentrated referral networks.
Score control exposure
Each code or product category receives ratings for financial exposure, exploitability, detectability, beneficiary harm and existing control strength.
Recommend preventive controls
The defensive agent proposes targeted prior authorization, prepayment review, beneficiary verification, graph-based monitoring, enrollment scrutiny or revised claim edits.

A succinct version for a presentation is:

An adversarial AI examines DMEPOS through the eyes of a sophisticated fraudster. It combines Medicare prices, HCPCS product definitions, coverage policies and claims behavior to identify where payments are attractive, requirements can be manipulated, and existing controls may not detect abuse. A defensive agent then converts those findings into testable indicators and recommended preventive controls.