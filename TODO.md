# TODO

- [x] Implement Deal Completed Button / Deal Completion state

  - [x] (Plan approved) Determine current code paths for sold status and ratings
- [x] Backend: allow updating Item.isSold in PATCH /api/items/:id

- [x] Backend: block POST /api/ratings until related Item.isSold === true


  - [x] Frontend: ensure seller toggle button reflects requested labeling (Mark as Sold / Status: SOLD)

- [x] Frontend: gate “Rate this deal” UI to only allow after completion (hide/disable based on API result)

- [ ] Frontend/backend integration test


