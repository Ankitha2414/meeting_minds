// Scripts for firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with MeetingMind Firebase Project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCV1ZN1r3r5fZasb8FhrMO0hJdbfvbJCv0",
  authDomain: "meetingminds-f8ce2.firebaseapp.com",
  projectId: "meetingminds-f8ce2",
  storageBucket: "meetingminds-f8ce2.appspot.com",
  messagingSenderId: "405388418864",
  appId: "1:405388418864:web:50f6c8f4af63f654ddb2f5",
};

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  const notificationTitle = payload.notification?.title || 'MeetingMind: Task Overdue';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a pending commitment past its deadline.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'meetingmind-overdue-reminder',
    renotify: true,
    data: payload.data || { url: '/my-tasks' },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/my-tasks';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
