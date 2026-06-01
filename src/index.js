const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { base64urlDecode } = require('./base64url');

// Load private key from file or environment variable
function loadPrivateKey() {
  const pemPath = process.env.PRIVATE_KEY_PATH || path.join(__dirname, '../../keys/private.pem');

  if (process.env.PRIVATE_KEY_PEM) {
    return process.env.PRIVATE_KEY_PEM;
  }

  if (fs.existsSync(pemPath)) {
    return fs.readFileSync(pemPath, 'utf8');
  }

  throw new Error('Private key not found. Set PRIVATE_KEY_PEM or PRIVATE_KEY_PATH.');
}

async function decryptJWE(jweToken) {
  // 1. Parse JWE compact serialization
  const parts = jweToken.split('.');
  if (parts.length !== 5) {
    throw new Error('Invalid JWE format: expected 5 parts');
  }

  const [encodedHeader, encodedEncryptedKey, encodedIv, encodedCiphertext, encodedAuthTag] = parts;

  // 2. Decode parts
  const encryptedKey = base64urlDecode(encodedEncryptedKey);
  const iv = base64urlDecode(encodedIv);
  const ciphertext = base64urlDecode(encodedCiphertext);
  const authTag = base64urlDecode(encodedAuthTag);

  // 3. Decrypt CEK with RSA-OAEP-256
  const privateKeyPem = loadPrivateKey();
  const cek = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    encryptedKey
  );

  // 4. Decrypt content with AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', cek, iv);

  // AAD is the encoded protected header (JWE spec)
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(encodedHeader, 'utf8'));

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(plaintext.toString('utf8'));
}

async function handler(event) {
  try {
    // Parse body if coming from API Gateway
    let body = event;
    if (event.body && typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
    }

    // Validate input
    if (!body || body.jwe === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'JWE token is required' })
      };
    }

    const jwe = body.jwe;

    if (typeof jwe !== 'string' || jwe.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'JWE token must be a non-empty string' })
      };
    }

    // Decrypt
    const payload = await decryptJWE(jwe);

    return {
      statusCode: 200,
      body: JSON.stringify({ payload })
    };

  } catch (error) {
    console.error('Decryption error:', error.message);

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JWE token or decryption key mismatch' })
    };
  }
}

module.exports = { handler, decryptJWE };
