import { dashboardHandlers } from './dashboard'
import { dogHandlers } from './dogs'
import { foodHandlers } from './foods'
import { feedingPlanHandlers } from './feeding-plans'
import { feedingLogHandlers } from './feeding-logs'
import { supplementHandlers } from './supplements'
import { dogSupplementHandlers } from './dog-supplements'
import { supplementLogHandlers } from './supplement-logs'
import { healthNoteHandlers } from './health-notes'
import { historyHandlers } from './history'

export const handlers = [
  ...dashboardHandlers,
  ...dogHandlers,
  ...foodHandlers,
  ...feedingPlanHandlers,
  ...feedingLogHandlers,
  ...supplementHandlers,
  ...dogSupplementHandlers,
  ...supplementLogHandlers,
  ...healthNoteHandlers,
  ...historyHandlers,
]
