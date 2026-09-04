// Default initial project dataset
const INITIAL_TASKS = [
  {
    id: 'TSK-0101',
    wbs: 'WBS-1.1',
    name: 'Site Survey & Land Acquisition',
    baselineStart: '2026-01-05',
    baselineEnd: '2026-02-15',
    actualProgress: 100,
    plannedProgress: 100,
    varianceDays: 0,
    status: 'Completed',
    criticalPath: true,
  },
  {
    id: 'TSK-0102',
    wbs: 'WBS-1.2',
    name: 'Pipeline Trenching - Sector 4',
    baselineStart: '2026-02-16',
    baselineEnd: '2026-04-10',
    actualProgress: 45,
    plannedProgress: 60,
    varianceDays: -12,
    status: 'Delayed',
    criticalPath: true,
  },
  {
    id: 'TSK-0103',
    wbs: 'WBS-2.1',
    name: 'High-Voltage Cable Laying',
    baselineStart: '2026-04-01',
    baselineEnd: '2026-06-30',
    actualProgress: 25,
    plannedProgress: 25,
    varianceDays: 0,
    status: 'On Track',
    criticalPath: false,
  },
  {
    id: 'TSK-0104',
    wbs: 'WBS-2.2',
    name: 'Foundation Concrete Pouring - Station B',
    baselineStart: '2026-06-01',
    baselineEnd: '2026-09-30',
    actualProgress: 10,
    plannedProgress: 15,
    varianceDays: -3,
    status: 'Warning',
    criticalPath: false,
  },
];

// Helper to retrieve tasks from LocalStorage
const getStoredTasks = () => {
  const data = localStorage.getItem('sih_infra_tasks');
  if (!data) {
    localStorage.setItem('sih_infra_tasks', JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  return JSON.parse(data);
};

export const mockApi = {
  // Fetch all tasks with live progress
  getTasks: async () => {
    await new Promise((res) => setTimeout(res, 300)); // Simulate network latency
    return getStoredTasks();
  },

  // Calculate executive KPI metrics dynamically based on active task progress
  getDashboardMetrics: async () => {
    const tasks = getStoredTasks();
    const totalPlanned = tasks.reduce((sum, t) => sum + t.plannedProgress, 0) / tasks.length;
    const totalActual = tasks.reduce((sum, t) => sum + t.actualProgress, 0) / tasks.length;
    const scheduleVariance = (totalActual - totalPlanned).toFixed(1);
    const spi = (totalActual / (totalPlanned || 1)).toFixed(2);

    return {
      plannedCompletion: `${Math.round(totalPlanned)}%`,
      actualExecution: `${Math.round(totalActual)}%`,
      scheduleVariance: `${scheduleVariance}%`,
      spiIndex: spi,
      delayedTasksCount: tasks.filter((t) => t.status === 'Delayed').length,
    };
  },

  // Log new field progress from site engineer & update schedule linking
  submitFieldReport: async (reportData) => {
    await new Promise((res) => setTimeout(res, 500));
    const tasks = getStoredTasks();

    const updatedTasks = tasks.map((task) => {
      if (task.id === reportData.taskId) {
        const newActual = Number(reportData.completionPercentage);
        const variance = newActual - task.plannedProgress;
        
        let newStatus = 'On Track';
        if (newActual === 100) newStatus = 'Completed';
        else if (variance < -10) newStatus = 'Delayed';
        else if (variance < 0) newStatus = 'Warning';

        return {
          ...task,
          actualProgress: newActual,
          varianceDays: variance < 0 ? Math.round(variance * 0.5) : 0,
          status: newStatus,
          lastReport: {
            timestamp: new Date().toISOString(),
            materialUsed: reportData.materialUsed,
            notes: reportData.fieldNotes,
            coords: { lat: reportData.latitude, lng: reportData.longitude },
          },
        };
      }
      return task;
    });

    localStorage.setItem('sih_infra_tasks', JSON.stringify(updatedTasks));
    return { success: true, timestamp: new Date().toISOString() };
  },

  // Reset demo data back to default
  resetData: () => {
    localStorage.setItem('sih_infra_tasks', JSON.stringify(INITIAL_TASKS));
  },
};