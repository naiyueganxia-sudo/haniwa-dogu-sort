import { band, body, ellipse, hole, line, poly, rrect, type ArtFn } from './common';

/**
 * はにわ（古墳時代）。特徴：円筒の台、なめらかな素焼きの面、くりぬいた穴（目・口・透かし孔）、突帯。
 * 実物の写真はなぞらず、形の特徴を単純化して描いている。
 */

/** 人物埴輪（巫女）：円筒の裾、髷、くりぬいた目と口、首飾り */
const miko: ArtFn = (c, p) => {
  // 裾（円筒）
  body(c, p, () => poly(c, [34, 60, 66, 60, 70, 96, 30, 96]));
  band(c, p, 31, 69, 88);
  // 腕
  body(c, p, () => {
    c.moveTo(36, 42);
    c.quadraticCurveTo(22, 50, 26, 62);
    c.quadraticCurveTo(30, 66, 34, 60);
    c.quadraticCurveTo(32, 52, 40, 48);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(64, 42);
    c.quadraticCurveTo(80, 44, 78, 30);
    c.quadraticCurveTo(74, 26, 71, 30);
    c.quadraticCurveTo(72, 38, 60, 46);
    c.closePath();
  });
  // 胴
  body(c, p, () => rrect(c, 36, 36, 28, 28, 8));
  // 首飾り
  c.fillStyle = p.light;
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.arc(40 + i * 3.3, 41 + Math.sin((i / 6) * Math.PI) * 4, 1.4, 0, Math.PI * 2);
    c.fill();
  }
  // 首・頭
  body(c, p, () => rrect(c, 45, 28, 10, 10, 3));
  body(c, p, () => ellipse(c, 50, 22, 11, 12));
  // 髷（島田髷）
  body(c, p, () => {
    rrect(c, 37, 6, 26, 7, 3.5);
  });
  body(c, p, () => rrect(c, 46, 9, 8, 6, 2));
  // くりぬいた目と口
  hole(c, p, 45.5, 21, 2.6, 1.5);
  hole(c, p, 54.5, 21, 2.6, 1.5);
  hole(c, p, 50, 28, 2.4, 1.6);
};

/** 挂甲武人埴輪：衝角付冑、小札の鎧、大刀 */
const bujin: ArtFn = (c, p) => {
  // 脚（袴の円筒）
  body(c, p, () => rrect(c, 36, 70, 12, 26, 3));
  body(c, p, () => rrect(c, 52, 70, 12, 26, 3));
  band(c, p, 36, 48, 80);
  band(c, p, 52, 64, 80);
  // 胴（挂甲）
  body(c, p, () => poly(c, [33, 38, 67, 38, 70, 72, 30, 72]));
  // 小札（横の重なり）
  for (let y = 43; y < 72; y += 5) line(c, p, [33 + (y - 38) * -0.07, y, 67 + (y - 38) * 0.08, y], 0.8);
  for (let y = 43; y < 72; y += 5) for (let x = 36; x < 66; x += 4) line(c, p, [x, y, x, y + 3], 0.6);
  // 肩甲
  body(c, p, () => poly(c, [33, 38, 22, 46, 26, 54, 34, 48]));
  body(c, p, () => poly(c, [67, 38, 78, 46, 74, 54, 66, 48]));
  // 腕と大刀
  body(c, p, () => rrect(c, 22, 50, 7, 18, 3));
  body(c, p, () => rrect(c, 71, 50, 7, 18, 3));
  body(c, p, () => poly(c, [60, 62, 64, 59, 84, 92, 81, 94]));
  body(c, p, () => rrect(c, 58, 57, 9, 5, 2));
  // 頭と冑
  body(c, p, () => ellipse(c, 50, 27, 10, 11));
  body(c, p, () => {
    // 錣（しころ）
    c.moveTo(36, 26);
    c.quadraticCurveTo(50, 36, 64, 26);
    c.lineTo(66, 32);
    c.quadraticCurveTo(50, 42, 34, 32);
    c.closePath();
  });
  body(c, p, () => {
    // 衝角付冑：前に突き出た稜線
    c.moveTo(38, 22);
    c.quadraticCurveTo(44, 6, 60, 10);
    c.lineTo(70, 6);
    c.quadraticCurveTo(64, 16, 62, 22);
    c.closePath();
  });
  line(c, p, [40, 20, 64, 14], 0.9);
  // くりぬいた目と口
  hole(c, p, 46, 27, 2.3, 1.4);
  hole(c, p, 54, 27, 2.3, 1.4);
  hole(c, p, 50, 33, 2.2, 1.3);
};

/** 馬形埴輪：円筒の脚、鞍、杏葉などの馬具 */
const horse: ArtFn = (c, p) => {
  // 脚
  for (const x of [26, 36, 62, 72]) {
    body(c, p, () => rrect(c, x - 4, 54, 9, 40, 3));
    hole(c, p, x + 0.5, 84, 2, 2.6);
  }
  // 尾
  body(c, p, () => poly(c, [82, 40, 90, 46, 88, 62, 83, 60, 84, 48]));
  // 胴
  body(c, p, () => ellipse(c, 52, 46, 32, 13));
  // 首と頭
  body(c, p, () => poly(c, [26, 44, 14, 20, 20, 14, 38, 38]));
  body(c, p, () => rrect(c, 6, 12, 20, 11, 5));
  // たてがみ（切り込み）
  for (let i = 0; i < 5; i++) line(c, p, [21 + i * 3.4, 15 + i * 4.6, 25 + i * 3.4, 13 + i * 4.6], 1.2, p.dark);
  // 耳
  body(c, p, () => poly(c, [20, 13, 22, 6, 25, 13]));
  // 目・鼻（穴）
  hole(c, p, 17, 16, 1.6, 1.3);
  hole(c, p, 8.5, 19, 1.4, 1.2);
  // 鞍
  body(c, p, () => {
    c.moveTo(42, 36);
    c.quadraticCurveTo(52, 26, 64, 36);
    c.lineTo(62, 42);
    c.lineTo(44, 42);
    c.closePath();
  });
  // 胸繋・尻繋と杏葉
  line(c, p, [30, 44, 40, 56, 66, 56, 78, 44], 1.3, p.dark);
  for (const [x, y] of [
    [40, 56],
    [53, 57],
    [66, 56],
  ] as const) {
    body(c, p, () => {
      c.moveTo(x, y);
      c.quadraticCurveTo(x - 4, y + 4, x, y + 8);
      c.quadraticCurveTo(x + 4, y + 4, x, y);
    });
  }
};

/** 犬形埴輪：巻いた尾、首輪と鈴、立った耳 */
const dog: ArtFn = (c, p) => {
  for (const x of [32, 40, 62, 70]) body(c, p, () => rrect(c, x - 4, 58, 8, 34, 3));
  // 巻いた尾
  c.beginPath();
  c.arc(78, 38, 7, 0, Math.PI * 2);
  c.lineWidth = 5;
  c.strokeStyle = p.base;
  c.stroke();
  c.lineWidth = 1.2;
  c.strokeStyle = p.dark;
  c.beginPath();
  c.arc(78, 38, 9.5, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(78, 38, 4.5, 0, Math.PI * 2);
  c.stroke();
  body(c, p, () => ellipse(c, 52, 52, 24, 11));
  // 首・頭
  body(c, p, () => poly(c, [30, 50, 22, 32, 36, 30, 42, 46]));
  body(c, p, () => ellipse(c, 26, 30, 12, 9));
  body(c, p, () => rrect(c, 8, 28, 14, 9, 4));
  // 耳
  body(c, p, () => poly(c, [22, 24, 20, 12, 28, 21]));
  body(c, p, () => poly(c, [30, 23, 32, 11, 36, 22]));
  // 首輪と鈴
  line(c, p, [24, 40, 38, 36], 2.4, p.dark);
  body(c, p, () => ellipse(c, 31, 42, 3, 3));
  // 目と口（穴）
  hole(c, p, 25, 28, 1.8, 1.5);
  hole(c, p, 12, 34, 3.2, 1.3);
};

/** 鶏形埴輪：とさか、肉垂、円筒の台 */
const chicken: ArtFn = (c, p) => {
  // 円筒の台
  body(c, p, () => rrect(c, 36, 62, 28, 34, 3));
  band(c, p, 36, 64, 74);
  band(c, p, 36, 64, 88);
  hole(c, p, 50, 81, 3, 3);
  // 尾羽
  body(c, p, () => {
    c.moveTo(60, 50);
    c.quadraticCurveTo(84, 30, 82, 12);
    c.quadraticCurveTo(88, 36, 70, 60);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(62, 54);
    c.quadraticCurveTo(80, 44, 88, 30);
    c.quadraticCurveTo(84, 52, 66, 62);
    c.closePath();
  });
  // 胴
  body(c, p, () => ellipse(c, 50, 54, 20, 12));
  // 首・頭
  body(c, p, () => poly(c, [34, 52, 34, 26, 46, 26, 50, 48]));
  body(c, p, () => ellipse(c, 38, 24, 8, 8));
  // くちばし
  body(c, p, () => poly(c, [30, 22, 22, 25, 30, 28]));
  // とさか
  body(c, p, () => {
    c.moveTo(32, 18);
    for (let i = 0; i < 4; i++) {
      c.lineTo(34 + i * 4, 9 - (i % 2) * 2);
      c.lineTo(36 + i * 4, 15);
    }
    c.lineTo(44, 19);
    c.closePath();
  });
  // 肉垂
  body(c, p, () => ellipse(c, 31, 32, 2.6, 4));
  // 目（穴）
  hole(c, p, 38, 22, 1.8, 1.6);
  // 翼
  line(c, p, [42, 52, 52, 58, 60, 54], 1.2, p.dark);
};

/** 家形埴輪：入母屋造りの屋根、四角い開口部 */
const house: ArtFn = (c, p) => {
  // 基部
  body(c, p, () => rrect(c, 18, 86, 64, 9, 2));
  // 壁
  body(c, p, () => rrect(c, 22, 50, 56, 37, 2));
  // 柱
  for (const x of [26, 50, 74]) line(c, p, [x, 52, x, 86], 1, p.dark);
  // 入口と窓（くりぬき）
  c.beginPath();
  rrect(c, 43, 62, 14, 24, 1);
  c.fillStyle = p.hole;
  c.fill();
  c.beginPath();
  rrect(c, 29, 60, 8, 8, 1);
  rrect(c, 63, 60, 8, 8, 1);
  c.fill();
  // 屋根（入母屋）
  body(c, p, () => poly(c, [10, 52, 90, 52, 74, 30, 26, 30]));
  body(c, p, () => poly(c, [28, 30, 72, 30, 64, 14, 36, 14]));
  // 棟と堅魚木
  body(c, p, () => rrect(c, 32, 10, 36, 5, 2));
  for (const x of [38, 47, 56, 65]) body(c, p, () => rrect(c, x - 3, 6, 6, 5, 2));
  // 屋根の線
  for (let i = 1; i < 6; i++) line(c, p, [10 + i * 13.3, 52, 26 + i * 8, 30], 0.7);
};

/** 円筒埴輪：突帯と透かし孔 */
const cylinder: ArtFn = (c, p) => {
  body(c, p, () => {
    c.moveTo(28, 14);
    c.lineTo(72, 14);
    c.lineTo(70, 94);
    c.lineTo(30, 94);
    c.closePath();
  });
  // 口縁（少し開く）
  body(c, p, () => poly(c, [24, 8, 76, 8, 72, 16, 28, 16]));
  c.beginPath();
  ellipse(c, 50, 9, 25, 2.6);
  c.fillStyle = p.hole;
  c.fill();
  band(c, p, 29, 71, 36);
  band(c, p, 29, 71, 58);
  band(c, p, 30, 70, 80);
  hole(c, p, 40, 47, 4.2, 4.2);
  hole(c, p, 60, 47, 4.2, 4.2);
  hole(c, p, 50, 69, 4.2, 4.2);
  // 刷毛目
  for (let x = 32; x < 70; x += 3) line(c, p, [x, 84, x + 1, 92], 0.4);
};

/** 盾形埴輪：盾の板に鋸歯文と幾何学文様、円筒の台 */
const shield: ArtFn = (c, p) => {
  body(c, p, () => rrect(c, 40, 74, 20, 22, 2));
  band(c, p, 40, 60, 86);
  body(c, p, () => {
    c.moveTo(26, 8);
    c.quadraticCurveTo(50, 12, 74, 8);
    c.quadraticCurveTo(70, 42, 74, 78);
    c.quadraticCurveTo(50, 74, 26, 78);
    c.quadraticCurveTo(30, 42, 26, 8);
    c.closePath();
  });
  // 鋸歯文（ふち）
  c.fillStyle = p.dark;
  for (let i = 0; i < 6; i++) {
    const y = 14 + i * 10.5;
    c.beginPath();
    poly(c, [30, y, 36, y + 5, 30, y + 10]);
    poly(c, [70, y, 64, y + 5, 70, y + 10]);
    c.fill();
  }
  // 中央の文様（菱形と直線）
  line(c, p, [40, 16, 60, 16, 60, 70, 40, 70, 40, 16], 1.2, p.dark);
  line(c, p, [50, 20, 58, 43, 50, 66, 42, 43, 50, 20], 1.2, p.dark);
  line(c, p, [42, 43, 58, 43], 1, p.dark);
  hole(c, p, 50, 43, 2.4, 2.4);
};

export const HANIWA_ART: Record<string, ArtFn> = {
  h_miko: miko,
  h_bujin: bujin,
  h_horse: horse,
  h_dog: dog,
  h_chicken: chicken,
  h_house: house,
  h_cylinder: cylinder,
  h_shield: shield,
};
