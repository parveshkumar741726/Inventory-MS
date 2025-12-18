const AuditLog = require('../models/AuditLog');

const createAuditLog = async ({
  user,
  action,
  entity,
  entityId,
  changes,
  ipAddress,
  userAgent,
  description,
}) => {
  try {
    await AuditLog.create({
      user,
      action,
      entity,
      entityId,
      changes,
      ipAddress,
      userAgent,
      description,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = { createAuditLog };
