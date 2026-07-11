export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export function encodeForNetlify(formName: string, payload: ContactPayload): string {
  const params = new URLSearchParams({ 'form-name': formName, ...payload });
  return params.toString();
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
