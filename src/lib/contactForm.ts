export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  /**
   * The honeypot field's value — empty for a human, since the input is inside a
   * `hidden` block nobody can see to fill in.
   *
   * It has to be carried all the way through to the request or the honeypot is
   * decoration: this submit is a JS fetch, so whatever a bot typed into
   * `bot-field` is simply dropped unless it is encoded below, and Netlify would
   * score the submission on the three visible fields alone.
   */
  botField?: string;
}

export function encodeForNetlify(formName: string, payload: ContactPayload): string {
  const { botField = '', ...fields } = payload;
  // 'bot-field' is the wire name Netlify matches against the form's
  // data-netlify-honeypot attribute; botField is just the JS-side spelling.
  const params = new URLSearchParams({ 'form-name': formName, ...fields, 'bot-field': botField });
  return params.toString();
}

/**
 * How many of the three fields currently hold non-whitespace text, 0-3.
 * Drives the contact page's background well: each filled field reveals more
 * of it, so the shared state between the form and its backdrop is this one
 * pure number rather than the fields themselves.
 */
export function formProgressStage(name: string, email: string, message: string): 0 | 1 | 2 | 3 {
  const filled = [name, email, message].filter((v) => v.trim().length > 0).length;
  return filled as 0 | 1 | 2 | 3;
}

export async function submitContactForm(
  payload: ContactPayload,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const response = await fetchImpl('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeForNetlify('contact', payload),
  });
  return response.ok;
}
