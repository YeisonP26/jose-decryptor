# Requirements Specification: jose-decryptor

## Overview
Lambda function responsible for decrypting JWE (JSON Web Encryption) tokens back into JSON payloads using RSA-OAEP with A256GCM.

## Functional Requirements

### FR-001: Token Decryption
- The lambda MUST accept a compact JWE token string.
- The lambda MUST decrypt the token using RSA-OAEP-256 and A256GCM algorithms.
- The lambda MUST return the original JSON payload.

### FR-002: Input Validation
- The lambda MUST validate that the input contains a JWE string.
- The lambda MUST reject empty or malformed JWE tokens with 400 Bad Request.
- The lambda MUST reject JWE tokens with invalid format with 400 Bad Request.

### FR-003: Key Management
- The lambda MUST use the RSA private key for decryption.
- The private key MUST be loaded from environment variable or AWS Secrets Manager.

## Non-Functional Requirements

### NFR-001: Performance
- Decryption operation MUST complete in under 500ms for tokens up to 10KB.

### NFR-002: Security
- The lambda MUST NOT log the plaintext payload.
- The private key MUST be protected and never exposed in logs.
- Failed decryption attempts MUST be logged for security monitoring.

## Acceptance Criteria
- [ ] A valid JWE token returns the original JSON payload.
- [ ] An empty JWE token returns 400 Bad Request.
- [ ] A malformed JWE token returns 400 Bad Request.
- [ ] A JWE encrypted with a different key returns 400 Bad Request.
