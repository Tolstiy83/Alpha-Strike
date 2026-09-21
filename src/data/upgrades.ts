export type UpgradeId =
  | 'rapid-fire'
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

  'add-troop': {
    id: 'add-troop',
    name: '+1 Troop',
    cardLabel: '+1\nTROOP',
    description:
      'Soldier joined your squad!',
  },
};

export const UPGRADE_POOL:
  UpgradeId[] = [
    'rapid-fire',
    'add-troop',
  ];