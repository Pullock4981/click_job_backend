import User from '../models/User.js';

// @desc    Issue warning to user
// @param   userId - User ID
// @param   reason - Warning reason
// @returns Updated account health
export const issueWarning = async (userId, reason) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Add warning
    if (!user.accountHealth) {
      user.accountHealth = {
        percentage: 100,
        warnings: [],
        lastWarningAt: null,
      };
    }

    user.accountHealth.warnings.push({
      reason,
      issuedAt: new Date(),
      status: 'active',
    });

    user.accountHealth.lastWarningAt = new Date();

    // Calculate new health percentage
    const activeWarnings = user.accountHealth.warnings.filter(
      (w) => w.status === 'active'
    ).length;
    user.accountHealth.percentage = Math.max(0, 100 - activeWarnings * 10);

    await user.save();

    // Check if account should be banned (3 warnings = 70% health)
    if (user.accountHealth.percentage <= 70 && activeWarnings >= 3) {
      // You can add account ban logic here
      console.log(`Account ${userId} should be banned - 3 warnings reached`);
    }

    return user.accountHealth;
  } catch (error) {
    console.error('Error issuing warning:', error);
    return null;
  }
};

// @desc    Resolve warning
// @param   userId - User ID
// @param   warningId - Warning ID to resolve
// @returns Updated account health
export const resolveWarning = async (userId, warningId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.accountHealth) return null;

    const warning = user.accountHealth.warnings.id(warningId);
    if (warning) {
      warning.status = 'resolved';
      warning.resolvedAt = new Date();

      // Recalculate health percentage
      const activeWarnings = user.accountHealth.warnings.filter(
        (w) => w.status === 'active'
      ).length;
      user.accountHealth.percentage = Math.max(0, 100 - activeWarnings * 10);

      await user.save();
    }

    return user.accountHealth;
  } catch (error) {
    console.error('Error resolving warning:', error);
    return null;
  }
};

// @desc    Calculate account health percentage
// @param   user - User object
// @returns Health percentage
export const calculateHealth = (user) => {
  if (!user.accountHealth || !user.accountHealth.warnings) {
    return 100;
  }

  const activeWarnings = user.accountHealth.warnings.filter(
    (w) => w.status === 'active'
  ).length;

  return Math.max(0, 100 - activeWarnings * 10);
};

