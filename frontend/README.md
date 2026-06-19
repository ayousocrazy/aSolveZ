# WardConnect Frontend

React frontend for the WardConnect citizen complaint & ward management platform.

## Setup

### 1. Prerequisites
- Node.js 16+ installed
- Django backend running on `http://localhost:8000`

### 2. Install and run

```bash
cd frontend
npm install
npm start
```

The app runs on `http://localhost:3000`. API calls proxy to `localhost:8000` via the `"proxy"` field in `package.json`.

---

## File structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   └── index.js          # All API calls (fetch wrappers)
│   ├── context/
│   │   └── AuthContext.js    # Global auth state (user, login, logout)
│   ├── components/
│   │   └── Common.js         # Navbar, ErrorBox, Spinner, GeoSelects
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── Profile.js
│   │   ├── IssueList.js       # Citizen: browse issues
│   │   ├── IssueDetail.js     # Issue detail + comments + voting + reporting
│   │   ├── CreateIssue.js     # Citizen: submit new issue
│   │   ├── WardPosts.js       # Citizen: ward announcements feed
│   │   ├── Ranking.js         # Citizen: ward performance rankings
│   │   ├── WardIssues.js      # Ward: dashboard — all ward issues
│   │   ├── WardIssueManage.js # Ward: update issue status + resolution
│   │   ├── WardPostManage.js  # Ward: create/delete announcements
│   │   └── WardAnalytics.js   # Ward: performance metrics
│   ├── App.js                 # Routes + auth guards
│   └── index.js
└── package.json
```

---

## How it works

### Auth flow
- Login calls `POST /api/auth/login/` → receives JWT tokens
- Tokens stored in `localStorage` (`access`, `refresh`)
- `getMe()` fetches the logged-in user on app load
- JWT payload `is_ward_account` splits citizen vs ward UI

### Citizens can:
- Register with name, phone, password, location (province → ward)
- Browse and filter issues in their ward
- Submit issues with category, description, image/video
- Upvote/downvote issues
- Comment on issues
- Report issues (including false-resolution re-flagging)
- View ward announcements
- See ward performance rankings

### Ward accounts can:
- View all issues in their ward (filterable)
- Update issue status: `pending → acknowledged → completed`
- Add resolution note + image/video when marking completed
- Create/delete announcements and development posts
- View analytics (totals, completion rate, false-resolution reports)

### Route guards
- `/issues/new` and `/profile` — require login
- `/ward/*` — require ward account (`is_ward_account: true`)
- Citizens logged in as ward are redirected to ward dashboard

---

## Backend notes

Make sure your Django `settings.py` has CORS enabled for `localhost:3000`:

```python
# pip install django-cors-headers
INSTALLED_APPS += ['corsheaders']
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware', ...rest]
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
```
