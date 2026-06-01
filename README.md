# jose-decryptor

AWS Lambda para desencriptar tokens JWE y recuperar el payload JSON original utilizando RSA-OAEP-256 + A256GCM.

## Arquitectura

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

## Dependencias

- **Node.js 18.x+** (runtime)
- **crypto** (módulo nativo de Node.js) — para RSA-OAEP y AES-256-GCM
- **node:test** (módulo nativo de Node.js v18+) — para pruebas unitarias

No se requieren dependencias de terceros. La implementación utiliza exclusivamente el módulo `crypto` nativo de Node.js.

## Algoritmos

| Componente | Algoritmo |
|------------|-----------|
| Key Decryption | RSA-OAEP-256 (SHA-256) |
| Content Decryption | AES-256-GCM |
| Formato | Compact JWE Serialization (5 partes separadas por `.`) |

## Estructura del Proyecto

```
jose-decryptor/
├── .kiro/specs/           # Spec-Driven Development specs
│   ├── requirements.md    # Requerimientos funcionales y no funcionales
│   ├── design.md          # Diseño de arquitectura y contratos
│   └── tasks.md           # Tareas completadas y pendientes
├── src/
│   ├── index.js           # Handler principal de la Lambda
│   └── base64url.js       # Utilidades base64url (JWE spec)
├── tests/
│   └── index.test.js      # Pruebas unitarias (happy path + error cases)
├── package.json
├── jest.config.js
└── README.md
```

## Instalación

```bash
npm install
```

## Ejecución de Pruebas Unitarias

```bash
npm test
```

### Resultado de las Pruebas

```
# tests 11
# suites 4
# pass 11
# fail 0
```

**Cobertura de casos:**
- ✅ Happy Path: Desencriptar JWE válido
- ✅ Happy Path: Formato API Gateway (body como string)
- ✅ Error: JWE faltante
- ✅ Error: JWE string vacío
- ✅ Error: JWE no es string
- ✅ Error: JWE malformado (no tiene 5 partes)
- ✅ Error: JWE encriptado con llave diferente (key mismatch)
- ✅ Error: Body JSON inválido desde API Gateway
- ✅ Función decryptJWE retorna payload original

## Uso

### Invocación Directa (Local)

```javascript
const { handler } = require('./src/index');

const event = {
  jwe: "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0..."
};

const response = await handler(event);
console.log(response);
// { statusCode: 200, body: '{"payload":{"userId":"12345","email":"user@example.com","data":{"sensitive":"information"}}}' }
```

### Formato de Entrada (API Gateway)

```json
{
  "body": "{\"jwe\":\"eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0...\"}"
}
```

### Formato de Salida (Éxito)

```json
{
  "statusCode": 200,
  "body": {
    "payload": {
      "userId": "12345",
      "email": "user@example.com",
      "data": { "sensitive": "information" }
    }
  }
}
```

### Formato de Salida (Error)

```json
{
  "statusCode": 400,
  "body": {
    "error": "Invalid JWE token or decryption key mismatch"
  }
}
```

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY_PEM` | Llave privada RSA en formato PEM | — |
| `PRIVATE_KEY_PATH` | Ruta al archivo private.pem | `../../keys/private.pem` |

## Despliegue en AWS Lambda

1. Empaquetar el código:
```bash
zip -r jose-decryptor.zip src/ package.json
```

2. Subir a AWS Lambda con runtime Node.js 18.x.

3. Configurar la variable de entorno `PRIVATE_KEY_PEM` con el contenido de la llave privada, o subir `private.pem` junto con el código y usar `PRIVATE_KEY_PATH`.

4. (Opcional) Configurar API Gateway como trigger.

## Spec-Driven Development (SDD)

Este proyecto fue desarrollado siguiendo la metodología SDD:

1. **Requirements** (`.kiro/specs/requirements.md`): Definición de requerimientos funcionales (FR-001 a FR-003) y no funcionales (NFR-001, NFR-002).
2. **Design** (`.kiro/specs/design.md`): Arquitectura, stack tecnológico, contratos de entrada/salida, y manejo de errores.
3. **Tasks** (`.kiro/specs/tasks.md`): Tareas completadas (T-001 a T-005) y pendientes.

---

**Evidencia de funcionamiento:**

### JWE de entrada
```
eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0.eyJlbmNyeXB0ZWRfa2V5Ijoi... (compact JWE de 5 partes)
```

### Payload desencriptado resultante
```json
{
  "payload": {
    "userId": "12345",
    "email": "user@example.com",
    "data": { "sensitive": "information" }
  }
}
```

*(El JWE exacto varía en cada ejecución por la generación aleatoria de CEK e IV)*

Evidencia: 
<img width="946" height="574" alt="image" src="https://github.com/user-attachments/assets/6dc8befb-ab1a-4351-8931-6b9c1e5ccfae" />

<img width="931" height="508" alt="image" src="https://github.com/user-attachments/assets/a59722de-b503-46d2-81a4-7b7c27da3a87" />

<img width="1600" height="900" alt="image" src="https://github.com/user-attachments/assets/96c79bcd-2757-44a9-8db7-04c7c232a519" />



