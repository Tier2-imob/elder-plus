import type MaterialIcons from '@expo/vector-icons/MaterialIcons'

import { TASK_CATEGORIES, type Task, type TaskCategory } from '@/components/care/types'
import type { TaskDoc } from '@/services/firebase/types'
import { dayLabel, resolveDayKey } from '@/services/week'

function isTaskCategory(value: string | undefined): value is TaskCategory {
  return value !== undefined && value in TASK_CATEGORIES
}

/**
 * Map a Firestore TaskDoc to the screen's Task. The icon cast is sound because tasks are created
 * with TASK_CATEGORIES icons, which are real MaterialIcons glyph keys.
 *
 * `names` maps active circle members (uid → current name): an assignee who left the circle (or a
 * pre-circle assignment by name only) shows as unassigned.
 */
export function toTask(doc: TaskDoc, names: Map<string, string>, now: Date = new Date()): Task {
  // Tasks saved before the app followed the calendar ('wed'…) read as that day of the current week.
  const dayKey = resolveDayKey(doc.dayKey, now)
  return {
    id: doc.id,
    dayKey,
    title: doc.title,
    time: doc.time,
    day: dayLabel(dayKey),
    icon: doc.icon as keyof typeof MaterialIcons.glyphMap,
    assigneeId: doc.assigneeId && names.has(doc.assigneeId) ? doc.assigneeId : undefined,
    assignee: doc.assigneeId ? names.get(doc.assigneeId) : undefined,
    category: isTaskCategory(doc.category) ? doc.category : undefined,
    description: doc.description,
    createdAt: doc.createdAt ? doc.createdAt.toDate() : null,
    createdBy: doc.createdBy?.name,
  }
}
