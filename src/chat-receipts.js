import {escapeHtml, rpc} from './workspace-core.js';

export function messageAttributes(message, userId) {
 return 'data-chat-message="' + escapeHtml(message.id) + '"' +
  (message.sender_user_id === userId ? '' : ' data-chat-incoming');
}

export const sentReceipt = '<span class="bp-chat-receipt" title="Sent" aria-label="Sent" role="img">✓</span>';

export function watchChatReceipts(db, kind, feed) {
 const bubbles = [...feed.querySelectorAll('[data-chat-message]')];
 if (!bubbles.length) return () => {};

 const ids = bubbles.map(bubble => bubble.dataset.chatMessage);
 const receipts = new Map(bubbles.filter(bubble => !bubble.hasAttribute('data-chat-incoming'))
  .map(bubble => [bubble.dataset.chatMessage, bubble.querySelector('.bp-chat-receipt')]));
 const visible = new Set();
 const pending = new Set();
 const recorded = new Set();
 let timer;
 let closed = false;
 let syncing = false;

 const queue = delay => {
  clearTimeout(timer);
  if (!closed && !syncing) timer = setTimeout(sync, delay);
 };

 async function sync() {
  if (!feed.isConnected) { stop(); return; }
  if (document.visibilityState !== 'visible') { queue(12000); return; }
  for (const id of visible) {
   if (!recorded.has(id)) pending.add(id);
  }
  const readIds = [...pending];
  syncing = true;
  try {
   const rows = await rpc(db, 'bp_chat_receipts', {p_kind:kind, p_ids:ids, p_read_ids:readIds});
   for (const id of readIds) {
    pending.delete(id);
    recorded.add(id);
   }
   if (closed) return;
   for (const row of rows) {
    const tick = receipts.get(row.message_id);
    if (!tick) continue;
    const label = row.read_at ? 'Read by a recipient' : 'Delivered to a recipient';
    tick.textContent = '✓✓';
    tick.classList.toggle('is-read', Boolean(row.read_at));
    tick.title = label;
    tick.setAttribute('aria-label', label);
   }
  } catch {
   // Chat remains available when a receipt cannot be synced.
  } finally {
   syncing = false;
   queue(12000);
  }
 }

 const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
   const id = entry.target.dataset.chatMessage;
   if (entry.isIntersecting && entry.intersectionRatio >= .2) visible.add(id);
   else visible.delete(id);
  }
  if ([...visible].some(id => !recorded.has(id))) queue(200);
 }, {threshold:.2});
 for (const bubble of bubbles) {
  if (bubble.hasAttribute('data-chat-incoming')) observer.observe(bubble);
 }
 const resume = () => queue(100);
 document.addEventListener('visibilitychange', resume);

 function stop() {
  closed = true;
  clearTimeout(timer);
  observer.disconnect();
  document.removeEventListener('visibilitychange', resume);
 }

 queue(200);
 return stop;
}
