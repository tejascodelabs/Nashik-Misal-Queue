For **Drizzle ORM + PostgreSQL**, the usual sequence is:

### 1. Create/update your schema

Edit your `schema/*.js` or `schema/*.ts` files.

### 2. Generate migration

```bash
npm run db:generate
```

This creates migration files based on your schema changes.

### 3. Apply migration

```bash
npm run db:migrate
```

This applies the generated migrations to PostgreSQL.

### 4. Check database visually

```bash
npm run db:studio
```

---
### For quick development

If you don't care about migration files and just want the database schema updated:

```bash
npm run db:push
```

# API endpoint structure
## 1. Auth API endpoint
## 4. Shop API endpoint
## 4. Menus API endpoint
## 4. Staff API endpoint
## 4. Advertisement API endpoint

| Method   | Endpoint                             | Purpose                |
| -------- | ------------------------------------ | ---------------------- |
| `POST`   | `/api/advertisements`                | Create advertisement   |
| `GET`    | `/api/advertisements`                | List advertisements    |
| `GET`    | `/api/advertisements/:id`            | Get advertisement      |
| `PUT`    | `/api/advertisements/:id`            | Update advertisement   |
| `PATCH`  | `/api/advertisements/:id/status`     | Enable/disable         |
| `DELETE` | `/api/advertisements/:id`            | Delete                 |
| `GET`    | `/api/advertisements/statistics`     | Dashboard statistics   |
| `GET`    | `/api/advertisements/public/live`    | Get currently live ads |
| `POST`   | `/api/advertisements/:id/impression` | Increment impression   |
| `POST`   | `/api/advertisements/:id/click`      | Increment click        |
