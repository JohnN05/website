// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { encodeForNetlify, submitContactForm, formProgressStage } from './contactForm';

describe('encodeForNetlify', () => {
  it('url-encodes the form-name and payload fields together', () => {
    const body = encodeForNetlify('contact', { name: 'Ada', email: 'ada@example.com', message: 'Hi' });
    expect(body).toContain('form-name=contact');
    expect(body).toContain('name=Ada');
    expect(body).toContain('email=ada%40example.com');
  });

  it('always sends the honeypot field, empty when a human submits', () => {
    // Netlify matches this wire name against the form's data-netlify-honeypot
    // attribute. Empty is the human answer — the field is inside a `hidden`
    // block — and it must still be present, since the honeypot is scored on
    // what arrives, not on what the markup declares.
    const body = encodeForNetlify('contact', { name: 'Ada', email: 'ada@example.com', message: 'Hi' });
    expect(body).toContain('bot-field=');
  });

  it('carries a filled honeypot through to the request', () => {
    // The bug this guards: the submit is a JS fetch, so a value typed into
    // bot-field by a bot was simply dropped and Netlify scored the three
    // visible fields alone. A honeypot nothing transmits catches nothing.
    const body = encodeForNetlify('contact', {
      name: 'Ada', email: 'ada@example.com', message: 'Hi', botField: 'i am a robot',
    });
    expect(body).toContain('bot-field=i+am+a+robot');
    // ...under Netlify's wire name, not the JS-side spelling.
    expect(body).not.toContain('botField');
  });
});

describe('formProgressStage', () => {
  it('is 0 when every field is empty', () => {
    expect(formProgressStage('', '', '')).toBe(0);
  });

  it('counts whitespace-only fields as empty', () => {
    expect(formProgressStage('  ', '\t', '')).toBe(0);
  });

  it('counts up one per non-empty field, independent of which one', () => {
    expect(formProgressStage('Ada', '', '')).toBe(1);
    expect(formProgressStage('', 'ada@example.com', '')).toBe(1);
    expect(formProgressStage('Ada', 'ada@example.com', '')).toBe(2);
    expect(formProgressStage('Ada', 'ada@example.com', 'Hi')).toBe(3);
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
