export type UpgradeId =
  | 'rapid-fire'
  | 'heavy-rounds'
  | 'add-troop';

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  cardLabel: string;
  description: string;
}

export const UPGRADES:
  Record<UpgradeId, UpgradeDefinition> = {

  'rapid-fire': {
    id: 'rapid-fire',
    name: 'Rapid Fire',
    cardLabel: 'RAPID\nFIRE',
    description: 'Fire Rate +20%',
  },
  
  'heavy-rounds': {
    id: 'heavy-rounds',
    name: 'Heavy Rounds',
    cardLabel: 'HEAVY\nROUNDS',
    description: 'Bullet Damage +1',
  },

  'add-troop': {
    id: 'add-troop',
    name: '+1 Troop',
    cardLabel: '+1\nTROOP',
    description:
      'A soldier joined your squad!',
  },
};

export const UPGRADE_POOL:
  UpgradeId[] = [
    'rapid-fire',
    'heavy-rounds',
    'add-troop',
  ];