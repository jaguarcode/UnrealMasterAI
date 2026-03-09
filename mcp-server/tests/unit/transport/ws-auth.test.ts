import { describe, it, expect } from 'vitest';
import { validateWsAuth } from '../../../src/transport/ws-auth.js';

describe('validateWsAuth', () => {
  it('accepts all connections when no secret configured', () => {
    const result = validateWsAuth({ 'x-uma-auth-token': 'anything' }, {});
    expect(result.accepted).toBe(true);
  });

  it('accepts all connections when secret is undefined', () => {
    const result = validateWsAuth({}, { secret: undefined });
    expect(result.accepted).toBe(true);
  });

  it('accepts all connections when secret is empty string', () => {
    // Empty string is falsy — treated as no auth configured
    const result = validateWsAuth({}, { secret: '' });
    expect(result.accepted).toBe(true);
  });

  it('accepts connection with valid token', () => {
    const result = validateWsAuth(
      { 'x-uma-auth-token': 'mysecret' },
      { secret: 'mysecret' }
    );
    expect(result.accepted).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejects connection when token header is missing', () => {
    const result = validateWsAuth({}, { secret: 'mysecret' });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('Missing x-uma-auth-token header');
  });

  it('rejects connection with wrong token', () => {
    const result = validateWsAuth(
      { 'x-uma-auth-token': 'wrongtoken' },
      { secret: 'mysecret' }
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('Invalid auth token');
  });

  it('rejects connection when token length differs from secret length', () => {
    const result = validateWsAuth(
      { 'x-uma-auth-token': 'short' },
      { secret: 'muchlongersecret' }
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('Invalid auth token');
  });

  it('handles array header value — uses first element', () => {
    const result = validateWsAuth(
      { 'x-uma-auth-token': ['mysecret', 'ignored'] },
      { secret: 'mysecret' }
    );
    expect(result.accepted).toBe(true);
  });

  it('rejects when array header first element is wrong', () => {
    const result = validateWsAuth(
      { 'x-uma-auth-token': ['wrong!!', 'mysecret'] },
      { secret: 'mysecret' }
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('Invalid auth token');
  });
});
