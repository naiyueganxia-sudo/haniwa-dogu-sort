import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../core/config';
import type { Category } from '../core/types';

/**
 * 出土品の一覧（詳細設計 第9章・17.3）。
 * 種類を足すときは、ここに1行足し、src/render/art/ に同じ id の絵を足す。
 * はにわ＝古墳時代、土偶＝縄文時代。分類が境界的なもの（土面・岩偶・土偶形容器・動物形土製品・有髯土偶など）は入れない。
 *
 * **分類ごとの並び順が「出てくる順番」**（見分けやすい → 見分けにくい）。
 * 各難易度は先頭から決まった数だけ出て、プレイが進むと後ろの種類が加わる（詳細設計 17.2）。
 */
export interface ArtifactDef {
  id: string;
  category: Category;
  name: string;
}

export const ARTIFACTS: readonly ArtifactDef[] = [
  // はにわ（出てくる順）
  { id: 'h_cylinder', category: 'haniwa', name: '円筒埴輪' },
  { id: 'h_house', category: 'haniwa', name: '家形埴輪' },
  { id: 'h_horse', category: 'haniwa', name: '馬形埴輪' },
  { id: 'h_shield', category: 'haniwa', name: '盾形埴輪' },
  { id: 'h_chicken', category: 'haniwa', name: '鶏形埴輪' },
  { id: 'h_dog', category: 'haniwa', name: '犬形埴輪' },
  { id: 'h_bujin', category: 'haniwa', name: '挂甲武人埴輪' },
  { id: 'h_miko', category: 'haniwa', name: '人物埴輪（巫女）' },
  { id: 'h_boat', category: 'haniwa', name: '船形埴輪' },
  { id: 'h_deer', category: 'haniwa', name: '鹿形埴輪' },
  { id: 'h_rikishi', category: 'haniwa', name: '力士埴輪' },
  { id: 'h_waterfowl', category: 'haniwa', name: '水鳥形埴輪' },
  { id: 'h_boar', category: 'haniwa', name: '猪形埴輪' },
  { id: 'h_falconer', category: 'haniwa', name: '鷹匠埴輪' },
  { id: 'h_dancer', category: 'haniwa', name: '踊る人々（人物埴輪）' },
  { id: 'h_asagao', category: 'haniwa', name: '朝顔形埴輪' },
  // 土偶（出てくる順）
  { id: 'd_shakoki', category: 'dogu', name: '遮光器土偶' },
  { id: 'd_heart', category: 'dogu', name: 'ハート形土偶' },
  { id: 'd_mimizuku', category: 'dogu', name: 'みみずく土偶' },
  { id: 'd_gassho', category: 'dogu', name: '合掌土偶' },
  { id: 'd_venus', category: 'dogu', name: '妊婦形土偶（縄文のビーナス型）' },
  { id: 'd_kamen', category: 'dogu', name: '仮面土偶（仮面の女神型）' },
  { id: 'd_itajo', category: 'dogu', name: '板状土偶' },
  { id: 'd_yamagata', category: 'dogu', name: '山形土偶' },
  { id: 'd_chuku', category: 'dogu', name: '中空土偶' },
  { id: 'd_hoji', category: 'dogu', name: '抱児土偶（子を抱く土偶）' },
  { id: 'd_megami', category: 'dogu', name: '立像土偶（縄文の女神型）' },
  { id: 'd_kappa', category: 'dogu', name: '河童形土偶' },
  { id: 'd_kekkatsu', category: 'dogu', name: '結髪土偶' },
  { id: 'd_dejiri', category: 'dogu', name: '出尻土偶' },
  { id: 'd_kussetsu', category: 'dogu', name: '屈折像土偶（しゃがむ土偶）' },
  { id: 'd_tsutsu', category: 'dogu', name: '筒形土偶' },
];

export const CATEGORY_NAME: Record<Category, string> = { haniwa: 'はにわ', dogu: '土偶' };

/** 分類ごとの一覧（出てくる順） */
export function variantsOf(category: Category): ArtifactDef[] {
  return ARTIFACTS.filter((a) => a.category === category);
}

/** その種類が最初に出てくる難易度（遊び方の一覧に添える。詳細設計 17.6） */
export function firstDifficultyOf(id: string): Difficulty {
  const a = ARTIFACTS.find((x) => x.id === id);
  if (!a) return 'extreme';
  const index = variantsOf(a.category).indexOf(a);
  return DIFFICULTY_ORDER.find((d) => index < DIFFICULTIES[d].maxVariants) ?? 'extreme';
}
