export type Dimension = 'energy' | 'curiosity' | 'empathy' | 'flexibility' | 'action';
export type ChoiceIndex = 0 | 1 | 2 | 3;
export interface Question { id: number; dimension: Dimension; scene: string; title: string; options: [string, string, string, string] }
export interface Pokemon { id: number; name: string; english: string; code: string; type: string; color: string; accent: string; title: string; tags: string[]; description: string; strength: string; tip: string; partner: number; partnerReason: string; clashPartner: number; clashReason: string; lore: string; likeness: string; moments: string[] }
export type Scores = Record<Dimension, number>;
