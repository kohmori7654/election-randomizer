export interface PrefectureGridItem {
  name: string
  short: string
  row: number
  col: number
  w?: number
  h?: number
  offsetX?: number
}

// 47都道府県のデフォルメグリッド座標
// 参考: memo/japan_map3.png
// row: 上=0 (北), 下=最大 (南)
// col: 左=0 (西), 右=最大 (東)
// 北海道(右上) → 沖縄(左下) の対角線配置
export const PREFECTURE_GRID: PrefectureGridItem[] = [
  // 北海道
  { name: '北海道',   short: '北海道', row:  0, col: 11, w: 2, h: 2 },

  // 東北
  { name: '青森県',   short: '青森',   row:  3, col: 10, w: 2 },
  { name: '秋田県',   short: '秋田',   row:  4, col:  9 },
  { name: '岩手県',   short: '岩手',   row:  4, col: 10, w: 2 },
  { name: '山形県',   short: '山形',   row:  5, col:  9 },
  { name: '宮城県',   short: '宮城',   row:  5, col: 10, w: 2 },

  // 新潟・福島
  { name: '新潟県',   short: '新潟',   row:  6, col:  8, w: 2 },
  { name: '福島県',   short: '福島',   row:  6, col: 10, w: 2 },

  // 北陸・甲信越（北）・関東北（参考: japan_map3.png）
  // 群馬/栃木/茨城 を福島の直下 row:7 に配置して空白解消
  { name: '福井県',   short: '福井',   row:  7, col:  6 },
  { name: '石川県',   short: '石川',   row:  7, col:  7 },
  { name: '富山県',   short: '富山',   row:  7, col:  8 },
  { name: '岐阜県',   short: '岐阜',   row:  7, col:  9,        h: 2 },
  { name: '群馬県',   short: '群馬',   row:  7, col: 10 },
  { name: '栃木県',   short: '栃木',   row:  7, col: 11 },
  { name: '茨城県',   short: '茨城',   row:  7, col: 12 },

  // 九州北・中国山陰・近畿北・甲信越・関東中
  { name: '長崎県',   short: '長崎',   row:  8, col:  0, offsetX: -20 },
  { name: '佐賀県',   short: '佐賀',   row:  8, col:  1, offsetX: -20 },
  { name: '福岡県',   short: '福岡',   row:  8, col:  2, offsetX: -20 },
  { name: '山口県',   short: '山口',   row:  8, col:  3 },
  { name: '島根県',   short: '島根',   row:  8, col:  4 },
  { name: '鳥取県',   short: '鳥取',   row:  8, col:  5 },
  { name: '京都府',   short: '京都',   row:  8, col:  6 },
  { name: '滋賀県',   short: '滋賀',   row:  8, col:  7 },
  { name: '長野県',   short: '長野',   row:  8, col:  8,        h: 2 },
  { name: '山梨県',   short: '山梨',   row:  8, col: 10 },
  { name: '埼玉県',   short: '埼玉',   row:  8, col: 11 },
  { name: '千葉県',   short: '千葉',   row:  8, col: 12 },

  // 九州・中国山陽・近畿・東海・関東南
  { name: '熊本県',   short: '熊本',   row:  9, col:  1, offsetX: -20 },
  { name: '大分県',   short: '大分',   row:  9, col:  2, offsetX: -20 },
  { name: '広島県',   short: '広島',   row:  9, col:  3 },
  { name: '岡山県',   short: '岡山',   row:  9, col:  4 },
  { name: '兵庫県',   short: '兵庫',   row:  9, col:  5,        h: 2 },
  { name: '大阪府',   short: '大阪',   row:  9, col:  6 },
  { name: '三重県',   short: '三重',   row:  9, col:  7 },
  { name: '静岡県',   short: '静岡',   row:  9, col:  9,        h: 2 },
  { name: '神奈川県', short: '神奈川', row:  9, col: 10 },
  { name: '東京都',   short: '東京',   row:  9, col: 11 },

  // 九州南・四国・近畿南・東海
  { name: '鹿児島県', short: '鹿児島', row: 10, col:  1,        h: 2, offsetX: -20 },
  { name: '宮崎県',   short: '宮崎',   row: 10, col:  2,        h: 2, offsetX: -20 },
  { name: '愛媛県',   short: '愛媛',   row: 11, col:  3 },
  { name: '香川県',   short: '香川',   row: 11, col:  4 },
  { name: '奈良県',   short: '奈良',   row: 10, col:  6 },
  { name: '愛知県',   short: '愛知',   row: 10, col:  8 },

  // 沖縄・四国南・近畿極南
  { name: '沖縄県',   short: '沖縄',   row: 12, col:  0 },
  { name: '高知県',   short: '高知',   row: 12, col:  3 },
  { name: '徳島県',   short: '徳島',   row: 12, col:  4 },
  { name: '和歌山県', short: '和歌山', row: 11, col:  6 },
]
