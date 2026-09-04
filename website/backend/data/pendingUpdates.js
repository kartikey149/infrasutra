// In-memory store for AI-generated updates awaiting planner approval
let pendingUpdates = [];
let updateIdCounter = 1;

export const pendingStore = {
  // Add a new pending update
  add({ raw_input, extracted_data, matched_activity, confidence, source_type }) {
    const update = {
      id: updateIdCounter++,
      raw_input,
      extracted_data,
      matched_activity,
      confidence,
      source_type, // 'voice', 'text', 'pdf', 'excel'
      status: 'pending', // 'pending', 'approved', 'rejected'
      created_at: new Date().toISOString(),
      reviewed_at: null,
      rejection_reason: null
    };
    pendingUpdates.unshift(update);
    return update;
  },

  // Get all updates, optionally filtered by status
  getAll(status = null) {
    if (status) return pendingUpdates.filter(u => u.status === status);
    return [...pendingUpdates];
  },

  // Get by ID
  getById(id) {
    return pendingUpdates.find(u => u.id === id) || null;
  },

  // Approve update
  approve(id) {
    const idx = pendingUpdates.findIndex(u => u.id === id);
    if (idx === -1) return null;
    pendingUpdates[idx].status = 'approved';
    pendingUpdates[idx].reviewed_at = new Date().toISOString();
    return pendingUpdates[idx];
  },

  // Reject update
  reject(id, reason = '') {
    const idx = pendingUpdates.findIndex(u => u.id === id);
    if (idx === -1) return null;
    pendingUpdates[idx].status = 'rejected';
    pendingUpdates[idx].reviewed_at = new Date().toISOString();
    pendingUpdates[idx].rejection_reason = reason;
    return pendingUpdates[idx];
  },

  // Get summary counts
  getSummary() {
    return {
      total: pendingUpdates.length,
      pending: pendingUpdates.filter(u => u.status === 'pending').length,
      approved: pendingUpdates.filter(u => u.status === 'approved').length,
      rejected: pendingUpdates.filter(u => u.status === 'rejected').length
    };
  }
};
