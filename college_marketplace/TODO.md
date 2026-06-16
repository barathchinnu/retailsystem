# TODO — Reduce chat delay (Socket.IO responsiveness)

- [ ] Update `frontend/script.js` chat send flow to stop calling `loadChatMessages()` after every message send.
- [ ] Use Socket.IO (`window.__csSocketChat`) to send messages instead of HTTP POST (text + image).
- [ ] Ensure pending messages are replaced/confirmed when `newMessage` arrives.
- [ ] Keep existing phone reveal / report / rating flows unchanged.
- [ ] Validate no duplicate message rendering and no console errors.

