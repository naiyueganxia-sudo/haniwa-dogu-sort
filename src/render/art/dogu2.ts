import { body, dots, ellipse, line, poly, relief, rope, rrect, spiral, type ArtFn, type Clay, type Ctx } from './common';

/**
 * 土偶（縄文時代）の追加8種（詳細設計 17.3）。
 * 今の8種と同じく、縄目・沈線・渦巻き・刺突などの文様と、浮き彫りの目鼻（くりぬいた穴ではない）で描く。
 */

/** 浮き彫りの簡単な顔（細い目・鼻・口） */
function reliefFace(c: Ctx, p: Clay, x: number, y: number, w: number): void {
  relief(c, p, () => {
    c.moveTo(x - w, y);
    c.quadraticCurveTo(x - w / 2, y - 1.6, x - w * 0.2, y);
    c.moveTo(x + w * 0.2, y);
    c.quadraticCurveTo(x + w / 2, y - 1.6, x + w, y);
    c.moveTo(x, y + 1);
    c.lineTo(x, y + w * 0.9);
    c.moveTo(x - w * 0.35, y + w * 1.35);
    c.lineTo(x + w * 0.35, y + w * 1.35);
  }, 1.3);
}

/** 中空土偶：中が空洞の大きな体、全身の細かい沈線文、あごの刺突（ひげ状） */
const chuku: ArtFn = (c, p) => {
  // 脚（離れて立つ）
  body(c, p, () => {
    c.moveTo(38, 66);
    c.quadraticCurveTo(32, 80, 34, 94);
    c.lineTo(46, 94);
    c.quadraticCurveTo(46, 80, 49, 70);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(62, 66);
    c.quadraticCurveTo(68, 80, 66, 94);
    c.lineTo(54, 94);
    c.quadraticCurveTo(54, 80, 51, 70);
    c.closePath();
  });
  // 腕（肩から短く欠ける）
  body(c, p, () => ellipse(c, 30, 40, 6, 4, 0.4));
  body(c, p, () => ellipse(c, 70, 40, 6, 4, -0.4));
  // 胴（中空でふくらむ）
  body(c, p, () => {
    c.moveTo(34, 34);
    c.quadraticCurveTo(50, 30, 66, 34);
    c.quadraticCurveTo(70, 56, 62, 72);
    c.quadraticCurveTo(50, 76, 38, 72);
    c.quadraticCurveTo(30, 56, 34, 34);
  });
  // 細かい沈線文（帯と斜線）
  for (const y of [42, 52, 62]) relief(c, p, () => {
    c.moveTo(36, y);
    c.quadraticCurveTo(50, y + 3, 64, y);
  }, 0.9);
  for (let i = 0; i < 6; i++) line(c, p, [38 + i * 4.5, 44, 41 + i * 4.5, 50], 0.7);
  for (let i = 0; i < 6; i++) line(c, p, [38 + i * 4.5, 54, 41 + i * 4.5, 60], 0.7);
  relief(c, p, () => {
    c.moveTo(38, 82);
    c.lineTo(45, 82);
    c.moveTo(55, 82);
    c.lineTo(62, 82);
  }, 0.9);
  // 頭
  body(c, p, () => ellipse(c, 50, 20, 13, 13));
  reliefFace(c, p, 50, 18, 6);
  // あごのひげ状の刺突
  dots(c, p, [41, 25, 43, 28, 46, 30, 50, 31, 54, 30, 57, 28, 59, 25], 0.8);
};

/** 抱児土偶：胸に子を抱く、文様の体 */
const hoji: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => rrect(c, 37, 72, 11, 22, 4));
  body(c, p, () => rrect(c, 52, 72, 11, 22, 4));
  // 胴
  body(c, p, () => {
    c.moveTo(34, 36);
    c.quadraticCurveTo(50, 32, 66, 36);
    c.lineTo(66, 76);
    c.quadraticCurveTo(50, 80, 34, 76);
    c.closePath();
  });
  rope(c, p, 36, 70, 64, 70);
  spiral(c, p, 40, 64, 3.2, 1.5);
  spiral(c, p, 60, 64, 3.2, 1.5);
  // 抱いている子
  body(c, p, () => ellipse(c, 50, 50, 9, 11));
  body(c, p, () => ellipse(c, 50, 40, 6, 5.5));
  relief(c, p, () => {
    c.moveTo(47.5, 40);
    c.lineTo(49, 40);
    c.moveTo(51, 40);
    c.lineTo(52.5, 40);
  }, 1);
  // 子を抱く腕
  body(c, p, () => {
    c.moveTo(34, 38);
    c.quadraticCurveTo(28, 52, 42, 58);
    c.lineTo(58, 58);
    c.quadraticCurveTo(72, 52, 66, 38);
    c.lineTo(62, 40);
    c.quadraticCurveTo(64, 52, 56, 53);
    c.lineTo(44, 53);
    c.quadraticCurveTo(36, 52, 38, 40);
    c.closePath();
  });
  // 頭
  body(c, p, () => ellipse(c, 50, 20, 12, 12));
  reliefFace(c, p, 50, 18, 5.5);
  rope(c, p, 40, 10, 60, 10);
};

/** 立像土偶（縄文の女神型）：三日月形の平たい頭、小さな胸、大きく張り出した腰、長く細くなる脚、沈線 */
const megami: ArtFn = (c, p) => {
  // 長い脚（下へ細くなる）
  body(c, p, () => {
    c.moveTo(36, 58);
    c.quadraticCurveTo(38, 80, 43, 96);
    c.lineTo(49, 96);
    c.quadraticCurveTo(49, 76, 50, 62);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(64, 58);
    c.quadraticCurveTo(62, 80, 57, 96);
    c.lineTo(51, 96);
    c.quadraticCurveTo(51, 76, 50, 62);
    c.closePath();
  });
  for (const y of [74, 80, 86]) {
    line(c, p, [40, y, 47, y + 1], 0.8);
    line(c, p, [60, y, 53, y + 1], 0.8);
  }
  // 張り出した腰
  body(c, p, () => {
    c.moveTo(38, 46);
    c.quadraticCurveTo(26, 54, 34, 64);
    c.lineTo(66, 64);
    c.quadraticCurveTo(74, 54, 62, 46);
    c.closePath();
  });
  relief(c, p, () => {
    c.moveTo(36, 58);
    c.quadraticCurveTo(50, 64, 64, 58);
  }, 0.9);
  // 胴（肩から腰へ）
  body(c, p, () => poly(c, [38, 24, 62, 24, 60, 48, 40, 48]));
  // 小さな胸（浮き彫りの弧）と、へそ
  relief(c, p, () => {
    c.moveTo(42, 33);
    c.quadraticCurveTo(45, 37, 48, 33);
    c.moveTo(52, 33);
    c.quadraticCurveTo(55, 37, 58, 33);
  }, 1.1);
  dots(c, p, [50, 42], 0.9);
  // 短い腕（肩から下へ）
  body(c, p, () => poly(c, [38, 25, 32, 27, 33, 36, 38, 32]));
  body(c, p, () => poly(c, [62, 25, 68, 27, 67, 36, 62, 32]));
  // 首
  body(c, p, () => rrect(c, 46, 18, 8, 8, 2));
  // 頭（三日月形の平たい板。顔の表現はない）
  body(c, p, () => {
    c.moveTo(30, 6);
    c.quadraticCurveTo(50, 16, 70, 6);
    c.quadraticCurveTo(68, 18, 50, 22);
    c.quadraticCurveTo(32, 18, 30, 6);
  });
  dots(c, p, [40, 13, 45, 15, 50, 16, 55, 15, 60, 13], 0.7);
};

/** 河童形土偶：頭のてっぺんの皿状のくぼみ、丸い顔、文様の体 */
const kappa: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => rrect(c, 36, 74, 12, 20, 5));
  body(c, p, () => rrect(c, 52, 74, 12, 20, 5));
  // 腕（腹に当てる）
  body(c, p, () => {
    c.moveTo(34, 46);
    c.quadraticCurveTo(24, 58, 40, 64);
    c.lineTo(44, 60);
    c.quadraticCurveTo(34, 56, 38, 48);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(66, 46);
    c.quadraticCurveTo(76, 58, 60, 64);
    c.lineTo(56, 60);
    c.quadraticCurveTo(66, 56, 62, 48);
    c.closePath();
  });
  // 胴
  body(c, p, () => ellipse(c, 50, 60, 15, 17));
  rope(c, p, 38, 70, 62, 70);
  relief(c, p, () => {
    c.moveTo(42, 52);
    c.quadraticCurveTo(50, 58, 58, 52);
  }, 1.1);
  // 頭（丸い顔）
  body(c, p, () => ellipse(c, 50, 28, 17, 16));
  // 皿状のくぼみ（縁の盛り上がり）
  body(c, p, () => ellipse(c, 50, 15, 13, 4.5));
  relief(c, p, () => ellipse(c, 50, 15.5, 9, 2.4), 1.2);
  // 顔
  relief(c, p, () => {
    ellipse(c, 43, 28, 3.6, 2.2);
    ellipse(c, 57, 28, 3.6, 2.2);
    c.moveTo(50, 30);
    c.lineTo(50, 35);
    ellipse(c, 50, 38, 3, 1.6);
  }, 1.2);
};

/** 結髪土偶：高く結い上げた髪、細い目、渦巻き文の体 */
const kekkatsu: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => rrect(c, 38, 76, 10, 18, 4));
  body(c, p, () => rrect(c, 52, 76, 10, 18, 4));
  // 腕
  body(c, p, () => ellipse(c, 31, 54, 7, 5, 0.6));
  body(c, p, () => ellipse(c, 69, 54, 7, 5, -0.6));
  // 胴
  body(c, p, () => rrect(c, 36, 46, 28, 34, 10));
  spiral(c, p, 43, 60, 4, 1.6);
  spiral(c, p, 57, 60, 4, 1.6);
  rope(c, p, 38, 72, 62, 72);
  // 頭
  body(c, p, () => ellipse(c, 50, 38, 11, 10));
  reliefFace(c, p, 50, 37, 5);
  // 結い上げた髪（大きな髷と左右の輪）
  body(c, p, () => ellipse(c, 38, 24, 6, 7, -0.3));
  body(c, p, () => ellipse(c, 62, 24, 6, 7, 0.3));
  body(c, p, () => {
    c.moveTo(40, 30);
    c.quadraticCurveTo(38, 10, 50, 5);
    c.quadraticCurveTo(62, 10, 60, 30);
    c.closePath();
  });
  relief(c, p, () => {
    c.moveTo(44, 26);
    c.quadraticCurveTo(50, 12, 56, 26);
    c.moveTo(47, 26);
    c.quadraticCurveTo(50, 18, 53, 26);
  }, 1);
  spiral(c, p, 38, 24, 3, 1.2);
  spiral(c, p, 62, 24, 3, 1.2);
};

/** 出尻土偶：横から見て大きく張り出した尻、前に曲がる上体、簡素な顔 */
const dejiri: ArtFn = (c, p) => {
  // 脚
  body(c, p, () => poly(c, [44, 70, 54, 70, 52, 94, 42, 94]));
  // 張り出した尻と腰
  body(c, p, () => {
    c.moveTo(44, 46);
    c.quadraticCurveTo(80, 48, 78, 66);
    c.quadraticCurveTo(74, 80, 54, 76);
    c.lineTo(44, 74);
    c.closePath();
  });
  // 上体（前かがみ）
  body(c, p, () => {
    c.moveTo(38, 30);
    c.quadraticCurveTo(28, 50, 40, 74);
    c.lineTo(56, 74);
    c.quadraticCurveTo(52, 50, 54, 32);
    c.closePath();
  });
  // 腹（ふくらむ）
  body(c, p, () => ellipse(c, 38, 58, 7, 9));
  // 腕
  body(c, p, () => ellipse(c, 44, 40, 4, 8, 0.3));
  // 文様
  rope(c, p, 58, 56, 72, 60);
  relief(c, p, () => {
    c.moveTo(56, 66);
    c.quadraticCurveTo(66, 70, 74, 64);
  }, 1);
  // 頭（横顔）
  body(c, p, () => ellipse(c, 44, 20, 11, 11));
  relief(c, p, () => {
    c.moveTo(35, 19);
    c.lineTo(39, 19);
    c.moveTo(34, 24);
    c.lineTo(37, 25);
  }, 1.3);
  rope(c, p, 40, 10, 54, 14);
};

/** 屈折像土偶（しゃがむ土偶）：膝を立ててしゃがみ、腕を膝に置く */
const kussetsu: ArtFn = (c, p) => {
  // 足
  body(c, p, () => rrect(c, 28, 84, 16, 10, 4));
  body(c, p, () => rrect(c, 56, 84, 16, 10, 4));
  // すね（立てた膝）
  body(c, p, () => poly(c, [30, 86, 42, 86, 40, 50, 28, 52]));
  body(c, p, () => poly(c, [70, 86, 58, 86, 60, 50, 72, 52]));
  // 胴（すねの間）
  body(c, p, () => {
    c.moveTo(40, 34);
    c.quadraticCurveTo(50, 30, 60, 34);
    c.lineTo(60, 84);
    c.quadraticCurveTo(50, 88, 40, 84);
    c.closePath();
  });
  rope(c, p, 42, 70, 58, 70);
  relief(c, p, () => {
    c.moveTo(43, 60);
    c.quadraticCurveTo(50, 64, 57, 60);
  }, 1);
  // 膝
  body(c, p, () => ellipse(c, 34, 50, 8, 6));
  body(c, p, () => ellipse(c, 66, 50, 8, 6));
  // 腕（膝の上で組む）
  body(c, p, () => {
    c.moveTo(40, 38);
    c.quadraticCurveTo(28, 40, 30, 48);
    c.lineTo(46, 50);
    c.closePath();
  });
  body(c, p, () => {
    c.moveTo(60, 38);
    c.quadraticCurveTo(72, 40, 70, 48);
    c.lineTo(54, 50);
    c.closePath();
  });
  spiral(c, p, 34, 50, 3, 1.4);
  spiral(c, p, 66, 50, 3, 1.4);
  // 頭
  body(c, p, () => ellipse(c, 50, 22, 12, 12));
  reliefFace(c, p, 50, 20, 5.5);
  rope(c, p, 40, 12, 60, 12);
};

/** 筒形土偶：筒形の胴に顔、縄目と沈線の文様（はにわの突帯や透かし孔はない） */
const tsutsu: ArtFn = (c, p) => {
  // 筒形の胴
  body(c, p, () => {
    c.moveTo(34, 30);
    c.quadraticCurveTo(50, 26, 66, 30);
    c.lineTo(68, 94);
    c.quadraticCurveTo(50, 98, 32, 94);
    c.closePath();
  });
  // 縄目文と沈線（帯状に）
  rope(c, p, 35, 50, 65, 50);
  rope(c, p, 35, 74, 66, 74);
  relief(c, p, () => {
    c.moveTo(35, 56);
    c.quadraticCurveTo(42, 66, 50, 58);
    c.quadraticCurveTo(58, 50, 65, 62);
    c.moveTo(34, 82);
    c.quadraticCurveTo(50, 90, 66, 82);
  }, 1.1);
  spiral(c, p, 50, 64, 3.4, 1.5);
  // 小さな腕
  body(c, p, () => ellipse(c, 31, 42, 4.5, 3, 0.4));
  body(c, p, () => ellipse(c, 69, 42, 4.5, 3, -0.4));
  // 顔（筒の上端）
  body(c, p, () => ellipse(c, 50, 22, 15, 13));
  relief(c, p, () => {
    c.moveTo(42, 20);
    c.quadraticCurveTo(44, 17, 47, 20);
    c.moveTo(53, 20);
    c.quadraticCurveTo(56, 17, 58, 20);
    c.moveTo(50, 21);
    c.lineTo(50, 27);
    c.moveTo(46, 30);
    c.quadraticCurveTo(50, 32, 54, 30);
  }, 1.3);
  dots(c, p, [38, 12, 44, 10, 50, 9, 56, 10, 62, 12], 0.9);
};

export const DOGU_ART_2: Record<string, ArtFn> = {
  d_chuku: chuku,
  d_hoji: hoji,
  d_megami: megami,
  d_kappa: kappa,
  d_kekkatsu: kekkatsu,
  d_dejiri: dejiri,
  d_kussetsu: kussetsu,
  d_tsutsu: tsutsu,
};
