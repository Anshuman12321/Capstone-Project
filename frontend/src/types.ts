export type AuthUser = {
  user_id: string
  username: string
}

export type FantasyStanding = {
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  streak: string
}

export type Team = {
  team_id: string
  owner_user_id: string
  name: string
  roster_player_ids: string[]
}

export type SimulationEvent = {
  event_id: string
  type: 'injury' | 'game_outcome' | 'role_change' | 'note'
  week: number
  created_at: string
  player_id: string | null
  team_id: string | null
  payload: Record<string, string | number | boolean>
}

export type Game = {
  game_id: string
  name: string
  status: 'lobby' | 'drafting' | 'in_progress' | 'completed'
  current_week: number
  owner_user_id: string | null
  user_ids: string[]
  teams_by_user_id: Record<string, Team>
  standings: Record<string, FantasyStanding>
  simulation_events: SimulationEvent[]
}
