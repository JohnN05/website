// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { encodeForNetlify, submitContactForm } from './contactForm';

describe('encodeForNetlify', () => {
  it('url-encodes the form-name and payload fields together', () => {
    const body = encodeForNetlify('contact', { name: 'Ada', email: 'ada@example.com', message: 'Hi' });
    expect(body).toContain('form-name=contact');
    expect(body).toContain('name=Ada');
    expect(body).toContain('email=ada%40example.com');
  });
});

describe('submitContactForm', () => {
  it('POSTs the encoded body and returns true on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const ok = await submitContactForm({ name: 'Ada', email: 'ada@example.com', message: 'Hi' }, fetchImpl);
    expect(ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }));
  });

  it('returns false when the request fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    const ok = await submitContactForm({ name: 'Ada', email: 'ada@example.com', message: 'Hi' }, fetchImpl);
    expect(ok).toBe(false);
  });
});
