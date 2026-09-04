import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load initial data from JSON
let activities = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'sample_schedule.json'), 'utf-8')
);

export const scheduleStore = {
  // Get all activities, optionally filtered
  getAll(filters = {}) {
    let result = [...activities];
    if (filters.discipline) result = result.filter(a => a.discipline === filters.discipline);
    if (filters.status) result = result.filter(a => a.status === filters.status);
    if (filters.zone) result = result.filter(a => a.location_zone === filters.zone);
    return result;
  },

  // Get single activity by ID
  getById(activityId) {
    return activities.find(a => a.activity_id === activityId) || null;
  },

  // Update actual dates and status for an activity
  updateActuals(activityId, { actual_start, actual_end, status, percent_complete }) {
    const idx = activities.findIndex(a => a.activity_id === activityId);
    if (idx === -1) return null;
    if (actual_start !== undefined) activities[idx].actual_start = actual_start;
    if (actual_end !== undefined) activities[idx].actual_end = actual_end;
    if (status !== undefined) activities[idx].status = status;
    if (percent_complete !== undefined) activities[idx].percent_complete = percent_complete;
    return activities[idx];
  },

  // Get analytics summary
  getAnalytics() {
    const total = activities.length;
    const completed = activities.filter(a => a.status === 'Completed').length;
    const inProgress = activities.filter(a => a.status === 'In Progress').length;
    const notStarted = activities.filter(a => a.status === 'Not Started').length;
    
    // Calculate delayed activities (actual_end > planned_end)
    const delayed = activities.filter(a => {
      if (a.actual_end && a.planned_end) {
        return new Date(a.actual_end) > new Date(a.planned_end);
      }
      return false;
    }).length;

    // Discipline-wise breakdown
    const disciplines = [...new Set(activities.map(a => a.discipline))];
    const byDiscipline = disciplines.map(d => {
      const acts = activities.filter(a => a.discipline === d);
      const dCompleted = acts.filter(a => a.status === 'Completed').length;
      const dDelayed = acts.filter(a => {
        if (a.actual_end && a.planned_end) {
          return new Date(a.actual_end) > new Date(a.planned_end);
        }
        return false;
      }).length;
      
      // Average delay in days for delayed activities
      const delayDays = acts
        .filter(a => a.actual_end && a.planned_end && new Date(a.actual_end) > new Date(a.planned_end))
        .map(a => {
          const diff = new Date(a.actual_end) - new Date(a.planned_end);
          return diff / (1000 * 60 * 60 * 24);
        });
      const avgDelay = delayDays.length > 0 
        ? (delayDays.reduce((s, d) => s + d, 0) / delayDays.length).toFixed(1) 
        : 0;

      return {
        discipline: d,
        total: acts.length,
        completed: dCompleted,
        delayed: dDelayed,
        avgDelayDays: parseFloat(avgDelay)
      };
    });

    return { total, completed, inProgress, notStarted, delayed, byDiscipline };
  },

  // Replace all activities (for schedule upload)
  replaceAll(newActivities) {
    activities = newActivities;
    return activities.length;
  },

  // Get unique discipline names
  getDisciplines() {
    return [...new Set(activities.map(a => a.discipline))];
  },

  // Search by activity name (partial match)
  search(query) {
    const q = query.toLowerCase();
    return activities.filter(a => a.activity_name.toLowerCase().includes(q));
  }
};
