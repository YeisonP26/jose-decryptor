const { describe, it } = require('node:test');
const assert = require('node:assert');
const { handler, decryptJWE } = require('../src/index');
const { encryptPayload } = require('../../jose-encryptor/src/index');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

describe('jose-decryptor', () => {
  let validJWE;
  const originalPayload = {
    userId: '12345',
    email: 'user@example.com',
    data: { sensitive: 'information' }
  };

  it('should have RSA keys available', () => {
    const publicKeyPath = path.join(__dirname, '../../keys/public.pem');
    const privateKeyPath = path.join(__dirname, '../../keys/private.pem');
    assert.ok(fs.existsSync(publicKeyPath), 'public.pem should exist');
    assert.ok(fs.existsSync(privateKeyPath), 'private.pem should exist');
  });

  it('should generate a valid JWE for testing', async () => {
    validJWE = await encryptPayload(originalPayload);
    assert.ok(validJWE);
    assert.strictEqual(validJWE.split('.').length, 5);
  });

  describe('Happy Path', () => {
    it('should decrypt a valid JWE and return the original payload', async () => {
      const event = { jwe: validJWE };
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.payload, 'response should contain payload');
      assert.deepStrictEqual(body.payload, originalPayload);
    });

    it('should handle API Gateway event format with string body', async () => {
      const event = {
        body: JSON.stringify({ jwe: validJWE })
      };
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.deepStrictEqual(body.payload, originalPayload);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 when JWE is missing', async () => {
      const event = {};
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'JWE token is required');
    });

    it('should return 400 when JWE is empty string', async () => {
      const event = { jwe: '' };
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'JWE token must be a non-empty string');
    });

    it('should return 400 when JWE is not a string', async () => {
      const event = { jwe: 12345 };
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'JWE token must be a non-empty string');
    });

    it('should return 400 for malformed JWE string', async () => {
      const event = { jwe: 'not.a.valid.jwe.token' };
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('Invalid JWE'));
    });

    it('should return 400 for JWE encrypted with different key', async () => {
      // Generate a different key pair
      const { publicKey: diffPublicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      // Create a different encryptor using the different public key
      process.env.PUBLIC_KEY_PEM = diffPublicKey;
      const { encryptPayload: diffEncrypt } = require('../../jose-encryptor/src/index');
      const wrongJWE = await diffEncrypt({ test: 'data' });
      delete process.env.PUBLIC_KEY_PEM;

      // Reset module cache
      delete require.cache[require.resolve('../../jose-encryptor/src/index')];
      delete require.cache[require.resolve('../../jose-encryptor/src/base64url')];

      const event = { jwe: wrongJWE };
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('Invalid JWE'));
    });

    it('should return 400 for invalid JSON body from API Gateway', async () => {
      const event = { body: 'not-valid-json' };
      const response = await handler(event);

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Invalid JSON in request body');
    });
  });

  describe('decryptJWE function', () => {
    it('should decrypt and return original payload', async () => {
      const payload = await decryptJWE(validJWE);
      assert.deepStrictEqual(payload, originalPayload);
    });
  });
});
