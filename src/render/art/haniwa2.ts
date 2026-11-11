import { band, body, ellipse, hole, line, poly, rrect, type ArtFn, type Clay, type Ctx } from './common';

/**
 * はにわ（古墳時代）の追加8種（詳細設計 17.3）。
 * 今の8種と同じく、円筒の台・くりぬいた穴・突帯・なめらかな素焼きの面を手がかりに描く。
 */

/** 人物埴輪の頭：くりぬいた目と口、左右の美豆良（みずら） */
function figureHead(c: Ctx, p: Clay, x: number, y: number, r: number, mouth = 1): void {
  // 美豆良（耳の横で束ねた髪）
  body(c, p, () => ellipse(c, x - r - 1.5, y + 3, 2.6, 6));
  body(c, p, () => ellipse(c, x + r + 1.5, y + 3, 2.6, 6));
  body(c, p, () => ellipse(c, x, y, r, r * 1.1));
  hole(c, p, x - r * 0.42, y - 0.5, 2.3, 1.4);
  hole(c, p, x + r * 0.42, y - 0.5, 2.3, 1.4);
  hole(c, p, x, y + r * 0.55, 2.1 * mouth, 1.5 * mouth);
}

/** 船形埴輪：反り上がった舳先と艫、舷側板、櫂座、くりぬいた船の中 */
const boat: ArtFn = (c, p) => {
  c.save();
  c.translate(0, 12); // 上下の中央に寄せる
  // 船体
  body(c, p, () => {
    c.moveTo(5, 26);
    c.quadraticCurveTo(14, 56, 32, 66);
    c.quadraticCurveTo(50, 74, 68, 66);
    c.quadraticCurveTo(86, 56, 95, 30);
    c.lineTo(86, 42);
    c.quadraticCurveTo(50, 50, 14, 40);
    c.closePath();
  });
  // 船の中（くりぬき）
  c.beginPath();
  ellipse(c, 50, 45.5, 33, 3.4);
  c.fillStyle = p.hole;
  c.fill();
  // 舷側板（舳先と艫の立ち上がった板）
  body(c, p, () => poly(c, [8, 22, 18, 30, 20, 44, 12, 40]));
  body(c, p, () => poly(c, [92, 26, 82, 32, 80, 46, 88, 42]));
  // 櫂座（オールを掛ける突起）
  for (const x of [32, 44, 56, 68]) body(c, p, () => rrect(c, x - 2, 41, 4, 5, 1.5));
  // 船底の段（丸木の船底に板を組み上げた準構造船）
  line(c, p, [18, 54, 50, 64, 82, 54], 1.1, p.dark);
  c.restore();
};

/** 鹿形埴輪：枝分かれした角、細い首、円筒の脚 */
const deer: ArtFn = (c, p) => {
  for (const x of [32, 40, 64, 72]) {
    body(c, p, () => rrect(c, x - 3.5, 56, 7.5, 38, 3));
    hole(c, p, x, 84, 1.8, 2.4);
  }
  // 短い尾
  body(c, p, () => poly(c, [80, 44, 86, 42, 84, 50]));
  // 胴
  body(c, p, () => ellipse(c, 54, 50, 27, 11));
  // 首と頭
  body(c, p, () => poly(c, [30, 48, 24, 28, 31, 26, 40, 44]));
  body(c, p, () => {
    c.moveTo(14, 30);
    c.quadraticCurveTo(16, 22, 28, 22);
    c.quadraticCurveTo(34, 24, 32, 30);
    c.quadraticCurveTo(24, 34, 14, 30);
  });
  // 角（枝分かれ）
  line(c, p, [27, 22, 24, 12, 18, 6], 2.6, p.base);
  line(c, p, [24, 12, 29, 6], 2.4, p.base);
  line(c, p, [30, 22, 34, 12, 40, 7], 2.6, p.base);
  line(c, p, [34, 12, 33, 5], 2.4, p.base);
  line(c, p, [27, 22, 24, 12, 18, 6], 0.8, p.dark);
  line(c, p, [30, 22, 34, 12, 40, 7], 0.8, p.dark);
  // 耳
  body(c, p, () => ellipse(c, 33, 24, 4, 1.8, -0.4));
  // 目・鼻（穴）
  hole(c, p, 24, 26, 1.5, 1.3);
  hole(c, p, 16, 28.5, 1.1, 1);
};

/** 力士埴輪：まわし、片手を上げる、髷、くりぬいた目と口 */
const rikishi: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => rrect(c, 34, 66, 13, 28, 4));
  body(c, p, () => rrect(c, 53, 66, 13, 28, 4));
  // 腕（右手を上げ、左手は腰）
  body(c, p, () => {
    c.moveTo(62, 40);
    c.quadraticCurveTo(78, 36, 80, 18);
    c.quadraticCurveTo(84, 14, 86, 19);
    c.quadraticCurveTo(84, 42, 64, 50);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(38, 40);
    c.quadraticCurveTo(22, 46, 26, 62);
    c.quadraticCurveTo(32, 64, 36, 58);
    c.quadraticCurveTo(32, 50, 40, 48);
    c.closePath();
  });
  // 胴（裸の上半身）
  body(c, p, () => rrect(c, 35, 36, 30, 32, 10));
  // まわし
  body(c, p, () => rrect(c, 33, 58, 34, 10, 3));
  body(c, p, () => poly(c, [46, 66, 54, 66, 52, 78, 48, 78]));
  // 頭と髷
  body(c, p, () => rrect(c, 46, 7, 8, 7, 2));
  figureHead(c, p, 50, 22, 10);
};

/** 水鳥形埴輪：長い首、平たいくちばし、円筒の台 */
const waterfowl: ArtFn = (c, p) => {
  // 台
  body(c, p, () => poly(c, [36, 62, 64, 62, 66, 95, 34, 95]));
  band(c, p, 35, 65, 76);
  hole(c, p, 50, 86, 3.2, 3.2);
  // 胴
  body(c, p, () => {
    c.moveTo(18, 50);
    c.quadraticCurveTo(40, 32, 70, 42);
    c.quadraticCurveTo(88, 44, 90, 36);
    c.quadraticCurveTo(92, 52, 74, 62);
    c.quadraticCurveTo(44, 72, 18, 50);
  });
  // 翼の線
  line(c, p, [40, 50, 58, 46, 74, 50], 1.1, p.dark);
  line(c, p, [44, 56, 62, 54, 76, 56], 1.1, p.dark);
  // 長い首と頭
  body(c, p, () => {
    c.moveTo(22, 48);
    c.quadraticCurveTo(12, 30, 22, 14);
    c.lineTo(30, 16);
    c.quadraticCurveTo(22, 30, 32, 46);
    c.closePath();
  });
  body(c, p, () => ellipse(c, 26, 14, 7, 5.5));
  // 平たいくちばし
  body(c, p, () => {
    c.moveTo(20, 12);
    c.quadraticCurveTo(10, 11, 6, 15);
    c.quadraticCurveTo(12, 18, 21, 17);
    c.closePath();
  });
  hole(c, p, 28, 12.5, 1.5, 1.3);
};

/** 猪形埴輪：突き出た鼻、太い胴、小さい耳、円筒の脚 */
const boar: ArtFn = (c, p) => {
  for (const x of [30, 40, 62, 72]) {
    body(c, p, () => rrect(c, x - 4.5, 60, 9.5, 32, 3));
    hole(c, p, x, 83, 2, 2.6);
  }
  // 尾
  line(c, p, [84, 44, 90, 40, 88, 48], 1.8, p.base);
  // 胴（太い）
  body(c, p, () => ellipse(c, 54, 48, 32, 17));
  // 背の毛（切り込み）
  for (let i = 0; i < 6; i++) line(c, p, [40 + i * 6, 32, 43 + i * 6, 35], 1.1, p.dark);
  // 頭
  body(c, p, () => {
    c.moveTo(30, 36);
    c.quadraticCurveTo(14, 38, 8, 50);
    c.lineTo(10, 60);
    c.quadraticCurveTo(22, 64, 32, 58);
    c.closePath();
  });
  // 鼻（平たい鼻先）
  body(c, p, () => ellipse(c, 8, 55, 3.4, 5.5));
  hole(c, p, 7.5, 53, 0.9, 1.3);
  hole(c, p, 7.5, 57.5, 0.9, 1.3);
  // 牙
  body(c, p, () => poly(c, [14, 59, 18, 66, 18, 59]));
  // 耳
  body(c, p, () => poly(c, [26, 38, 28, 28, 33, 37]));
  // 目
  hole(c, p, 20, 45, 1.7, 1.4);
};

/** 鷹匠埴輪：腕にとまる鷹、帽子、くりぬいた目、円筒の裾 */
const falconer: ArtFn = (c, p) => {
  // 裾（円筒）
  body(c, p, () => poly(c, [34, 62, 64, 62, 68, 96, 32, 96]));
  band(c, p, 33, 67, 88);
  // 右腕（下ろす）
  body(c, p, () => {
    c.moveTo(62, 40);
    c.quadraticCurveTo(74, 48, 70, 62);
    c.quadraticCurveTo(66, 64, 64, 58);
    c.quadraticCurveTo(66, 50, 58, 46);
    c.closePath();
  });
  // 左腕（前に出して鷹をとまらせる）
  body(c, p, () => {
    c.moveTo(38, 42);
    c.quadraticCurveTo(26, 46, 16, 46);
    c.lineTo(16, 53);
    c.quadraticCurveTo(28, 54, 40, 50);
    c.closePath();
  });
  // 胴
  body(c, p, () => rrect(c, 36, 36, 28, 28, 7));
  line(c, p, [38, 52, 62, 52], 1.1, p.dark);
  // 鷹
  body(c, p, () => {
    c.moveTo(12, 46);
    c.quadraticCurveTo(6, 34, 14, 24);
    c.quadraticCurveTo(22, 22, 24, 30);
    c.quadraticCurveTo(26, 40, 20, 46);
    c.closePath();
  });
  body(c, p, () => ellipse(c, 17, 23, 5, 4.5));
  body(c, p, () => poly(c, [12, 22, 8, 25, 12, 26]));
  line(c, p, [16, 30, 20, 40], 1, p.dark);
  line(c, p, [13, 32, 16, 42], 1, p.dark);
  hole(c, p, 18, 22, 1.1, 1);
  // 頭と帽子
  figureHead(c, p, 50, 24, 9.5);
  body(c, p, () => {
    c.moveTo(38, 17);
    c.quadraticCurveTo(50, 2, 62, 17);
    c.closePath();
  });
  body(c, p, () => rrect(c, 37, 15, 26, 4, 2));
};

/** 踊る人々（人物埴輪）：片手を高く上げる、大きく開いた口、円筒の胴 */
const dancer: ArtFn = (c, p) => {
  // 円筒の胴（腰から下）
  body(c, p, () => poly(c, [36, 44, 64, 44, 66, 96, 34, 96]));
  band(c, p, 35, 65, 86);
  hole(c, p, 50, 74, 3, 3);
  // 上げた腕
  body(c, p, () => {
    c.moveTo(38, 42);
    c.quadraticCurveTo(26, 30, 24, 10);
    c.quadraticCurveTo(28, 6, 31, 10);
    c.quadraticCurveTo(32, 28, 44, 38);
    c.closePath();
  });
  // 曲げた腕
  body(c, p, () => {
    c.moveTo(62, 40);
    c.quadraticCurveTo(76, 44, 74, 58);
    c.quadraticCurveTo(70, 62, 66, 58);
    c.quadraticCurveTo(68, 50, 58, 48);
    c.closePath();
  });
  // 上半身
  body(c, p, () => rrect(c, 38, 34, 24, 18, 6));
  // 頭（口を大きく開ける）
  figureHead(c, p, 50, 22, 10, 1.5);
};

/** 朝顔形埴輪：円筒の上に朝顔の花のように開いた口、突帯と透かし孔 */
const asagao: ArtFn = (c, p) => {
  // 円筒部
  body(c, p, () => poly(c, [34, 44, 66, 44, 68, 95, 32, 95]));
  band(c, p, 33, 67, 60);
  band(c, p, 33, 67, 80);
  hole(c, p, 42, 70, 3.6, 3.6);
  hole(c, p, 58, 70, 3.6, 3.6);
  // 頸部
  body(c, p, () => poly(c, [40, 30, 60, 30, 64, 46, 36, 46]));
  band(c, p, 36, 64, 44);
  // 朝顔形に開く口
  body(c, p, () => {
    c.moveTo(40, 32);
    c.quadraticCurveTo(26, 22, 10, 8);
    c.lineTo(90, 8);
    c.quadraticCurveTo(74, 22, 60, 32);
    c.closePath();
  });
  band(c, p, 30, 70, 24);
  c.beginPath();
  ellipse(c, 50, 8.5, 40, 3);
  c.fillStyle = p.hole;
  c.fill();
};

export const HANIWA_ART_2: Record<string, ArtFn> = {
  h_boat: boat,
  h_deer: deer,
  h_rikishi: rikishi,
  h_waterfowl: waterfowl,
  h_boar: boar,
  h_falconer: falconer,
  h_dancer: dancer,
  h_asagao: asagao,
};
