import type { Category } from '../core/types';

/**
 * 出土品の一覧（詳細設計 第9章）。
 * 種類を足すときは、ここに1行足し、src/render/art/ に同じ id の絵を足す。
 * はにわ＝古墳時代、土偶＝縄文時代。分類が境界的なもの（土面・岩偶・土偶形容器など）は入れない。
 */
export interface ArtifactDef {
  id: string;
  category: Category;
  name: string;
}

export const ARTIFACTS: readonly ArtifactDef[] = [
  { id: 'h_miko', category: 'haniwa', name: '人物埴輪（巫女）' },
  { id: 'h_bujin', category: 'haniwa', name: '挂甲武人埴輪' },
  { id: 'h_horse', category: 'haniwa', name: '馬形埴輪' },
  { id: 'h_dog', category: 'haniwa', name: '犬形埴輪' },
  { id: 'h_chicken', category: 'haniwa', name: '鶏形埴輪' },
  { id: 'h_house', category: 'haniwa', name: '家形埴輪' },
  { id: 'h_cylinder', category: 'haniwa', name: '円筒埴輪' },
  { id: 'h_shield', category: 'haniwa', name: '盾形埴輪' },
  { id: 'd_shakoki', category: 'dogu', name: '遮光器土偶' },
  { id: 'd_heart', category: 'dogu', name: 'ハート形土偶' },
  { id: 'd_itajo', category: 'dogu', name: '板状土偶' },
  { id: 'd_venus', category: 'dogu', name: '妊婦形土偶（縄文のビーナス型）' },
  { id: 'd_kamen', category: 'dogu', name: '仮面土偶（仮面の女神型）' },
  { id: 'd_gassho', category: 'dogu', name: '合掌土偶' },
  { id: 'd_mimizuku', category: 'dogu', name: 'みみずく土偶' },
  { id: 'd_yamagata', category: 'dogu', name: '山形土偶' },
];

export const CATEGORY_NAME: Record<Category, string> = { haniwa: 'はにわ', dogu: '土偶' };

export function variantsOf(category: Category): ArtifactDef[] {
  return ARTIFACTS.filter((a) => a.category === category);
}
