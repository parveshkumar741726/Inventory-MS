# Vercel Deployment Guide

## समस्या का समाधान (Problem Fixed)

Vercel पर deploy करने के बाद login नहीं हो रहा था क्योंकि:
1. **Cookie Settings** - Production में `SameSite` और `Secure` attributes missing थे
2. **CORS Configuration** - Backend में proper CORS setup नहीं था
3. **Hardcoded URLs** - next.config.js में localhost hardcoded था

## अब क्या करें (What to Do Now)

### 1. Backend Deploy करें (Deploy Backend First)

आपको अपना backend किसी service पर deploy करना होगा जैसे:
- **Railway.app** (Recommended - Free tier available)
- **Render.com** (Free tier available)
- **Heroku**
- **DigitalOcean**

#### Railway.app पर Backend Deploy करने के लिए:

1. [Railway.app](https://railway.app) पर account बनाएं
2. "New Project" → "Deploy from GitHub repo" चुनें
3. अपना repository select करें
4. Root directory में `/backend` folder select करें
5. Environment Variables add करें:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
JWT_EXPIRE=1d
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=https://your-vercel-app.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

6. Deploy होने के बाद आपको backend URL मिलेगा (जैसे: `https://your-app.railway.app`)

### 2. MongoDB Atlas Setup करें

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) पर free account बनाएं
2. Free cluster create करें
3. Database user बनाएं
4. Network Access में `0.0.0.0/0` add करें (allow from anywhere)
5. Connection string copy करें और `MONGODB_URI` में use करें

### 3. Vercel पर Frontend Deploy करें

1. [Vercel](https://vercel.com) पर login करें
2. "New Project" → अपना repository select करें
3. **Environment Variables** add करें (Settings → Environment Variables):
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://your-backend-url.railway.app` (अपना actual backend URL डालें)
   - **Environment**: Production, Preview, Development (सभी select करें)

4. Deploy करें

**Important**: Environment variables को Vercel dashboard में manually add करना होगा। `vercel.json` में environment variables define नहीं करें।

### 4. Backend में FRONTEND_URL Update करें

Railway dashboard में जाकर `FRONTEND_URL` environment variable को अपने Vercel URL से update करें:

```env
FRONTEND_URL=https://your-app.vercel.app
```

## Important Notes

### ✅ जो Changes किए गए हैं:

1. **`lib/auth.ts`** - Cookie settings में production के लिए `Secure` और `SameSite=None` attributes add किए
2. **`backend/server.js`** - CORS configuration को properly configure किया
3. **`next.config.js`** - Hardcoded localhost rewrites को remove किया
4. **`.env.example`** - `FRONTEND_URL` variable add किया

### 🔒 Security Best Practices:

- Production में हमेशा strong `JWT_SECRET` और `JWT_REFRESH_SECRET` use करें
- MongoDB Atlas में proper network access rules set करें
- Environment variables को कभी भी code में hardcode न करें

### 🧪 Testing:

Deploy करने के बाद:
1. Browser console खोलें (F12)
2. Login करने की कोशिश करें
3. Network tab में API calls check करें
4. Application tab में Cookies check करें

### ❗ Common Issues:

**Issue**: "CORS error" दिख रहा है
**Solution**: Backend में `FRONTEND_URL` environment variable सही से set है check करें

**Issue**: Cookies set नहीं हो रहे
**Solution**: Backend और Frontend दोनों HTTPS पर होने चाहिए

**Issue**: 401 Unauthorized error
**Solution**: MongoDB connection string और JWT secrets सही से set हैं check करें

## Demo Credentials

```
Email: admin@example.com
Password: password123
```

**Note**: Production में जाने से पहले default credentials को change करना न भूलें!

## Support

अगर कोई problem आए तो:
1. Browser console में errors check करें
2. Backend logs check करें (Railway/Render dashboard में)
3. Network tab में API responses देखें
