# Assignment 3 Mutation Plan

## Selected High-Risk Modules

1. **Authentication**  
Authentication was selected because Assignment 3 requires three high-risk modules grounded in the midterm risk analysis. It remains security-critical because failures in login and access control can expose protected functionality and compromise user trust.

2. **Checkout**  
Checkout was selected because it is the most sensitive operational flow in the system. It involves user state, promo validation, repeated actions, and final order submission, making it a concentrated area of business and reliability risk.

3. **Order Processing**  
Order Processing remains high-risk because it directly affects transaction correctness after submission. It also depends on backend responses, so faults in service communication or response handling can cause incorrect or inconsistent outcomes.

Cart state is an important dependency that affects checkout and order reliability. However, for this initial plan, it is treated as a supporting dependency rather than a separate fourth module.

## Planned Experimental Areas

- Performance testing
- Mutation testing
- Chaos / fault injection testing
