const { admin } = require('../config/firebase');
const User = require('../models/User');
const Notification = require('../models/Notification');
// ─── Send notification to a single user by userId ────────────────────────────
const sendNotificationToUser = async (userId, { title, body, data = {} }) => {
  try {
    const user = await User.findById(userId).select('fcmToken');

    if (!user || !user.fcmToken) {
      console.log(`⚠️  No FCM token for user ${userId}`);
      return null;
    }

    const message = {
      token: user.fcmToken,
      notification: { title, body },
      data: {
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'rescueride_channel',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Notification sent to ${userId}:`, title);
    return response;
  } catch (error) {
    console.error(`❌ Notification error for ${userId}:`, error.message);
    return null;
  }
};

// ─── Send to multiple users ───────────────────────────────────────────────────
const sendNotificationToMany = async (userIds, notification) => {
  const promises = userIds.map((id) => sendNotificationToUser(id, notification));
  return Promise.allSettled(promises);
};

// ─── Predefined notification templates ───────────────────────────────────────

// To customer: new offer received
const notifyNewOffer = (customerId, { rescuerName, counterFare, requestId }) =>
  sendNotificationToUser(customerId, {
    title: '🚗 New Offer Received!',
    body: `${rescuerName} offered PKR ${counterFare} for your request`,
    data: { type: 'new_offer', requestId },
  });

// To rescuer: offer was accepted
const notifyOfferAccepted = (rescuerId, { customerName, finalFare, requestId }) =>
  sendNotificationToUser(rescuerId, {
    title: '✅ Offer Accepted!',
    body: `${customerName} accepted your offer of PKR ${finalFare}`,
    data: { type: 'offer_accepted', requestId },
  });

// To rescuer: new service request nearby
const notifyNewRequest = (rescuerId, { problemType, offeredFare, requestId }) =>
  sendNotificationToUser(rescuerId, {
    title: '🆘 New Request Nearby!',
    body: `${problemType} — Customer offering PKR ${offeredFare}`,
    data: { type: 'new_request', requestId },
  });

// To customer: rescuer is on the way
const notifyRescuerOnWay = (customerId, { rescuerName, requestId }) =>
  sendNotificationToUser(customerId, {
    title: '🚀 Rescuer On The Way!',
    body: `${rescuerName} is heading to your location`,
    data: { type: 'rescuer_on_way', requestId },
  });

// To customer: job completed
const notifyJobCompleted = (customerId, { requestId }) =>
  sendNotificationToUser(customerId, {
    title: '✅ Job Completed!',
    body: 'Your request has been completed. Please rate your rescuer.',
    data: { type: 'job_completed', requestId },
  });

// To rescuer: request cancelled
const notifyRequestCancelled = (rescuerId, { requestId }) =>
  sendNotificationToUser(rescuerId, {
    title: '❌ Request Cancelled',
    body: 'The customer has cancelled their request.',
    data: { type: 'request_cancelled', requestId },
  });

// To rescuer: account approved
const notifyAccountApproved = (rescuerId) =>
  sendNotificationToUser(rescuerId, {
    title: '🎉 Account Approved!',
    body: 'Your RescueRide account is approved. You can now go online!',
    data: { type: 'account_approved' },
  });

// To rescuer: account rejected
const notifyAccountRejected = (rescuerId, { reason }) =>
  sendNotificationToUser(rescuerId, {
    title: '❌ Account Rejected',
    body: reason || 'Your account was rejected. Please resubmit your documents.',
    data: { type: 'account_rejected' },
  });
  // ─── Save notification to database ───────────────────────────────────────────
const saveNotification = async (userId, { title, body, type, requestId }) => {
  try {
    await Notification.create({
      user: userId,
      title,
      body,
      type: type || 'new_offer',
      requestId: requestId || null,
    });
  } catch (error) {
    console.error('Save notification error:', error.message);
  }
};

module.exports = {
  sendNotificationToUser,
  sendNotificationToMany,
  notifyNewOffer,
  notifyOfferAccepted,
  notifyNewRequest,
  notifyRescuerOnWay,
  notifyJobCompleted,
  notifyRequestCancelled,
  notifyAccountApproved,
  notifyAccountRejected,
  saveNotification,
};