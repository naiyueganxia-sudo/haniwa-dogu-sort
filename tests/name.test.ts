import { describe, expect, it } from 'vitest';
import { checkName, countChars, normalizeName } from '../src/core/name';

describe('名前（D-24、詳細設計 16.6）', () => {
  it('前後の空白を除き、全角英数字を半角にそろえる', () => {
    expect(normalizeName('  ＡＢＣ１２３　')).toBe('ABC123');
    expect(normalizeName('はに　　わ')).toBe('はに わ');
    expect(checkName(' はにわ太郎 ')).toEqual({ ok: true, name: 'はにわ太郎' });
  });

  it('1〜10文字（見た目の1文字で数える）', () => {
    expect(checkName('あいうえおかきくけこ').ok).toBe(true);
    expect(checkName('あいうえおかきくけこさ')).toEqual({ ok: false, reason: 'long' });
    expect(countChars('👨‍👩‍👧')).toBe(1);
    expect(countChars('が')).toBe(1);
    expect(countChars('が')).toBe(1);
    expect(checkName('👨‍👩‍👧👍🏽あ').ok).toBe(true);
  });

  it('空欄・空白だけは不可', () => {
    expect(checkName('')).toEqual({ ok: false, reason: 'empty' });
    expect(checkName('   　')).toEqual({ ok: false, reason: 'empty' });
  });

  it('改行・タブ・見えない文字は不可', () => {
    expect(checkName('a\nb').ok).toBe(true); // 改行は空白にそろえられる
    expect(normalizeName('a\nb')).toBe('a b');
    expect(checkName('a\u0000b')).toEqual({ ok: false, reason: 'char' });
    expect(checkName('a​b')).toEqual({ ok: false, reason: 'char' });
    expect(checkName('a‮b')).toEqual({ ok: false, reason: 'char' });
  });

  it('禁止語は言い換えても不可', () => {
    for (const n of ['しね', 'シネ', 'ｼﾈ', 'し ね', 'FUCK', 'ｆｕｃｋyou', 'ばかちんこ', 'nazi']) {
      expect(checkName(n), n).toEqual({ ok: false, reason: 'ng' });
    }
  });

  it('ふつうの名前は通る（禁止語の一部を含んでいても）', () => {
    for (const n of ['よしねこ', 'ashita', 'grape', 'Essex', 'えたろう', 'どぐう', 'はにわ', 'ナチュラル', 'Ken']) {
      expect(checkName(n).ok, n).toBe(true);
    }
  });
});
