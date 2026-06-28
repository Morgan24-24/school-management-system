# School Management System — Deployment Guide

## Prerequisites

- Node.js v18+
- MySQL 8.0+
- npm or yarn

---

## 1. Database Setup

```bash
# Log into MySQL
mysql -u root -p

# Run the schema
mysql -u root -p < database/schema.sql
```

The default admin password is `Admin@123`. **Change it immediately after first login.**

---

## 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env
# Edit .env with your MySQL credentials and other settings

# Start development server
npm run dev

# Start production server
npm start
```

### Environment Variables (`.env`)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | MySQL host (default: localhost) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (school_management) |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `SMTP_HOST` | Email SMTP server |
| `SMTP_USER` | Email username |
| `SMTP_PASSWORD` | Email password/app password |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (for SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (proxies /api to backend)
npm run dev

# Build for production
npm run build
```

---

## 4. Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Gmail
2. Go to Google Account → Security → App Passwords
3. Generate an App Password for "Mail"
4. Use that 16-character password as `SMTP_PASSWORD`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourschool@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## 5. Twilio SMS Setup

1. Create account at twilio.com
2. Get a phone number
3. Copy Account SID and Auth Token from dashboard

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 6. Production Deployment (Ubuntu/Debian)

### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PM2
```bash
npm install -g pm2
```

### Start Backend with PM2
```bash
cd /path/to/school-management-system/backend
pm2 start src/app.js --name "school-api"
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (built React app)
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000/uploads;
    }
}
```

### Install SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 7. Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | Admin@123 |
| Headmaster | headmaster | Admin@123 |
| Accountant | accountant1 | Admin@123 |

> **IMPORTANT:** Change all passwords immediately after deployment!

---

## 8. First Steps After Deployment

1. Login as Admin
2. Go to **Settings** → Update school name, logo, motto
3. Go to **Academic Years** → Verify current year and term
4. Go to **Classes** → Review and add your school's classes
5. Go to **Subjects** → Add/update subjects
6. Add **Teachers** → They get login credentials automatically
7. Add **Parents** → Link them to students
8. Add **Students** → Assign to classes
9. Set up **Fee Structure** per class/term
10. Configure **Email SMTP** for notifications
11. Configure **Twilio SMS** for SMS alerts (optional)

---

## 9. Security Checklist

- [ ] Change all default passwords
- [ ] Use HTTPS in production
- [ ] Set strong `JWT_SECRET` (32+ random chars)
- [ ] Configure firewall to restrict database port
- [ ] Enable automatic MySQL backups
- [ ] Set `NODE_ENV=production`
- [ ] Review and set correct CORS origin

---

## 10. Backup

```bash
# Database backup
mysqldump -u root -p school_management > backup_$(date +%Y%m%d).sql

# Uploads backup
tar -czf uploads_$(date +%Y%m%d).tar.gz /path/to/backend/uploads/
```

Add to crontab for automated daily backups:
```bash
0 2 * * * mysqldump -u root -p'password' school_management > /backups/db_$(date +\%Y\%m\%d).sql
```
