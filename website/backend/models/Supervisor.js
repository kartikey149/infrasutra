import mongoose from 'mongoose';

/**
 * Supervisor Mongoose Schema
 * 
 * BUG FIX EXPLANATION:
 * Previously, when creating a new supervisor without an explicit projects array,
 * systems or queries would either populate all projects or assign default project references.
 * By explicitly setting `type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }]`
 * with `default: []`, Mongoose guarantees that whenever a supervisor document is instantiated,
 * their `projects` field is strictly initialized to an empty array ([]) with zero assigned projects.
 */
const supervisorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supervisor name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      default: 'supervisor',
      enum: ['supervisor', 'planner', 'admin'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    specialization: {
      type: String,
      trim: true,
      default: 'Civil & Pipeline',
    },
    // CRITICAL BUG FIX: Ensure projects array strictly defaults to []
    projects: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Project',
        },
      ],
      default: [], // Zero projects assigned upon supervisor creation
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose OverwriteModelError in serverless / hot-reload environments
export const Supervisor =
  mongoose.models.Supervisor || mongoose.model('Supervisor', supervisorSchema);

export default Supervisor;
