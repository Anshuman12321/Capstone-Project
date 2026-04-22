export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'G' | 'F' | 'UTIL'

export type StandingRow = {
  rank: number
  team: string
  owner: string
  w: number
  l: number
  t: number
  pf: number
  pa: number
  streak: string
}

export const standings: StandingRow[] = [
  { rank: 1, team: 'Midnight Ballers', owner: 'You', w: 9, l: 2, t: 0, pf: 1421.4, pa: 1188.2, streak: 'W3' },
  { rank: 2, team: 'Hoop Dreams', owner: 'Sam K.', w: 8, l: 3, t: 0, pf: 1388.0, pa: 1292.5, streak: 'W1' },
  { rank: 3, team: 'Alley Oop HQ', owner: 'Jordan P.', w: 7, l: 4, t: 0, pf: 1310.2, pa: 1265.0, streak: 'L1' },
  { rank: 4, team: 'Paint Protectors', owner: 'Alex R.', w: 6, l: 5, t: 0, pf: 1288.7, pa: 1301.3, streak: 'W2' },
  { rank: 5, team: 'Fastbreak Flyers', owner: 'Casey M.', w: 5, l: 6, t: 0, pf: 1201.0, pa: 1244.8, streak: 'L2' },
  { rank: 6, team: 'Bench Mob', owner: 'Riley T.', w: 4, l: 7, t: 0, pf: 1156.3, pa: 1288.0, streak: 'L4' },
  { rank: 7, team: 'Glass Cleaners', owner: 'Morgan L.', w: 3, l: 8, t: 0, pf: 1098.5, pa: 1320.4, streak: 'W1' },
  { rank: 8, team: 'Free Throw Ghosts', owner: 'Taylor B.', w: 2, l: 9, t: 0, pf: 1042.1, pa: 1355.2, streak: 'L3' },
]

export type RosterSlot = {
  slot: string
  player: string
  pos: Position | 'BN'
  nbaTeam: string
  proj?: number
}

export const starters: RosterSlot[] = [
  { slot: 'PG', player: 'Luka Doncic', pos: 'PG', nbaTeam: 'DAL', proj: 32.4 },
  { slot: 'SG', player: 'Devin Booker', pos: 'SG', nbaTeam: 'PHX', proj: 27.8 },
  { slot: 'SF', player: 'Jayson Tatum', pos: 'SF', nbaTeam: 'BOS', proj: 26.2 },
  { slot: 'PF', player: 'Giannis Antetokounmpo', pos: 'PF', nbaTeam: 'MIL', proj: 30.9 },
  { slot: 'C', player: 'Nikola Jokic', pos: 'C', nbaTeam: 'DEN', proj: 29.5 },
  { slot: 'G', player: 'Shai Gilgeous-Alexander', pos: 'PG', nbaTeam: 'OKC', proj: 31.2 },
  { slot: 'F', player: 'Kevin Durant', pos: 'SF', nbaTeam: 'PHX', proj: 28.1 },
  { slot: 'UTIL', player: 'Anthony Davis', pos: 'PF', nbaTeam: 'LAL', proj: 27.0 },
]

export const bench: RosterSlot[] = [
  { slot: 'BN', player: 'Tyrese Maxey', pos: 'PG', nbaTeam: 'PHI', proj: 24.4 },
  { slot: 'BN', player: 'Jaylen Brown', pos: 'SG', nbaTeam: 'BOS', proj: 22.8 },
  { slot: 'BN', player: 'Lauri Markkanen', pos: 'PF', nbaTeam: 'UTA', proj: 23.2 },
]

export type DraftPlayer = {
  rank: number
  name: string
  pos: Position
  team: string
  adp: number
}

export const draftBoard: DraftPlayer[] = [
  { rank: 1, name: 'Nikola Jokic', pos: 'C', team: 'DEN', adp: 1.2 },
  { rank: 2, name: 'Luka Doncic', pos: 'PG', team: 'DAL', adp: 2.1 },
  { rank: 3, name: 'Giannis Antetokounmpo', pos: 'PF', team: 'MIL', adp: 3.4 },
  { rank: 4, name: 'Shai Gilgeous-Alexander', pos: 'PG', team: 'OKC', adp: 4.0 },
  { rank: 5, name: 'Jayson Tatum', pos: 'SF', team: 'BOS', adp: 5.2 },
  { rank: 6, name: 'Joel Embiid', pos: 'C', team: 'PHI', adp: 6.0 },
  { rank: 7, name: 'Tyrese Haliburton', pos: 'PG', team: 'IND', adp: 7.1 },
  { rank: 8, name: 'Anthony Edwards', pos: 'SG', team: 'MIN', adp: 8.5 },
  { rank: 9, name: 'Kevin Durant', pos: 'PF', team: 'PHX', adp: 9.3 },
  { rank: 10, name: 'Devin Booker', pos: 'SG', team: 'PHX', adp: 10.1 },
]
