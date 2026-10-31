export type Hands = 'paysan' | 'enfant' | 'fines' | 'mycelium' | 'mycelium2';

export interface Character {
  id: string;
  portrait: string;
  hands: Hands;
  /** Villagers can be random clients, fall sick, die or be infected. */
  villager: boolean;
}

export const CHARACTERS: Character[] = [
  { id: 'gaudin', portrait: 'pt_gaudin', hands: 'paysan', villager: true },
  { id: 'tissot', portrait: 'pt_vieillard', hands: 'paysan', villager: true },
  { id: 'mariette', portrait: 'pt_paysanne', hands: 'paysan', villager: true },
  { id: 'gaspard', portrait: 'pt_jeune', hands: 'paysan', villager: true },
  { id: 'bonnefoy', portrait: 'pt_meuniere', hands: 'paysan', villager: true },
  { id: 'bucheron', portrait: 'pt_bucheron', hands: 'paysan', villager: true },
  { id: 'institutrice', portrait: 'pt_institutrice', hands: 'fines', villager: true },
  { id: 'cure', portrait: 'pt_cure', hands: 'fines', villager: true },
  { id: 'docteur', portrait: 'pt_docteur', hands: 'fines', villager: true },
  { id: 'lison', portrait: 'pt_lison', hands: 'enfant', villager: false },
  { id: 'garde', portrait: 'pt_garde', hands: 'paysan', villager: false },
  { id: 'valet', portrait: 'pt_valet', hands: 'fines', villager: false },
  { id: 'cueilleur', portrait: 'pt_cueilleur', hands: 'mycelium', villager: false },
  { id: 'cueilleuse', portrait: 'pt_cueilleuse', hands: 'mycelium2', villager: false },
];

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export const VILLAGERS = CHARACTERS.filter((c) => c.villager).map((c) => c.id);
