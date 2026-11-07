import { body, dots, ellipse, line, poly, relief, rope, rrect, spiral, type ArtFn } from './common';

/**
 * 土偶（縄文時代）。特徴：縄目・沈線・渦巻きなどの文様、誇張された体つき、穴ではなく浮き彫りの目鼻。
 * 実物の写真はなぞらず、形の特徴を単純化して描いている。
 */

/** 遮光器土偶：ゴーグル状の目、冠状の頭、ふくらんだ手足（左脚は欠損） */
const shakoki: ArtFn = (c, p) => {
  // 脚（右は完存、左は欠けている）
  body(c, p, () => {
    c.moveTo(54, 66);
    c.quadraticCurveTo(70, 70, 68, 92);
    c.lineTo(52, 92);
    c.quadraticCurveTo(50, 78, 54, 66);
  });
  body(c, p, () => {
    c.moveTo(46, 66);
    c.quadraticCurveTo(32, 70, 33, 78);
    c.lineTo(36, 76);
    c.lineTo(38, 80);
    c.lineTo(42, 77);
    c.lineTo(46, 80);
    c.closePath();
  });
  // 腕
  body(c, p, () => ellipse(c, 25, 52, 9, 7, 0.5));
  body(c, p, () => ellipse(c, 75, 52, 9, 7, -0.5));
  // 胴
  body(c, p, () => ellipse(c, 50, 56, 18, 15));
  // 胴の文様（磨消縄文：雲形の帯）
  relief(c, p, () => {
    c.moveTo(36, 52);
    c.quadraticCurveTo(44, 44, 50, 52);
    c.quadraticCurveTo(56, 60, 64, 52);
    c.moveTo(38, 62);
    c.quadraticCurveTo(50, 70, 62, 62);
  }, 1.3);
  rope(c, p, 40, 56, 60, 56);
  spiral(c, p, 25, 52, 4, 1.5);
  spiral(c, p, 75, 52, 4, 1.5);
  // 頭
  body(c, p, () => ellipse(c, 50, 28, 17, 14));
  // 冠
  body(c, p, () => {
    c.moveTo(34, 20);
    c.lineTo(36, 8);
    c.lineTo(43, 14);
    c.lineTo(50, 5);
    c.lineTo(57, 14);
    c.lineTo(64, 8);
    c.lineTo(66, 20);
    c.closePath();
  });
  dots(c, p, [43, 15, 50, 11, 57, 15]);
  // 遮光器（ゴーグル状の目）
  for (const x of [42, 58]) {
    body(c, p, () => ellipse(c, x, 29, 7.5, 6));
    relief(c, p, () => {
      c.moveTo(x - 6, 29);
      c.lineTo(x + 6, 29);
    }, 1.6);
  }
  relief(c, p, () => {
    c.moveTo(47, 38);
    c.lineTo(53, 38);
  }, 1.2);
};

/** ハート形土偶：ハート形の顔、長い首、腕を広げた姿 */
const heart: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => poly(c, [40, 70, 48, 72, 46, 94, 34, 94]));
  body(c, p, () => poly(c, [60, 70, 52, 72, 54, 94, 66, 94]));
  // 胴と腕
  body(c, p, () => {
    c.moveTo(42, 40);
    c.lineTo(18, 46);
    c.lineTo(20, 54);
    c.lineTo(40, 52);
    c.lineTo(38, 74);
    c.lineTo(62, 74);
    c.lineTo(60, 52);
    c.lineTo(80, 54);
    c.lineTo(82, 46);
    c.lineTo(58, 40);
    c.closePath();
  });
  // 胴の沈線
  relief(c, p, () => {
    c.moveTo(42, 56);
    c.lineTo(58, 56);
    c.moveTo(42, 62);
    c.quadraticCurveTo(50, 68, 58, 62);
  }, 1);
  rope(c, p, 22, 50, 38, 48);
  rope(c, p, 62, 48, 78, 50);
  dots(c, p, [46, 47, 54, 47, 50, 50]);
  // 首
  body(c, p, () => rrect(c, 46, 30, 8, 12, 2));
  // ハート形の顔
  body(c, p, () => {
    c.moveTo(50, 36);
    c.bezierCurveTo(30, 28, 28, 6, 42, 8);
    c.quadraticCurveTo(48, 9, 50, 14);
    c.quadraticCurveTo(52, 9, 58, 8);
    c.bezierCurveTo(72, 6, 70, 28, 50, 36);
  });
  // 眉・目・鼻（浮き彫り）
  relief(c, p, () => {
    c.moveTo(38, 16);
    c.quadraticCurveTo(44, 13, 49, 17);
    c.lineTo(50, 27);
    c.moveTo(62, 16);
    c.quadraticCurveTo(56, 13, 51, 17);
  }, 1.5);
  relief(c, p, () => {
    ellipse(c, 43, 20, 2.4, 1.3);
    ellipse(c, 57, 20, 2.4, 1.3);
    ellipse(c, 50, 30, 2.2, 1.2);
  }, 1);
};

/** 板状土偶（十字形）：平らな板、簡素な顔、沈線と刺突文 */
const itajo: ArtFn = (c, p) => {
  body(c, p, () => {
    c.moveTo(38, 8);
    c.lineTo(62, 8);
    c.lineTo(62, 30);
    c.lineTo(86, 34);
    c.lineTo(86, 48);
    c.lineTo(62, 50);
    c.lineTo(66, 92);
    c.lineTo(34, 92);
    c.lineTo(38, 50);
    c.lineTo(14, 48);
    c.lineTo(14, 34);
    c.lineTo(38, 30);
    c.closePath();
  });
  // 顔
  dots(c, p, [45, 17, 55, 17], 1.6);
  relief(c, p, () => {
    c.moveTo(50, 16);
    c.lineTo(50, 24);
  }, 1.4);
  dots(c, p, [50, 27], 1.2);
  // 文様
  relief(c, p, () => {
    c.moveTo(18, 41);
    c.lineTo(82, 41);
    c.moveTo(40, 56);
    c.lineTo(60, 56);
    c.moveTo(39, 70);
    c.lineTo(61, 70);
    c.moveTo(38, 84);
    c.lineTo(62, 84);
  }, 1);
  dots(c, p, [22, 37, 30, 37, 70, 37, 78, 37, 22, 45, 30, 45, 70, 45, 78, 45]);
  for (let y = 59; y < 82; y += 4) dots(c, p, [44, y, 50, y, 56, y], 0.8);
  dots(c, p, [50, 46], 1.6);
};

/** 妊婦形土偶（縄文のビーナス型）：帽子状の頭、ふくらんだ腹と腰 */
const venus: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => rrect(c, 36, 76, 12, 18, 5));
  body(c, p, () => rrect(c, 52, 76, 12, 18, 5));
  // 腰・腹
  body(c, p, () => {
    c.moveTo(40, 44);
    c.bezierCurveTo(22, 52, 22, 82, 38, 82);
    c.lineTo(62, 82);
    c.bezierCurveTo(78, 82, 78, 52, 60, 44);
    c.closePath();
  });
  body(c, p, () => ellipse(c, 50, 64, 11, 11));
  // 腕（小さく）
  body(c, p, () => ellipse(c, 34, 46, 6, 3.5, 0.6));
  body(c, p, () => ellipse(c, 66, 46, 6, 3.5, -0.6));
  // 胸
  dots(c, p, [45, 50, 55, 50], 1.4);
  // 頭
  body(c, p, () => ellipse(c, 50, 32, 11, 10));
  // 帽子状の頭頂（渦巻き文）
  body(c, p, () => ellipse(c, 50, 18, 16, 7));
  spiral(c, p, 44, 18, 4, 1.6);
  spiral(c, p, 56, 18, 4, 1.6);
  // 切れ長の目
  relief(c, p, () => {
    c.moveTo(42, 32);
    c.lineTo(47, 30);
    c.moveTo(58, 32);
    c.lineTo(53, 30);
    c.moveTo(50, 33);
    c.lineTo(50, 37);
  }, 1.4);
};

/** 仮面土偶（仮面の女神型）：逆三角形の仮面、開いた脚、渦巻き文 */
const kamen: ArtFn = (c, p) => {
  // 脚（大きく開く）
  body(c, p, () => poly(c, [44, 66, 26, 94, 40, 94, 50, 74]));
  body(c, p, () => poly(c, [56, 66, 74, 94, 60, 94, 50, 74]));
  spiral(c, p, 36, 86, 4, 1.5);
  spiral(c, p, 64, 86, 4, 1.5);
  // 胴（腕は腰に）
  body(c, p, () => {
    c.moveTo(38, 36);
    c.lineTo(62, 36);
    c.quadraticCurveTo(76, 50, 62, 58);
    c.lineTo(60, 70);
    c.lineTo(40, 70);
    c.lineTo(38, 58);
    c.quadraticCurveTo(24, 50, 38, 36);
    c.closePath();
  });
  body(c, p, () => ellipse(c, 50, 58, 7, 7));
  spiral(c, p, 50, 58, 4.5, 1.8);
  rope(c, p, 40, 42, 60, 42);
  // 首
  body(c, p, () => rrect(c, 45, 30, 10, 8, 2));
  // 逆三角形の仮面
  body(c, p, () => poly(c, [28, 8, 72, 8, 50, 36]));
  relief(c, p, () => {
    c.moveTo(38, 15);
    c.lineTo(46, 15);
    c.moveTo(54, 15);
    c.lineTo(62, 15);
    c.moveTo(50, 16);
    c.lineTo(50, 24);
    c.moveTo(46, 27);
    c.lineTo(54, 27);
  }, 1.4);
  // 仮面を留める紐の跡
  dots(c, p, [30, 11, 70, 11], 1.4);
};

/** 合掌土偶：膝を立てて座り、手を合わせる */
const gassho: ArtFn = (c, p) => {
  // 脚（膝を立てる）
  body(c, p, () => {
    c.moveTo(30, 94);
    c.lineTo(26, 62);
    c.quadraticCurveTo(28, 52, 38, 54);
    c.lineTo(44, 94);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(70, 94);
    c.lineTo(74, 62);
    c.quadraticCurveTo(72, 52, 62, 54);
    c.lineTo(56, 94);
    c.closePath();
  });
  // 胴
  body(c, p, () => rrect(c, 38, 40, 24, 50, 9));
  rope(c, p, 42, 76, 58, 76);
  rope(c, p, 42, 82, 58, 82);
  // 腕（膝の上から手を合わせる）
  body(c, p, () => poly(c, [38, 44, 30, 56, 46, 40]));
  body(c, p, () => poly(c, [62, 44, 70, 56, 54, 40]));
  body(c, p, () => {
    c.moveTo(30, 56);
    c.quadraticCurveTo(38, 52, 48, 40);
    c.lineTo(52, 40);
    c.quadraticCurveTo(62, 52, 70, 56);
    c.quadraticCurveTo(60, 60, 50, 46);
    c.quadraticCurveTo(40, 60, 30, 56);
  });
  // 頭
  body(c, p, () => ellipse(c, 50, 24, 13, 14));
  relief(c, p, () => {
    c.moveTo(43, 22);
    c.lineTo(47, 22);
    c.moveTo(53, 22);
    c.lineTo(57, 22);
    c.moveTo(50, 23);
    c.lineTo(50, 29);
    ellipse(c, 50, 32, 2.5, 1.4);
  }, 1.3);
  rope(c, p, 40, 13, 60, 13);
};

/** みみずく土偶：丸い目と口、結い上げた髪、耳飾り */
const mimizuku: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => rrect(c, 37, 76, 11, 18, 4));
  body(c, p, () => rrect(c, 52, 76, 11, 18, 4));
  // 胴
  body(c, p, () => poly(c, [36, 44, 64, 44, 66, 80, 34, 80]));
  body(c, p, () => ellipse(c, 28, 52, 7, 4, 0.5));
  body(c, p, () => ellipse(c, 72, 52, 7, 4, -0.5));
  for (let y = 52; y < 78; y += 6) rope(c, p, 38, y, 62, y);
  // 結い上げた髪
  body(c, p, () => ellipse(c, 36, 12, 7, 6));
  body(c, p, () => ellipse(c, 50, 8, 8, 6));
  body(c, p, () => ellipse(c, 64, 12, 7, 6));
  // 顔（平らな丸い顔）
  body(c, p, () => ellipse(c, 50, 28, 18, 15));
  // 耳飾り
  for (const x of [30, 70]) {
    body(c, p, () => ellipse(c, x, 32, 4.5, 4.5));
    dots(c, p, [x, 32], 1.6);
  }
  // 丸い目と口（輪の浮き彫り）
  for (const [x, y, r] of [
    [43, 25, 4.5],
    [57, 25, 4.5],
    [50, 36, 3.6],
  ] as const) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = p.light;
    c.fill();
    c.lineWidth = 1.4;
    c.strokeStyle = p.line;
    c.stroke();
    dots(c, p, [x, y], 1.2);
  }
  line(c, p, [36, 18, 48, 20], 1.1);
  line(c, p, [64, 18, 52, 20], 1.1);
};

/** 山形土偶：山形（三角）の頭、広い肩 */
const yamagata: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => poly(c, [38, 72, 48, 72, 47, 94, 34, 94]));
  body(c, p, () => poly(c, [62, 72, 52, 72, 53, 94, 66, 94]));
  // 胴と肩・腕
  body(c, p, () => {
    c.moveTo(40, 36);
    c.lineTo(20, 42);
    c.quadraticCurveTo(14, 52, 22, 56);
    c.lineTo(38, 50);
    c.lineTo(38, 76);
    c.lineTo(62, 76);
    c.lineTo(62, 50);
    c.lineTo(78, 56);
    c.quadraticCurveTo(86, 52, 80, 42);
    c.lineTo(60, 36);
    c.closePath();
  });
  for (let y = 54; y < 74; y += 5) rope(c, p, 40, y, 60, y);
  dots(c, p, [46, 44, 54, 44], 1.3);
  spiral(c, p, 24, 48, 3.5, 1.4);
  spiral(c, p, 76, 48, 3.5, 1.4);
  // 山形の頭
  body(c, p, () => {
    c.moveTo(50, 4);
    c.lineTo(72, 32);
    c.quadraticCurveTo(50, 40, 28, 32);
    c.closePath();
  });
  relief(c, p, () => {
    c.moveTo(42, 22);
    c.lineTo(47, 21);
    c.moveTo(58, 22);
    c.lineTo(53, 21);
    c.moveTo(50, 18);
    c.lineTo(50, 27);
    ellipse(c, 50, 31, 2.4, 1.2);
  }, 1.4);
  rope(c, p, 40, 12, 33, 26);
  rope(c, p, 60, 12, 67, 26);
};

export const DOGU_ART: Record<string, ArtFn> = {
  d_shakoki: shakoki,
  d_heart: heart,
  d_itajo: itajo,
  d_venus: venus,
  d_kamen: kamen,
  d_gassho: gassho,
  d_mimizuku: mimizuku,
  d_yamagata: yamagata,
};
