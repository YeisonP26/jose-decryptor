# Design Specification: jose-decryptor

## Architecture

```
API Gateway / Lambda Invoke
       │
       ▼
┌─────────────────┐
│  jose-decryptor │
│    Lambda       │
└─────────────────┘
       │
       ├─→ Input Validation
       ├─→ Load Private Key (PEM)
       ├─→ JWE Decryption (RSA-OAEP-256 + A256GCM)
       └─→ Return Original JSON Payload
```

## Technology Stack
- **Runtime**: Node.js 18.x
- **Library**: `jose` (npm) — modern, zero-dependency JWE/JWS/JWT library
- **Key Format**: RSA 2048-bit PEM (PKCS8 private)

## Decryption Algorithm
- **Key Management**: RSA-OAEP-256
- **Content Encryption**: A256GCM
- **Format**: Compact JWE Serialization

## Input/Output Contract

### Input (Event)
```json
{
  "jwe": "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0..."
}
```

### Output (Success)
```json
{
  "statusCode": 200,
  "body": {
    "payload": {
      "userId": "12345",
      "data": "sensitive information"
    }
  }
}
```

### Output (Error)
```json
{
  "statusCode": 400,
  "body": {
    "error": "Invalid JWE token"
  }
}
```

## Error Handling
| Error Type | Status Code | Message |
|------------|-------------|---------|
| Missing JWE | 400 | JWE token is required |
| Malformed JWE | 400 | Invalid JWE token format |
| Wrong key | 400 | Decryption failed |
| Decryption failure | 500 | Internal decryption error |

## Environment Variables
| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY_PEM` | RSA private key in PEM format (or path to file) |
