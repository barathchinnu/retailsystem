- [x] Update backend `/api/auth/login` to return `profileImage` in `user` payload.
- [x] Update frontend login success flow to refetch `/api/users/me` and merge into `localStorage.user` (to ensure profileImage persists after refresh/login).
- [x] Fix top whitespace (likely navbar/padding mismatch) in `frontend/style.css` by tuning `#main-wrapper` padding-top.

- [ ] Run frontend checks (refresh after setting profile image; verify DP shows after logout/login).
- [ ] (Optional) adjust any click binding for nav profile image if needed.


