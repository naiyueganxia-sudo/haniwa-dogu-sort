/**
 * ランキングの名前（D-24、詳細設計 16.6）。ブラウザとサーバーで共用する。
 */

export const NAME_MAX = 10;

export type NameCheck = { ok: true; name: string } | { ok: false; reason: 'empty' | 'long' | 'char' | 'ng' };

/** 見た目の1文字（絵文字・濁点つきの文字も1文字）で数える */
export function countChars(s: string): number {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<unknown> } }).Segmenter;
  if (Seg) {
    let n = 0;
    for (const _ of new Seg('ja', { granularity: 'grapheme' }).segment(s)) n++;
    return n;
  }
  return Array.from(s).length;
}

/** 前後の空白を除き、全角英数字などをそろえ（NFKC）、続く空白を1つにする */
export function normalizeName(raw: string): string {
  return String(raw).normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

/** 改行・タブなどの制御文字、見えない文字（絵文字をつなぐ U+200D と異体字セレクタは許可） */
const BAD_CHAR = /[\p{Cc}\p{Zl}\p{Zp}\p{Co}\p{Cn}]|(?!‍)\p{Cf}/u;

/*
 * 禁止語（差別・性的な語・脅しなど）。完全ではないので、残りは管理者の削除（D-27）で補う。
 * 比較はひらがな・小文字・記号と空白を除いた形で行う（foldForCheck）。
 */
/** 名前のどこかに含まれていたら不可 */
const NG_CONTAINS = [
  'ちんこ', 'ちんぽ', 'まんこ', 'せっくす', 'れいぷ', '死ね', '殺す', 'きちがい', '基地外', '気違い', '強姦', '売春',
  'fuck', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'porn', 'hitler',
].map(foldForCheck);
/** 短く、ふつうの名前の一部にもなりうる語は、名前全体が一致したときだけ不可 */
const NG_EXACT = [
  'しね', 'ころす', '氏ね', 'がいじ', 'ちょん', 'くろんぼ', 'えた', 'ひにん', '障害者', 'しょうがいしゃ',
  'shit', 'pussy', 'rape', 'nazi', 'sex',
].map(foldForCheck);

/** 禁止語との比較用：NFKC、小文字、カタカナ→ひらがな、空白・記号を除く */
export function foldForCheck(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g,(c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\p{P}\p{S}ー]/gu, '');
}

export function checkName(raw: string): NameCheck {
  const name = normalizeName(raw);
  if (name === '') return { ok: false, reason: 'empty' };
  if (BAD_CHAR.test(name)) return { ok: false, reason: 'char' };
  if (countChars(name) > NAME_MAX) return { ok: false, reason: 'long' };
  const folded = foldForCheck(name);
  if (NG_EXACT.includes(folded) || NG_CONTAINS.some((w) => folded.includes(w))) return { ok: false, reason: 'ng' };
  return { ok: true, name };
}
