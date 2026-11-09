/**
 * 整理券（詳細設計 16.4）。種・発行時刻・ランダムなID・ルールの版に、サーバーだけが知る鍵で署名する（HMAC-SHA256）。
 * データベースには書かない。
 */

export interface RunTicket {
  /** ランダムなID（使い回し防止） */
  r: string;
  /** 乱数の種（32ビット符号なし整数） */
  s: number;
  /** 発行時刻（ミリ秒） */
  t: number;
  /** ルールの版 */
  v: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function randomId(): string {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function randomSeed32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

export async function signTicket(t: RunTicket, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(t)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** 署名が正しければ中身を返す。形式・署名が不正なら null */
export async function verifyTicket(token: unknown, secret: string): Promise<RunTicket | null> {
  if (typeof token !== 'string' || token.length > 512) return null;
  const [body, sigS, extra] = token.split('.');
  if (!body || !sigS || extra !== undefined) return null;
  const sig = fromB64url(sigS);
  const bodyBytes = fromB64url(body);
  if (!sig || !bodyBytes) return null;
  const ok = await crypto.subtle.verify('HMAC', await key(secret), sig, enc.encode(body));
  if (!ok) return null;
  try {
    const v = JSON.parse(new TextDecoder().decode(bodyBytes)) as RunTicket;
    if (
      typeof v.r !== 'string' || !/^[0-9a-f]{24}$/.test(v.r) ||
      !Number.isInteger(v.s) || v.s < 0 || v.s > 0xffffffff ||
      !Number.isInteger(v.t) || !Number.isInteger(v.v)
    ) {
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

/** 接続元（IPアドレス）を、鍵と混ぜて元に戻せない形にする（16.5） */
export async function hashIp(ip: string, secret: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${secret}|${ip}`)));
  return Array.from(d.slice(0, 12), (x) => x.toString(16).padStart(2, '0')).join('');
}
